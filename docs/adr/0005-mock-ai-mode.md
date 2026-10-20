# Make mock AI a first-class runtime mode

- Status: Accepted
- Date: 2026-10-20

## Context

The app must run in CI and on a new machine without an API key. Chat is the central screen, so a
placeholder page would hide layout, streaming, persistence, and error states until a provider is
configured.

## Decision

Read `AI_MODE` in `src/lib/env.ts`. When it is not `live`, `isMockAi()` returns true. In that mode
the chat route streams a deterministic canned reply from `src/lib/mock-chat.ts`, and `embedText`,
`extractMemories`, and `generateTitle` return local values without a provider call. The chat panel
shows a visible demo banner.

Mock mode is the default in `.env.example` and in CI. Live mode requires `AI_API_KEY`.

## Consequences

A fresh clone can sign up, chat, reload, and keep history with no external service. The browser test
and CI exercise the real route, the real database writes, and the real stream protocol. The demo
banner tells the user why the replies are generic.

Mock mode skips embeddings. Memory retrieval returns an empty list, extraction writes nothing, and
the memory count stays at zero. The vector path is therefore untested without a live provider. Any
change to the embedding model or the retrieval query needs a manual check against a real key.

## Considered options

A static fixture page would be simpler but would not prove streaming or persistence. Recording
provider responses would exercise the live code path but adds fixtures that drift from the provider
contract. A local model server would make every run slow and still needs a download. A deterministic
mock keeps the loop fast and offline, at the cost of covering only the non-embedding path.
