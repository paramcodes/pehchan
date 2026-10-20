import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getChatsPageData } from "@/app/actions/chat";

export const metadata = { title: "Chats" };

export default async function ChatsPage() {
  const data = await getChatsPageData();
  if (!data) redirect("/sign-in");

  const { conversations } = data;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="display mt-3 text-5xl">Everything you left open.</h1>
        </div>
        <Link
          href="/explore"
          className="rounded-full border border-line-strong px-4 py-2.5 text-sm transition-colors hover:border-ink"
        >
          Start another
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="paper-card mt-8 rounded-[1.25rem] px-6 py-16 text-center">
          <p className="display text-3xl">Nothing here yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
            Pick a companion from the catalogue. The conversation and the details worth keeping will
            show up here.
          </p>
          <Link
            href="/explore"
            className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm text-white hover:bg-accent-strong"
          >
            Browse companions
          </Link>
        </div>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              className="group flex items-center gap-4 py-4 transition-colors hover:bg-paper/60"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line">
                <Image
                  src={conversation.companionImageUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">{conversation.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {conversation.companionName} ·{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(conversation.lastMessageAt)}
                </p>
              </div>
              <span className="font-mono text-lg text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
