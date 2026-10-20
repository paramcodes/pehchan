# Store data and embeddings in Postgres with Drizzle

- Status: Accepted
- Date: 2026-10-20

## Context

The product stores relational data (users, companions, conversations, messages) and vector data
(memory embeddings). The memory query runs on every chat turn and must be close to the conversation
query. A separate vector database would add a second store, a second backup, and a consistency
problem between the two.

## Decision

Use Postgres 18 with the `vector` extension from the `pgvector/pgvector:pg18` image. Access it
through Drizzle ORM with a typed schema in `src/db/schema.ts`. Keep embeddings in the `memories`
table at 1536 dimensions. Add an HNSW index with `vector_cosine_ops` for similarity search and a
GIN index on the companion `tsvector` for catalogue search. Run Postgres locally through
`docker-compose.yml`.

## Consequences

One database holds relational rows and embeddings, so memory rows and conversation rows share a
backup and a connection. The catalogue search and the memory search use indexes in the same engine.
Drizzle keeps the schema and query results typed without a code generation step.

The first migration is edited by hand to add the extensions and the HNSW and GIN indexes. The Drizzle
snapshot does not describe those indexes, so a future `pnpm db:generate` will not reproduce them.
Keep that step in mind when the schema changes. The embedding dimension is fixed at 1536 by the
column, so a provider that returns another size cannot be used without a migration.

## Considered options

A dedicated vector store such as Pinecone or Qdrant would scale similarity search independently. It
also adds a vendor, a second set of credentials, and a delete path that must stay in sync with
Postgres. Prisma would work with pgvector through raw SQL, but the typed query builder and the
migration workflow were a better fit for this schema. Raw `pg` would remove the ORM layer at the cost
of hand-written row types across every query.
