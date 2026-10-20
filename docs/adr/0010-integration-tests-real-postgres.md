# Run integration tests against real Postgres

- Status: Accepted
- Date: 2026-10-20

## Context

The risky queries use Postgres-specific behavior. Companion visibility combines `or` with an owner
check. Search mixes `ilike` with `to_tsquery` and a GIN index. Memory retrieval uses the `<=>` cosine
operator from pgvector. A mocked query builder would assert the shape of the call, not the result.

## Decision

Keep pure domain tests in `src/**/*.test.ts` under Vitest. Keep database tests in
`src/**/*.integration.test.ts` and run them against a migrated Postgres 18 instance with pgvector.
Each test run creates a disposable category and two users, exercises the query module, and deletes
the rows in `afterAll`. Run the file serially with `fileParallelism: false`.

CI starts `pgvector/pgvector:pg18` as a service container, applies migrations, seeds the catalogue,
then runs `pnpm verify` and `pnpm test:integration`.

## Consequences

The tests catch SQL errors, enum behavior, foreign-key cascades, and visibility mistakes that a
mock would miss. The suite uses the same engine as production.

The suite needs a running database and a migrated schema. It cannot run on a machine without Docker
or a reachable Postgres, so `pnpm verify` stays database-free and `pnpm verify:full` adds the
integration run. The tests share a database, so they serialize and clean up after themselves.
Vector retrieval is still untested because mock mode returns no embeddings.

## Considered options

Mocking Drizzle would make the tests fast and dependency-free, but it would test the mock. Running
Testcontainers from Vitest would make the suite self-contained, at the cost of pulling an image on
every new machine and a slower start. A hosted test database would add credentials and network
flakiness. A service container in CI plus a local compose file is the smallest setup that runs the
real SQL.
