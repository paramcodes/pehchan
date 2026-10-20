"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@heroui/react";

type ChatPanelProps = {
  conversationId: string;
  companion: {
    name: string;
    tagline: string;
    imageUrl: string;
    greeting: string;
    slug: string;
  };
  initialMessages: UIMessage[];
  memoryCount: number;
  mockMode: boolean;
};

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatPanel({
  conversationId,
  companion,
  initialMessages,
  memoryCount,
  mockMode,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error, clearError, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  function submit() {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    void sendMessage({ text });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-line bg-paper/60">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 py-4">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line">
            <Image src={companion.imageUrl} alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/c/${companion.slug}`}
                className="truncate font-display text-2xl hover:text-accent"
              >
                {companion.name}
              </Link>
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-muted uppercase">
                {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
              </span>
            </div>
            <p className="truncate text-xs text-muted">{companion.tagline}</p>
          </div>
          <Link href="/chats" className="text-xs text-muted hover:text-ink sm:hidden">
            Chats
          </Link>
        </div>
        {mockMode ? (
          <div className="border-t border-line bg-accent-soft/60 px-5 py-2 text-center text-[11px] text-accent-strong">
            Demo mode. Replies are canned until `AI_MODE=live` and a provider key are set.
          </div>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-5 py-8">
          <div className="mb-8 rounded-[1.25rem] border border-line bg-paper px-5 py-4">
            <p className="eyebrow">Opening line</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{companion.greeting}</p>
          </div>

          <div className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const text = messageText(message);
                const isUser = message.role === "user";
                if (!text) return null;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap ${
                        isUser
                          ? "rounded-br-md bg-ink text-canvas"
                          : "rounded-bl-md border border-line bg-paper text-ink-soft"
                      }`}
                    >
                      {text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {status === "submitted" ? (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-4">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-muted"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              <span>Reply failed. Try again.</span>
              <button type="button" onClick={clearError} className="underline underline-offset-4">
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-canvas/95 backdrop-blur">
        <form
          className="mx-auto flex w-full max-w-4xl items-end gap-3 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message {companion.name}
          </label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={`Say something to ${companion.name}…`}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-6 outline-none placeholder:text-muted/70 focus:border-line-strong"
          />
          {isBusy ? (
            <Button type="button" variant="secondary" onPress={stop} className="h-11 rounded-2xl">
              Stop
            </Button>
          ) : (
            <Button type="submit" isDisabled={!input.trim()} className="h-11 rounded-2xl px-5">
              Send
            </Button>
          )}
        </form>
        <p className="pb-3 text-center font-mono text-[10px] tracking-[0.08em] text-muted/70">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
