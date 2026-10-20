# Call an OpenAI-compatible provider through AI SDK 7

- Status: Accepted
- Date: 2026-10-20

## Context

The app needs chat completions, structured memory extraction, titles, and embeddings. The operator
may run OpenAI, a hosted compatible service, or a local server. Hard-coding one vendor would make
the deployment choice part of the code.

## Decision

Use AI SDK 7 with `@ai-sdk/openai` pointed at `AI_BASE_URL`. Read the chat model and embedding model
from `AI_CHAT_MODEL` and `AI_EMBEDDING_MODEL`. Keep every provider call behind `src/lib/ai.ts` so
routes and database modules never import a provider SDK. Request 1536 dimensions for embeddings to
match the `memories.embedding` column.

Use `streamText` with `toUIMessageStream` for chat and `generateObject` with a Zod schema for memory
extraction. Return `null` from `embedText` when the provider fails, so a memory failure does not take
down the reply.

## Consequences

Any OpenAI-compatible endpoint can serve the app by changing environment variables. The AI SDK gives
one stream format to the client and one message model on the server. Provider-specific features are
out of reach unless the compatible API exposes them.

The embedding dimension is a schema constraint. A provider that returns a different size will fail
the insert, and changing it requires a new column, a re-embed, and a migration. The fallback to
`null` embeddings means a provider outage degrades memory silently rather than failing the chat.

## Considered options

Calling the provider HTTP API directly would remove a dependency but require a custom stream parser
and a custom UI message protocol. LangChain would add a larger abstraction for four calls. One
vendor SDK would simplify setup but make the provider a code change instead of a configuration
change.
