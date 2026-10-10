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

import { svgToWebp } from '../app/lib/svg-image';

dotenv.config({ quiet: true });

const CALL_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 3;
const CLASSIFY_MODEL = 'haiku';
const CLASSIFY_EFFORT = 'low';

type Kind = 'concrete' | 'abstract';

// Each recipe names the technique, because bare labels collapse into one flat look.
const STYLES: Record<Kind, string[]> = {
  concrete: [
    'cartoon scene: bold dark outlines, cel shading with 2-3 tones per color, expressive and slightly exaggerated, the subject in a small telling context',
    'line art: uniform stroke width, no fills, a single dark ink color on a light background, hatching for shadow, clean contours',
    'realistic render: realistic proportions and materials, linear/radial gradients for volume, soft drop shadows, a light source with highlights, depth via overlapping layers and subtle blur (SVG filters like feGaussianBlur, feSpecularLighting, feTurbulence are allowed), looks like a painted or 3D-rendered image',
    'photo-like: one dominant subject filmed from a natural camera angle, shallow depth of field (sharp subject, blurred background via feGaussianBlur), natural color grading, directional light, fine grain via feTurbulence, no outlines',
  ],
  abstract: [
    'symbolic metaphor: a single object or scene that stands for the meaning, realistic render with gradients and soft lighting',
    'people situation: one or two simple characters whose posture, gesture and facial expression convey the meaning, cartoon with bold outlines',
    'cause and effect: ONE frame showing the decisive moment that makes the meaning obvious (what leads to it or follows from it), line art with a single accent color',
    'visual analogy: familiar everyday objects arranged to mirror the concept (balance, tension, growth, distance...), flat shapes with strong contrast and a limited palette',
  ],
};

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

type Pending = {
  wordId: string;
  word: string;
  definition: string;
  courseId: string;
  learningLang: string;
  knownLang: string;
  kind: Kind;
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

function buildPrompt(batch: Pending[], count: number): string {
  const { learningLang, knownLang, kind } = batch[0];
  const styles = STYLES[kind]
    .slice(0, count)
    .map((s, i) => `  ${i + 1}. ${s}`)
    .join('\n');
  const words = batch
    .map(
      (w) =>
        `- id=${w.wordId}: ${learningLang} '${w.word}' = ${knownLang} '${w.definition}'`,
    )
    .join('\n');
  return [
    `Create mnemonic pictures for vocabulary words (${learningLang} -> ${knownLang}).`,
    kind === 'abstract'
      ? `These words are abstract: do not draw the word literally, convey the meaning through the scene.`
      : `These words are concrete: show the thing or action itself.`,
    `For EACH word return ${count} images, one per style, in this order:`,
    styles,
    `Words in this batch:`,
    words,
    ``,
    `Rules:`,
    `- Each image shows the word's meaning directly, as ONE coherent scene: no collage, no grid, no panels, no repeated subject.`,
    `- The ${count} images of a word differ in subject, composition AND rendering technique: follow each style's technique literally, do not drift to a flat icon look.`,
    `- A student must not confuse the picture with the other words in this batch or with near-synonyms: include the details that distinguish the meaning (e.g. direction of an action, who does what).`,
    `- No text, letters or numbers inside the image.`,
    `- First write a one-line "concept" for each image, then the SVG.`,
    `- SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">, no <image>, <script>, <style>, <foreignObject> or external references. Filters and gradients are allowed inside <defs>. Keep each SVG under 12 KB; the picture is shown at about 256 px, so skip details that vanish at that size.`,
  ].join('\n');
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
    const prompt = [
      `Classify vocabulary words (${pair}) for picture mnemonics.`,
      `"concrete": a thing, creature, place or physical action/state that can be shown directly.`,
      `"abstract": a concept, emotion, relation, quality or process that has no direct visual form.`,
      ...words.map((w) => `- id=${w.wordId}: '${w.word}' = '${w.definition}'`),
    ].join('\n');
    try {
      const reply = await callClaude<ClassifyReply>(
        prompt,
        CLASSIFY_SCHEMA,
        CLASSIFY_MODEL,
        CLASSIFY_EFFORT,
        usage,
      );
      const byId = new Map(words.map((w) => [w.wordId, w]));
      for (const item of reply.items ?? []) {
        if (item && item.kind === 'abstract') {
          const w = byId.get(item.id);
          if (w) w.kind = 'abstract';
        }
      }
    } catch (e) {
      if (e instanceof FatalError) throw e;
      console.error(`classification failed (${pair}): ${(e as Error).message}`);
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

  // Claude decides per word whether it is concrete or abstract (one cheap call per
  // language pair); that picks the style set and the model/effort for its batch.
  if (!opts.dryRun) await classify(pending, usage);

  const groups = new Map<string, Pending[]>();
  for (const p of pending) {
    const key = `${p.learningLang}->${p.knownLang}|${p.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const batches: Pending[][] = [];
  for (const g of groups.values()) {
    for (let i = 0; i < g.length; i += opts.batchSize) {
      batches.push(g.slice(i, i + opts.batchSize));
    }
  }

  console.info(
    `${pending.length} pending request(s) in ${batches.length} batch(es); ` +
      `${skipped.rows[0].n} skipped as in progress.`,
  );
  if (opts.dryRun) {
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

  try {
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
        if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            `Stopping after ${consecutiveFailures} consecutive failed batches.`,
          );
          break;
        }
        continue;
      }
      consecutiveFailures = 0;

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
