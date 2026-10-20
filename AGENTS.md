<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pehchan

AI companion app. Browse a catalogue, chat with a character, and write your own companions. The
product is a vertical slice, not a demo shell. Every screen reads and writes real rows.

## Commands

Run these from the repository root. pnpm is the only package manager. The lockfile is
`pnpm-lock.yaml`.

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm dev`              | Next.js dev server on port 3000                                   |
| `pnpm verify`           | `format:check`, `lint`, `typecheck`, unit tests, production build |
| `pnpm verify:full`      | `verify` plus integration tests. Needs Postgres                   |
| `pnpm test`             | Unit tests in `src/**/*.test.ts`                                  |
| `pnpm test:integration` | DB tests in `src/**/*.integration.test.ts`                        |
| `pnpm db:migrate`       | Apply `drizzle/` migrations                                       |
| `pnpm db:seed`          | Upsert categories and the eight seed companions                   |
| `pnpm db:generate`      | Generate a migration after editing `src/db/schema.ts`             |

`docker compose up -d` starts pgvector on port 5432. Copy `.env.example` to `.env.local` first.
`AI_MODE=mock` streams canned replies and skips embeddings, so the app and CI need no provider key.

## Stack

Next.js 16 App Router with React 19 and strict TypeScript. Tailwind 4, HeroUI 3, Motion for UI
transitions, GSAP only for the landing hero entrance. Drizzle ORM over Postgres 18 with pgvector.
Better Auth with email and password. AI SDK 7 against any OpenAI-compatible endpoint.

## Where things live

- `src/app` holds routes, server actions, and the chat route handler.
- `src/components` holds client and server components. UI components use the token names in
  `src/app/globals.css`, not raw hex values.
- `src/db/schema.ts` is the data model. `src/db/companions.ts` owns catalogue and CRUD queries.
  `src/db/chat.ts` owns conversations, messages, and memory retrieval.
- `src/domain` is pure logic. Companion validation, slugging, prompt construction, memory scoring,
  and search normalization live here and are unit tested.
- `src/lib` holds the AI provider, auth setup, env reads, and session helpers.

## Rules that keep this codebase coherent

- Authorize next to the data. Every query that reads or writes a user's rows takes a `userId` or
  `viewerId` and filters on it. Do not rely on middleware alone.
- Validate at the boundary. Server actions parse `FormData` with the Zod schema in
  `src/domain/companion.ts`. Do not trust client-side validation.
- Keep domain logic pure. No database imports in `src/domain`. Add a unit test beside any new pure
  function.
- Visibility is part of every companion read. Public rows are visible to everyone. Private rows are
  visible to the owner only. `getCompanionBySlug(slug, viewerId)` encodes this, so pass the viewer.
- Companion definitions become the system prompt. Changes to `buildCompanionPrompt` affect every
  reply and need a test in `src/domain/prompt.test.ts`.
- Streams persist on end. The chat route appends the user message before streaming and the
  assistant message in `onEnd`. Keep those two writes on the same conversation id.
- Mock mode is a first-class path. `isMockAi()` must short-circuit before any provider call so CI
  and local development stay offline.
- Prefer server components. Add `"use client"` only for state, effects, or browser APIs.
- Use `next/link` for internal navigation and `next/image` for images. Remote images are limited to
  HTTPS plus localhost in `next.config.ts`.

## Quality gates

A change is done when `pnpm verify` passes. A schema or query change also needs
`pnpm test:integration` against a migrated database. Do not weaken lint rules or TypeScript
settings to make a change pass. Do not add a second lockfile or a second package manager.

Prettier ignores generated output, the lockfile, and Drizzle metadata. `todo.md` is a local agent
checklist and stays gitignored.

## Data model

`user`, `session`, `account`, and `verification` belong to Better Auth. `categories` groups the
catalogue. `companions` stores the definition, owner, visibility, and slug. `conversations` and
`messages` store chat history per user. `memories` stores extracted facts with a 1536-dimension
embedding, an importance score, and a last-used timestamp.

Memory flow. After an assistant reply, the route extracts durable facts, embeds them, drops
duplicates by cosine similarity, and stores the rest. Before the next reply, it embeds the user
message, ranks stored memories by similarity, importance, and recency, and injects the top entries
into the system prompt.

## Changing the schema

1. Edit `src/db/schema.ts`.
2. Run `pnpm db:generate` and inspect the SQL. pgvector, `pg_trgm`, HNSW, and GIN indexes were
   added by hand to the first migration. Keep those when regenerating.
3. Run `pnpm db:migrate`.
4. Update the seed and any query module that selects the affected columns.
