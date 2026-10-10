# MemGrow agent guide

Vocabulary testing app. Next.js App Router, React 19, NextAuth v5, Tailwind, Postgres (Neon by default, or `DB_PROVIDER=pg`).

Cursor also loads `.cursor/rules/memgrow-map.mdc` every session. This file is the same map for other agents. Prefer it over a repository-wide search.

## Exploration budget

- Do not list `app/` or read `app/seed/0*.ts` unless the task is seeding or schema.
- Grep the symbol from the task, then read the owning files in the map below, plus one caller.
- Session limits: `app/constants.ts`. Memory-level math: `app/lib/word-transitions.ts`.

## Routes

| Path                                                                              | Role                          |
| --------------------------------------------------------------------------------- | ----------------------------- |
| `/`                                                                               | Public home                   |
| `/login`, `/register`, `/forgot-password`, `/reset-password`                      | Public auth                   |
| `/learn`, `/learn/[courseId]`, `/learn/[courseId]/next`                           | Learn session                 |
| `/test`, `/test/[courseId]`, `/test/[courseId]/next`, `/test/simulate/[courseId]` | Test and progress simulation  |
| `/edit`, `/edit/[courseId]`, `/edit/fastentry/[courseId]`                         | Course and word editing       |
| `/media`                                                                          | Media manager                 |
| `/settings`                                                                       | Password, locale, admin users |
| `app/api/image/...`, `app/api/sound/word/...`                                     | Image and pronunciation bytes |

Auth gate: `proxy.ts` plus `authorized()` in `auth.config.ts`. Public paths are only `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`. Session helpers: `auth.ts`.

## Where code lives

- UI: `app/ui/`. Material Tailwind imports only from `app/lib/material-tailwind-compat.tsx`.
- Mutations (server actions): `app/lib/actions/` — `word`, `course`, `auth`, `password-reset`, `images`, `examples`, `pronunciation`, `locale`. Re-exported from `app/lib/actions/index.ts`.
- Reads: `app/lib/data.ts`. Types: `app/lib/definitions.ts` (`Word`, `Course`, `TeachingForm`).
- DB access: `app/lib/db.ts`. Unset `DB_PROVIDER` uses Neon; `DB_PROVIDER=pg` uses `pg`.
- Schema and first admin: `pnpm db:seed` (`scripts/db.seed.ts`, `app/seed/run.ts`). There is no bootstrap HTTP route. `--with-demo-data` is local only.
- Learn/test queue: `app/lib/iterate-words-logic.ts`. Persist progress with `updateWordProgress` in `app/lib/actions/word.ts`.
- Images: `app/lib/image-provider.ts`. `IMAGE_PROVIDER` is `bedrock` (default), `vertex`, `cloudflare`, or `gemini`.
- Example sentences and translations: `app/lib/actions/examples.ts`.
- UI strings: `app/lib/i18n/` (`getI18n` server, `useTranslation` client). Add keys to the locale modules (e.g. `cs.ts`).
- Shared dictionaries: `canChangeSharedDicts` / `sharedDictChangeDenied` in `app/lib/data.ts`. Admin user management: `app/lib/actions/auth.ts`.

## Domain

Teaching forms, in order: `show`, `choose_4_word`, `choose_4_def`, `write_mid` (test path), `choose_8_def`, `write`, `write_last`. Transitions: `getNextForm` in `app/lib/word-transitions.ts`.

`memLevel` is days until the word is due (`getRepeatAgainDate`). Success grows the level (`increaseMemLevel`, capped by `MAX_MEM_LEVEL`). A hard miss resets toward 1; a soft miss shortens via `REPEAT_SOONER_FACTOR` (`decreaseMemLevel`). Batch sizes and delays are constants in `app/constants.ts`, with separate offline limits.

## Change couplings

- Word progress or teaching form: `word-transitions.ts`, `iterate-words-logic.ts`, `actions/word.ts`, `tests/word-transitions.test.ts`, `tests/iterate-words-logic.test.ts`.
- Auth or public routes: `auth.config.ts`, `proxy.ts`, `auth.ts`.
- Queries: `app/lib/data.ts` and `tests/data.test.ts` or `tests/actions/*.test.ts`.
- User-facing copy: locale files under `app/lib/i18n/`.

## Commands

- Dev: `pnpm dev`. Tests: `pnpm test` (Docker) or `pnpm test:local` (Podman / Testcontainers).
- DB: `pnpm db:seed`. Password reset CLI: `pnpm db:reset-password`. Queued images via local `claude -p`: `pnpm db:generate-images`.
- Check: `pnpm tsc`, `pnpm eslint`, `pnpm prettier`.

## Conventions

TypeScript, Server Components by default, server actions for mutations, Zod-validated inputs, `revalidatePath` / `revalidateTag` after writes. Protected pages rely on the proxy auth gate; still check the session where the action reads or writes user data.
