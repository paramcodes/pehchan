# Stream replies and persist them when the stream ends

- Status: Accepted
- Date: 2026-10-20

## Context

Chat needs token-by-token output, but the database needs complete messages. Writing on every token
would create hundreds of rows. Writing only on the client would lose the reply when the tab closes.
The conversation also needs a title and periodic memory extraction.

## Decision

In `POST /api/chat`, authenticate, validate the body, confirm the conversation belongs to the user,
and append the user message before generation starts. Stream the reply to the client. In the stream
`onEnd` callback, append the assistant message, then update the conversation timestamp. After the
first exchange, generate a title from the first user message. Every second user turn, extract
memories from the recent transcript.

The client owns only display state. It sends the conversation id and the message list. The server
reads the stored history and rebuilds the model context from it.

## Consequences

A complete assistant reply is one row. The conversation timestamp moves once per exchange instead of
once per token. A page reload rebuilds the UI from the database, so the client cannot drift from the
stored history.

If the stream fails after the user message is written, the user turn remains without a reply. The
next request includes that orphaned turn, which is honest but can confuse the model. If the process
dies before `onEnd` runs, the assistant reply is lost. The current code accepts both cases because
retrying the reply is cheap and the user message is the durable artifact.

## Considered options

Persisting on the client after the stream would let the server stay stateless. It also trusts the
client to write the reply and creates a second author of conversation history. Buffering the whole
reply and writing once before responding removes partial failures but loses streaming. A job queue
would make the writes durable across crashes, which is more machinery than the slice needs.
