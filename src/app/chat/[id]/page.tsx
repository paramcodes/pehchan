import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { getChatPageData } from "@/app/actions/chat";
import { ChatPanel } from "@/components/chat/chat-panel";
import { isMockAi } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const data = await getChatPageData(id);
  if (!data) notFound();

  const { conversation, messages, recent, memoryCount } = data;

  const initialMessages: UIMessage[] = messages.map((message) => ({
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: message.content }],
  }));

  return (
    <div className="mx-auto grid w-full max-w-7xl lg:grid-cols-[17rem_1fr]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col p-4">
          <p className="eyebrow px-2">Recent chats</p>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {recent.map((item) => (
              <Link
                key={item.id}
                href={`/chat/${item.id}`}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                  item.id === conversation.id ? "bg-surface" : "hover:bg-surface/60"
                }`}
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line">
                  <Image
                    src={item.companionImageUrl}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.title}</p>
                  <p className="truncate text-[11px] text-muted">{item.companionName}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/explore"
            className="mt-3 rounded-xl border border-line px-3 py-2.5 text-center text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            New conversation
          </Link>
        </div>
      </aside>

      <ChatPanel
        conversationId={conversation.id}
        companion={{
          name: conversation.companionName,
          tagline: conversation.companionTagline,
          imageUrl: conversation.companionImageUrl,
          greeting: conversation.companionGreeting,
          slug: conversation.companionSlug,
        }}
        initialMessages={initialMessages}
        memoryCount={memoryCount}
        mockMode={isMockAi()}
      />
    </div>
  );
}
