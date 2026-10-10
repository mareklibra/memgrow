#!/usr/bin/env -S pnpm tsx
/**
 * Drain the image_requests queue using the local, logged-in `claude` CLI.
 * Claude draws SVGs; sharp rasterizes them to the same small WebP the app
 * already stores in word_images. Uses POSTGRES_URL from .env.
 *
 * Usage:
 *   pnpm db:generate-images -- [--model sonnet] [--effort medium]
 *     [--abstract-model opus] [--abstract-effort high] [--count 4]
 *     [--batch-size 3] [--limit N] [--dry-run]
 */
import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

import {
  applyKinds,
  buildClassifyPrompt,
  buildPrompt,
  chunk,
  groupBatches,
  Kind,
  Pending,
  STYLES,
} from '../app/lib/image-batches';
import { svgToWebp } from '../app/lib/svg-image';

dotenv.config({ quiet: true });

// Opus at high effort drawing 12 SVGs can take several minutes.
const CALL_TIMEOUT_MS = 15 * 60 * 1000;
const CLASSIFY_CHUNK = 30;
const MAX_CONSECUTIVE_FAILURES = 3;
const CLASSIFY_MODEL = 'haiku';
const CLASSIFY_EFFORT = 'low';

type Options = {
  model: string;
  effort: string;
  abstractModel: string;
  abstractEffort: string;
  count: number;
  batchSize: number;
  limit: number;
  dryRun: boolean;
};

type Usage = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
};

type Reply = { items?: { id: string; images?: { concept?: string; svg?: unknown }[] }[] };

function usage(): never {
  console.error(
    'Usage: pnpm db:generate-images -- [--model sonnet] [--effort medium] [--abstract-model opus] [--abstract-effort high] [--count 4] [--batch-size 3] [--limit N] [--dry-run]',
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    model: 'sonnet',
    effort: 'medium',
    abstractModel: 'opus',
    abstractEffort: 'high',
    count: STYLES.concrete.length,
    batchSize: 3,
    limit: Infinity,
    dryRun: false,
  };
  const args = argv.filter((a) => a !== '--');
  const int = (v: string | undefined) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) usage();
    return n;
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--model':
        opts.model = args[++i] ?? usage();
        break;
      case '--effort':
        opts.effort = args[++i] ?? usage();
        break;
      case '--abstract-model':
        opts.abstractModel = args[++i] ?? usage();
        break;
      case '--abstract-effort':
        opts.abstractEffort = args[++i] ?? usage();
        break;
      case '--count':
        opts.count = Math.min(int(args[++i]), STYLES.concrete.length);
        break;
      case '--batch-size':
        opts.batchSize = int(args[++i]);
        break;
      case '--limit':
        opts.limit = int(args[++i]);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      default:
        usage();
    }
  }
  return opts;
}

const REPLY_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: { concept: { type: 'string' }, svg: { type: 'string' } },
              required: ['concept', 'svg'],
            },
          },
        },
        required: ['id', 'images'],
      },
    },
  },
  required: ['items'],
});

const CLASSIFY_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['concrete', 'abstract'] },
        },
        required: ['id', 'kind'],
      },
    },
  },
  required: ['items'],
});

function callClaude<T>(
  prompt: string,
  schema: string,
  model: string,
  effort: string,
  usage: Usage,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--model',
        model,
        '--effort',
        effort,
        '--tools',
        '',
        '--setting-sources',
        '',
        '--no-session-persistence',
        '--output-format',
        'json',
        '--json-schema',
        schema,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, CALL_TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        e.code === 'ENOENT'
          ? new FatalError('`claude` not found on PATH. Install it and log in first.')
          : e,
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`claude timed out after ${CALL_TIMEOUT_MS / 60000} min`));
        return;
      }
      try {
        const env = JSON.parse(out);
        // Count usage before the error check: failed calls still cost tokens.
        const u = env.usage ?? {};
        usage.calls += 1;
        usage.inputTokens += u.input_tokens ?? 0;
        usage.outputTokens += u.output_tokens ?? 0;
        usage.cacheReadTokens += u.cache_read_input_tokens ?? 0;
        usage.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
        usage.costUsd += env.total_cost_usd ?? 0;
        if (env.is_error) {
          const msg = String(env.result ?? 'claude reported an error');
          reject(
            /log ?in|auth|credential/i.test(msg) ? new FatalError(msg) : new Error(msg),
          );
          return;
        }
        if (!env.structured_output) throw new Error('no structured_output in reply');
        resolve(env.structured_output);
      } catch (e) {
        reject(
          new Error(
            `claude exited ${code}: ${(e as Error).message} ${err.slice(0, 300)}`,
          ),
        );
      }
    });
    // Early exit / spawn failure surfaces via 'close' / 'error'; ignore EPIPE here.
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

class FatalError extends Error {}

type ClassifyReply = { items?: { id: string; kind?: Kind }[] };

/** Sets `kind` on each word; on failure the words stay concrete. */
async function classify(pending: Pending[], usage: Usage): Promise<void> {
  const byPair = new Map<string, Pending[]>();
  for (const p of pending) {
    const key = `${p.learningLang}->${p.knownLang}`;
    byPair.set(key, [...(byPair.get(key) ?? []), p]);
  }
  for (const [pair, words] of byPair) {
    for (const part of chunk(words, CLASSIFY_CHUNK)) {
      try {
        const reply = await callClaude<ClassifyReply>(
          buildClassifyPrompt(pair, part),
          CLASSIFY_SCHEMA,
          CLASSIFY_MODEL,
          CLASSIFY_EFFORT,
          usage,
        );
        applyKinds(part, reply.items);
      } catch (e) {
        if (e instanceof FatalError) throw e;
        console.error(`classification failed (${pair}): ${(e as Error).message}`);
      }
    }
  }
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL is not set. Copy .env.example to .env and configure it first.',
    );
  }
  const opts = parseArgs(process.argv.slice(2));
  const { client } = await import('../app/seed/client');

  const skipped = await client.sql`
    SELECT COUNT(*) AS n FROM image_requests WHERE in_progress_since IS NOT NULL
  `;
  const rows = await client.sql`
    SELECT w.id AS word_id, w.word, w.definition, c.id AS course_id,
           c.learning_lang, c.known_lang
    FROM image_requests ir
    JOIN words w ON w.id = ir.word_id
    JOIN courses c ON c.id = w.course_id
    WHERE ir.in_progress_since IS NULL
    ORDER BY c.learning_lang, c.known_lang, ir.created_at
  `;
  const pending: Pending[] = rows.rows
    .slice(0, opts.limit)
    .map((r: Record<string, string>) => ({
      wordId: r.word_id,
      word: r.word,
      definition: r.definition,
      courseId: r.course_id,
      learningLang: r.learning_lang,
      knownLang: r.known_lang,
      kind: 'concrete' as Kind,
    }));

  const usage: Usage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0,
  };

  if (opts.dryRun) {
    const batches = groupBatches(pending, opts.batchSize);
    console.info(
      `${pending.length} pending request(s) in ${batches.length} batch(es); ` +
        `${skipped.rows[0].n} skipped as in progress.`,
    );
    console.info(
      '(dry run: abstract/concrete classification skipped, all treated as concrete)',
    );
    batches.forEach((b) =>
      console.info(
        `batch [${b[0].learningLang}->${b[0].knownLang}, ${new Set(b.map((w) => w.courseId)).size} course(s)]: ${b.map((w) => w.word).join(', ')}`,
      ),
    );
    if (batches.length)
      console.info(`\n--- first prompt ---\n${buildPrompt(batches[0], opts.count)}`);
    return;
  }

  let stored = 0;
  let failedWords = 0;
  const sizes: number[] = [];
  let consecutiveFailures = 0;

  // Counts a batch that stored nothing; true once the run should stop.
  const batchFailed = () => {
    if (++consecutiveFailures < MAX_CONSECUTIVE_FAILURES) return false;
    console.error(`Stopping after ${consecutiveFailures} consecutive failed batches.`);
    return true;
  };

  try {
    // Claude decides per word whether it is concrete or abstract (cheap calls per
    // language pair); that picks the style set and the model/effort for its batch.
    await classify(pending, usage);
    const batches = groupBatches(pending, opts.batchSize);
    console.info(
      `${pending.length} pending request(s) in ${batches.length} batch(es); ` +
        `${skipped.rows[0].n} skipped as in progress.`,
    );

    for (const [n, batch] of batches.entries()) {
      console.info(
        `batch ${n + 1}/${batches.length} [${batch[0].kind}]: ${batch.map((w) => w.word).join(', ')}`,
      );
      let reply: Reply;
      try {
        const abstract = batch[0].kind === 'abstract';
        reply = await callClaude<Reply>(
          buildPrompt(batch, opts.count),
          REPLY_SCHEMA,
          abstract ? opts.abstractModel : opts.model,
          abstract ? opts.abstractEffort : opts.effort,
          usage,
        );
      } catch (e) {
        if (e instanceof FatalError) throw e;
        console.error(`  batch failed: ${(e as Error).message}`);
        failedWords += batch.length;
        if (batchFailed()) break;
        continue;
      }
      const storedBefore = stored;

      const byId = new Map(batch.map((w) => [w.wordId, w]));
      const seen = new Set<string>();
      for (const item of reply.items ?? []) {
        if (!item || !byId.has(item.id) || seen.has(item.id)) continue;
        seen.add(item.id);
        const webps: Buffer[] = [];
        for (const img of (item.images ?? []).slice(0, opts.count)) {
          const webp = await svgToWebp(img?.svg);
          if (webp) webps.push(webp);
        }
        let wordStored = 0;
        if (webps.length > 0) {
          try {
            await client.sql`BEGIN`;
            for (const webp of webps) {
              await client.sql`
              INSERT INTO word_images (word_id, content) VALUES (${item.id}, ${webp})
            `;
            }
            await client.sql`DELETE FROM image_requests WHERE word_id = ${item.id}`;
            await client.sql`COMMIT`;
            wordStored = webps.length;
            stored += wordStored;
            sizes.push(...webps.map((w) => w.length));
          } catch (e) {
            await client.sql`ROLLBACK`.catch(() => {});
            console.error(`  storing images failed: ${(e as Error).message}`);
          }
        }
        if (wordStored === 0) failedWords++;
        console.info(`  ${byId.get(item.id)!.word}: stored ${wordStored} image(s)`);
      }
      failedWords += batch.filter((w) => !seen.has(w.wordId)).length;
      if (stored > storedBefore) consecutiveFailures = 0;
      else if (batchFailed()) break;
    }
  } finally {
    // Also reached on a fatal error, so tokens already spent are reported.
    console.info(
      `Claude usage: ${usage.calls} call(s), ${usage.inputTokens} input + ` +
        `${usage.cacheWriteTokens} cache-write + ${usage.cacheReadTokens} cache-read ` +
        `tokens in, ${usage.outputTokens} out, $${usage.costUsd.toFixed(3)} ` +
        `(concrete: ${opts.model}/${opts.effort}, abstract: ${opts.abstractModel}/${opts.abstractEffort}; timed-out calls not counted).`,
    );
  }

  const kb = sizes.map((s) => Math.round(s / 1024));
  console.info(
    `Done: stored ${stored} image(s); ${failedWords} word(s) left in the queue; ` +
      `sizes KB: ${kb.length ? `${Math.min(...kb)}-${Math.max(...kb)}` : 'n/a'}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      'Image generation failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
