# Pehchan

An AI companion app. Browse a catalogue of characters, start a conversation, and keep the details
that matter across sessions. Write your own companions in the studio and choose whether they join
the public catalogue or stay private.

The app is a working vertical slice. Auth, catalogue search, streaming chat, persisted history,
vector memory, and companion CRUD all hit real rows in Postgres.

## Demo

The recording walks through the catalogue, sign-up, a streamed conversation, and companion
creation. It runs on the production build with `AI_MODE=mock`.

![Pehchan walkthrough](docs/media/pehchan-demo.gif)

[Watch the MP4](docs/media/pehchan-demo.mp4) for a sharper copy.

## Screenshots

![Landing page](docs/screenshots/home.webp)

| Explore                                            | Companion                                         |
| -------------------------------------------------- | ------------------------------------------------- |
| ![Catalogue search](docs/screenshots/explore.webp) | ![Companion detail](docs/screenshots/detail.webp) |

| Chat                                          | Studio editor                                     |
| --------------------------------------------- | ------------------------------------------------- |
| ![Streaming chat](docs/screenshots/chat.webp) | ![Companion editor](docs/screenshots/editor.webp) |

| Studio                                            | Chat history                                 |
| ------------------------------------------------- | -------------------------------------------- |
| ![Companion studio](docs/screenshots/studio.webp) | ![Chat history](docs/screenshots/chats.webp) |

## Regenerate the demo media

The screenshots and recordings are generated, not hand-edited. `scripts/capture-demo.mjs` drives the
production build in Chromium, writes each still, then runs ffmpeg to produce WebP, GIF, and MP4.

Install the browser once.

```bash
pnpm exec playwright install chromium
```

Then run:

```bash
pnpm capture:fresh
```

The script starts `next start` when nothing is listening, creates a disposable account, records the
flow, deletes the account, and removes its work directory. Set `CAPTURE_BASE_URL` to target another
server. The cleanup uses `DATABASE_URL`, so point it at the database that server uses, and make sure
the server's auth URL matches the capture origin. Pass `--keep-user` to keep the account or
`--keep-work` to keep the raw PNG and WebM files.

Requirements: ffmpeg, a migrated database, and `DATABASE_URL` in `.env.local`.

## Stack

| Layer     | Choice                                                   |
| --------- | -------------------------------------------------------- |
| Framework | Next.js 16 App Router, React 19, TypeScript 5.9 (strict) |
| Styling   | Tailwind 4, HeroUI 3, custom Cursor-inspired tokens      |
| Motion    | Motion for UI transitions, GSAP for the landing hero     |
| Data      | Postgres 18 with pgvector, Drizzle ORM                   |
| Auth      | Better Auth, email and password                          |
| AI        | AI SDK 7 against any OpenAI-compatible endpoint          |

## Run it locally

Requirements: Node 24 or newer, pnpm 12.9.1, Docker. CI pins Node 24.

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000. Create an account, then start a conversation from the catalogue.

`AI_MODE=mock` is the default. It streams a canned reply and skips embeddings, so the app runs
without a provider key. Set `AI_MODE=live` and fill `AI_API_KEY`, `AI_BASE_URL`, and the model names
to use a real provider.

## Environment

| Variable              | Purpose                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`        | Postgres connection string. The compose file uses `pehchan:pehchan@localhost:5432/pehchan` |
| `BETTER_AUTH_SECRET`  | Signing secret. Use at least 32 random characters                                          |
| `BETTER_AUTH_URL`     | Public origin for auth callbacks                                                           |
| `NEXT_PUBLIC_APP_URL` | Public origin used in links                                                                |
| `AI_MODE`             | `mock` or `live`                                                                           |
| `AI_API_KEY`          | Provider key. Required when `AI_MODE=live`                                                 |
| `AI_BASE_URL`         | Optional OpenAI-compatible base URL                                                        |
| `AI_CHAT_MODEL`       | Chat model name                                                                            |
| `AI_EMBEDDING_MODEL`  | Embedding model name. Must produce 1536 dimensions                                         |

Generate a secret with `openssl rand -base64 32`.

## Scripts

Development.

| Command       | What it does               |
| ------------- | -------------------------- |
| `pnpm dev`    | Dev server on port 3000    |
| `pnpm build`  | Production build           |
| `pnpm start`  | Serve the production build |
| `pnpm lint`   | ESLint across the repo     |
| `pnpm format` | Prettier across the repo   |

Verification.

| Command                 | What it does                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `pnpm verify`           | Format check, lint, typecheck, unit tests, production build                        |
| `pnpm verify:full`      | Above plus Postgres integration tests                                              |
| `pnpm test`             | Unit tests                                                                         |
| `pnpm test:watch`       | Unit tests in watch mode                                                           |
| `pnpm test:integration` | Postgres integration tests                                                         |
| `pnpm arch`             | Layer boundary check. Pages, components and `src/domain` may not import `src/db`   |
| `pnpm prove`            | Writes violating files and asserts every guardrail catches them                    |
| `pnpm harness`          | Scores ten harness criteria and exits non-zero when one fails                      |
| `pnpm smoke`            | Builds, serves the production app in mock mode on port 3210 and checks five routes |

Database and media.

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `pnpm db:migrate`    | Apply migrations                               |
| `pnpm db:generate`   | Generate a migration from `src/db/schema.ts`   |
| `pnpm db:push`       | Push the schema to the database                |
| `pnpm db:seed`       | Upsert categories and seed companions          |
| `pnpm db:studio`     | Open Drizzle Studio                            |
| `pnpm capture`       | Drive the app and regenerate README media      |
| `pnpm capture:fresh` | Build, then drive the app and regenerate media |

CI applies migrations, seeds the catalogue, runs `pnpm verify:full`, then runs `pnpm smoke` against
a pgvector service container. See `.github/workflows/ci.yml`.

## How it works

Companions are rows with a name, tagline, description, category, portrait URL, greeting, behavioural
instructions, and example dialogue. Public companions appear in `/explore`. Private ones are visible
only to their owner. Every query takes the viewer id and enforces that rule next to the data.

Chat streams through `POST /api/chat`. The route verifies the session, confirms the conversation
belongs to that user, appends the user message, retrieves relevant memories, builds a system prompt,
and streams the reply. When the stream ends, the assistant message is persisted.

Memory uses embeddings. After a reply, an extraction pass pulls durable facts from the recent
transcript, embeds each one, drops near-duplicates by cosine similarity, and stores the rest with an
importance score. On the next message, the user text is embedded and stored memories are ranked by
similarity, importance, and recency. The top entries go into the system prompt.

`AI_MODE=mock` short-circuits extraction and retrieval. Chat and history still work. Memory retrieval
requires a live embedding provider.

## Agent harness

`AGENTS.md` is the operating contract for coding agents, and `CLAUDE.md` points at it. Four checks
keep its rules true.

- `pnpm arch` bans `@/db` imports from pages, components and `src/domain`, so those layers read
  through `src/app/actions`.
- `pnpm prove` writes a file that breaks each guardrail and asserts the owning checker fails. A rule
  without a proof case is a rule nobody has tested.
- `pnpm harness` scores ten criteria against the tree, each with a real check, and exits non-zero
  when one fails.
- `pnpm smoke` builds the app, serves it with `AI_MODE=mock`, and checks five routes for the
  expected text.

A mistake becomes a permanent check through [`docs/ratchet.md`](docs/ratchet.md). Fix at the
strongest layer, add a proof case, then add a row to [`docs/mistake-log.md`](docs/mistake-log.md).
Lefthook runs the branch guard, the Next.js agent block check, format, lint and typecheck on every
commit, and `pnpm install` installs the hook. `scripts/guard-branch.sh` refuses a commit on `main`
or `master`.

## Architecture decisions

The decisions that are expensive to reverse live in [`docs/adr`](docs/adr/README.md). The index
covers the full-stack framework, Postgres with pgvector and Drizzle, Better Auth, the
OpenAI-compatible provider, mock AI mode, authorization next to the data, stream then persist,
embedding memory, server actions for the studio, and integration tests against real Postgres.

## Layout

```
.github          CI workflow
src/app          routes, server actions, chat API
src/components   UI, including chat and studio
src/db           schema, actor-scoped queries, seed
src/domain       pure validation, prompt, memory and search logic
src/lib          auth, AI provider, env, session
src/test         test setup and the AGENTS.md check
docs/adr         architecture decisions and their trade-offs
docs             ratchet procedure and mistake log
drizzle          generated SQL migrations
eslint-rules     local lint rules
scripts          demo capture, smoke test, harness and guardrail checks
```

`src/domain` has no database imports, and every logic module there has a unit test beside it. The
database query modules are covered by the integration tests in `src/db`.

## Notes

- The design language is inspired by Cursor's public aesthetic. It uses its own tokens and open
  fonts, not Cursor brand assets.
- Auth checks live beside the data, not only in middleware.
- Images are URLs. The studio ships four curated presets and accepts any HTTPS URL.
- Nothing is deployed. This repository is the complete local implementation.

Read `AGENTS.md` before changing the schema, the prompt builder, or the visibility rules.
