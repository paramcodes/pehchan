# Architecture decision records

This directory records the decisions that shaped Pehchan. Each record states the context, the
choice, and the consequences that are not obvious from the code.

| ADR                                             | Decision                                             | Status   |
| ----------------------------------------------- | ---------------------------------------------------- | -------- |
| [0001](0001-nextjs-full-stack.md)               | Use Next.js App Router as the full-stack framework   | Accepted |
| [0002](0002-postgres-pgvector-drizzle.md)       | Store data and embeddings in Postgres with Drizzle   | Accepted |
| [0003](0003-better-auth.md)                     | Use Better Auth with email and password              | Accepted |
| [0004](0004-openai-compatible-ai-sdk.md)        | Call an OpenAI-compatible provider through AI SDK 7  | Accepted |
| [0005](0005-mock-ai-mode.md)                    | Make mock AI a first-class runtime mode              | Accepted |
| [0006](0006-authorization-next-to-data.md)      | Enforce companion visibility next to the data        | Accepted |
| [0007](0007-stream-then-persist.md)             | Stream replies and persist them when the stream ends | Accepted |
| [0008](0008-embedding-memory.md)                | Extract and retrieve memories with embeddings        | Accepted |
| [0009](0009-server-actions-for-studio.md)       | Write companions with server actions and Zod         | Accepted |
| [0010](0010-integration-tests-real-postgres.md) | Run integration tests against real Postgres          | Accepted |

## Adding a record

Create the next number with a short slug, for example `0011-add-image-uploads.md`. Keep the record
to the context, the decision, and the consequences. Record only decisions that are hard to reverse,
surprising without context, and the result of a real trade-off.

Mark a replaced decision `Superseded by ADR-NNNN` in its status line. Do not rewrite history in an
accepted record. Add a new record instead.
