# Use Better Auth with email and password

- Status: Accepted
- Date: 2026-10-20

## Context

The app needs accounts, sessions, and a password flow without operating an identity service. The
data model already lives in Postgres, and the first release has no social login requirement.

## Decision

Use Better Auth 1.7 with the Drizzle adapter and the Next.js cookie plugin. Enable email and
password with automatic sign-in. Store the Better Auth tables (`user`, `session`, `account`,
`verification`) in the same schema as the product tables. Set a 30-day session with a daily update.

Keep the auth instance in `src/lib/auth.ts`. Read the session through `getSession` in
`src/lib/session.ts`, and require it in pages and actions with `requireUser` and
`requireUserForAction`.

## Consequences

Accounts, sessions, and password hashes stay in the application database. There is no per-user
vendor bill and no external redirect during sign-in. The auth tables are visible in migrations and
backups, and deleting a user cascades to companions, conversations, and memories.

The project owns password reset, email verification, and rate limiting. Better Auth provides the
primitives, but the product still needs to configure a mail sender before those flows are complete.
Upgrading Better Auth can require a schema migration because the adapter owns the table shape.

## Considered options

Auth.js (NextAuth) has broader provider coverage but a less direct fit for the Drizzle schema and
server actions. Clerk removes the auth code but adds a vendor, a network dependency on every session
read, and a user record outside the database. A hand-written session table would be smaller in
dependencies but would put password hashing, cookie rotation, and timing-safe comparison in this
repository. Better Auth keeps the data local with less custom security code.
