# Use Next.js App Router as the full-stack framework

- Status: Accepted
- Date: 2026-10-20

## Context

Pehchan needs public catalogue pages, authenticated chat screens, streaming responses, and a small
set of write operations. The team is small and the first release is a vertical slice. Splitting a
separate API service from a single-page client would add a second deploy, a second origin, and a
shared type layer before the product has proven anything.

## Decision

Build the product as one Next.js 16 application with the App Router. Use React Server Components for
reads, server actions for form writes, and one route handler for the chat stream. Keep the domain
logic in `src/domain` and the database queries in `src/db` so neither depends on the framework.

## Consequences

One deploy serves the pages, the actions, and the stream. The server can read the session and query
Postgres without a network hop to another service. Route-level code stays small because the domain
modules hold the behavior.

The application takes a dependency on Next.js conventions, including the `"use server"` export
rules, the route handler request shape, and the App Router caching model. A move to another
framework would touch every route and action. Server components also make client state explicit,
which is good for data flow but adds a `"use client"` boundary wherever browser state is needed.

## Considered options

A separate Express or Fastify API with a Vite client would make the client portable. It also adds
CORS, a second deployment, and duplicate validation at the boundary. A Remix application would fit
the form-heavy screens, but the streaming and image pipeline would need equivalent wiring. The
single Next.js application is the smaller system for this scope.
