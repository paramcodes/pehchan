<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pehchan

AI companion app. Browse a catalogue, chat with a character, and write your own companions. Every
screen reads and writes real rows. Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4,
HeroUI 3, Motion, and GSAP for the landing hero only. Drizzle ORM over Postgres 18 with pgvector,
Better Auth, and AI SDK 7.

## Commands

pnpm is the only package manager and `pnpm-lock.yaml` is the only lockfile. Run from the root.

| Command            | What it does                                                                     |
| ------------------ | -------------------------------------------------------------------------------- |
| `pnpm dev`         | Next.js dev server on port 3000                                                  |
| `pnpm arch`        | Layer boundary check. Pages, components and `src/domain` may not import `src/db` |
| `pnpm prove`       | Writes violating files and proves every guardrail catches them                   |
| `pnpm harness`     | Scores the ten harness criteria and exits non-zero if one fails                  |
| `pnpm smoke`       | Builds, serves the production app in mock mode and checks five routes            |
| `pnpm verify`      | `format:check`, `lint`, `typecheck`, unit tests, production build                |
| `pnpm verify:full` | `verify` plus integration tests. Needs Postgres                                  |
| `pnpm db:seed`     | Upsert categories and the eight seed companions                                  |

`docker compose up -d` starts pgvector on port 5432. Copy `.env.example` to `.env.local` first.
`AI_MODE=mock` streams canned replies and skips embeddings, so the app and CI need no provider key.

## Where things live

`src/app` holds routes, server actions and the chat route handler. `src/app/actions` is the only
place a page may reach the database, and every read there takes its actor from the session.
`src/components` never imports `src/db` and uses the token names in `src/app/globals.css`.
`src/db/schema.ts` is the data model, `src/db/companions.ts` owns catalogue and CRUD queries, and
`src/db/chat.ts` owns conversations, messages and memory retrieval. `src/domain` is pure logic and
unit tested, `src/lib` holds the AI provider, auth setup, env reads and session helpers, and
`docs/adr` records why the stack, visibility rule, streaming boundary and memory design are what
they are.

## Rules

- Authorize next to the data. Every query on a user's rows takes an actor id and filters on it.
  Middleware is not authorization. Enforced by: src/db/chat.ts
- Validate at the boundary. Server actions parse `FormData` with the Zod schema in
  `src/domain/companion.ts` and never trust the client. Enforced by: src/domain/companion.ts
- Keep domain logic pure. `src/domain` imports no database module, and every new pure function
  lands beside a unit test. Enforced by: eslint.arch.mjs
- Keep pages and components off the database. They read through a server action. Enforced by: eslint.arch.mjs
- Visibility is part of every companion read. Public rows are visible to everyone, private rows to
  the owner only, and `getCompanionBySlug` takes the viewer. Enforced by: src/db/companions.ts
- Companion definitions become the system prompt, so a change to `buildCompanionPrompt` needs a
  test in `src/domain/prompt.test.ts`. Enforced by: src/domain/prompt.test.ts
- Streams persist on end. The route appends the user message before streaming and the assistant
  message in `onEnd`, on the same conversation id. Enforced by: src/app/api/chat/route.ts
- Mock mode is a first-class path. `isMockAi()` short-circuits before any provider call so CI
  stays offline. Enforced by: src/lib/env.ts
- Prefer server components. `"use client"` belongs to state, effects and browser APIs only. Enforced by: eslint.config.mjs
- Use `next/link` and `next/image`. Remote images are limited to HTTPS plus localhost. Enforced by: next.config.ts
- No escape hatches in `src`. Inline lint config, `@ts-ignore`, `@ts-expect-error` and skipped
  tests are errors. Enforced by: eslint.config.mjs

## Operating policy

- Plan before code, in a file that says what should break if the plan is wrong. A written plan
  turns a wrong assumption into a cheap correction. Enforced by: docs/ratchet.md
- One branch or worktree per task, and never two agents on the same package. Parallel writers on
  one tree lose each other's changes. Enforced by: docs/ratchet.md
- Never commit to or force-push `main` or `master`. The default branch is what every other agent builds on.
  Enforced by: lefthook.yml
- Done means `pnpm verify:full` and `pnpm smoke` pass and a manual check is recorded in the pull
  request. A green gate is evidence, a recorded human check is proof. Enforced by: scripts/harness-score.sh

## Quality gates

`pnpm verify` is the floor. A schema or query change also needs `pnpm test:integration` against a
migrated database. Do not weaken a lint rule, a TypeScript setting or a test to make a change pass,
and do not add a second lockfile or a second package manager. `todo.md` is a local agent checklist
and stays gitignored. `docs/mistake-log.md` records what went wrong here and which guardrail now
catches it, and `docs/ratchet.md` is the procedure that turns a mistake into a permanent check:
fix at the strongest layer, add a proof case, add a log row.

## Data model and schema

`user`, `session`, `account` and `verification` belong to Better Auth. `categories` groups the
catalogue. `companions` stores the definition, owner, visibility and slug. `conversations` and
`messages` store chat history per user. `memories` stores extracted facts with a 1536-dimension
embedding, an importance score and a last-used timestamp. After a reply the route extracts durable
facts, embeds them and drops duplicates by cosine similarity. Before the next reply it ranks stored
memories by similarity, importance and recency and injects the top entries into the system prompt.
To change the schema, edit `src/db/schema.ts`, run `pnpm db:generate` and inspect the SQL. The
pgvector, `pg_trgm`, HNSW and GIN indexes in `drizzle/0000_burly_rhodey.sql` were added by hand, so
keep them when regenerating, then run `pnpm db:migrate` and update the seed and the queries.
