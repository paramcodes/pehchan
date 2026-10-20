# Extract and retrieve memories with embeddings

- Status: Accepted
- Date: 2026-10-20

## Context

A companion should remember durable facts between conversations without replaying the full history.
The chat model has a context limit, and most old messages are not relevant to the current turn. The
product needs a retrieval step that is cheap, explainable, and stored with the user.

## Decision

After a reply, ask the chat model for up to five durable memories with an importance score. Embed
each candidate at 1536 dimensions. Compare it with stored memories for the same user and companion.
Drop an exact normalized duplicate, or a candidate whose cosine similarity is at least 0.92. Store
the rest with the conversation id and an importance score. Run extraction when the user-turn count
in the recent window is odd, which covers the first turn and every second turn after it.

Before the next reply, embed the user message, query the `memories` table by cosine distance, and
keep rows with similarity at least 0.25. Take six candidates and rescore them with similarity at
0.65, importance at 0.2, and recency at 0.15. The current call passes an age of zero, so the recency
term is constant. Pass the six rows to the prompt builder, which sorts by importance and caps the
memory block at eight entries. Update `last_used_at` for the rows that were retrieved.

## Consequences

Memory is per user and per companion, so two users talking to the same companion never share facts.
The extraction prompt excludes small talk, credentials, and medical diagnoses. The retrieval score
favors relevance but still lets an important old fact survive.

The extraction and retrieval each cost an embedding request. In mock mode both are skipped, so the
query path has no test coverage without a live provider. There is no backfill if the embedding model
changes, and no user-facing memory editor. Deleting a companion deletes its memories through the
foreign key.

## Considered options

Sending the full transcript on every turn is simpler and more faithful. It grows without bound and
eventually exceeds the context window. A keyword index would be cheaper but misses paraphrases.
Storing one summary per conversation would compress more aggressively and lose the individual facts
that make a later call feel personal.
