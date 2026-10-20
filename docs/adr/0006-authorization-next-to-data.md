# Enforce companion visibility next to the data

- Status: Accepted
- Date: 2026-10-20

## Context

Companions can be public or private. Seed companions have no owner. A private companion must be
visible to its owner and to nobody else, including through chat creation and direct URL access. The
app also has pages and server actions that read companions, so a single middleware check would not
cover every path.

## Decision

Keep `visibility` and a nullable `owner_id` on `companions`. Pass the viewer id into every read that
can return a companion. `getCompanionBySlug(slug, viewerId)` filters on public rows or rows owned by
the viewer. `listCompanions` returns public rows only. `getOrCreateConversation` repeats the check
before it creates a conversation. `listOwnedCompanions` and `getOwnedCompanion` require the owner id.

Do not rely on middleware as the only authorization layer. Middleware can redirect a page, but it
cannot protect a query that another caller reuses.

## Consequences

The rule lives in one query module and every caller passes the viewer. An owner can preview a private
companion through the same URL as a public one. A missing viewer argument narrows access rather than
widening it, because the default path returns public rows only.

Every new companion read must remember the viewer argument. A future query that forgets it can leak
a private companion, so tests cover the stranger case for both the detail read and the chat
creation. Postgres row-level security is not enabled, which keeps the local setup simple but leaves
the rule in application code.

## Considered options

Postgres row-level security would enforce the rule even for a forgotten filter. It requires a
session-scoped database role and a policy that the Drizzle connection sets on every request, which
is more infrastructure than this slice needs. A separate `companion_access` table would model
sharing, but the product has only owner and public visibility today.
