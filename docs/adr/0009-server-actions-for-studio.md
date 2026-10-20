# Write companions with server actions and Zod

- Status: Accepted
- Date: 2026-10-20

## Context

The studio creates, updates, and deletes companions. Each form needs server-side validation, an
ownership check, a database write, cache invalidation, and a redirect. The client needs field-level
errors without a separate API contract.

## Decision

Use server actions in `src/app/actions/studio.ts` with `useActionState` on the client. Parse
`FormData` with `companionFormSchema` from `src/domain/companion.ts`, collect field errors, and
return a typed action state. Check category validity against the database before writing. Revalidate
the catalogue and detail paths after a successful write, then redirect with a status query
parameter.

Keep `CompanionActionState` and `initialCompanionState` in `src/app/actions/studio-state.ts`, not in
the action file. A `"use server"` module may export only async functions, so an exported object or
constant fails the build.

## Consequences

The form and the action share one TypeScript state type. Validation runs on the server even when the
client is bypassed. The browser gets a redirect and a success notice without a JSON API.

Server actions are a Next.js boundary. Moving to another framework means rewriting the write layer.
The action state module exists only because of the export rule, which is surprising without this
record. Form errors are returned as a flat field map, so a nested field would need a new shape.

## Considered options

Route handlers with a client `fetch` would make the write API portable and easier to call from a
native client. They also add request and response types, error mapping, and a second validation
site. A form library with a schema resolver would improve client feedback but still needs a server
check. Server actions plus Zod keep one boundary and one schema for this scope.
