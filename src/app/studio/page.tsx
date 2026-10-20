import Image from "next/image";
import Link from "next/link";
import { DeleteCompanionButton } from "@/components/studio/delete-companion-button";
import { countConversations, countMemories, listOwnedCompanions } from "@/db/companions";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Studio" };

const notices: Record<string, string> = {
  created: "Companion created. They are live in the catalogue.",
  updated: "Changes saved.",
  deleted: "Companion deleted.",
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; deleted?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  const [companions, conversationCount, memoryCount] = await Promise.all([
    listOwnedCompanions(session.user.id),
    countConversations(session.user.id),
    countMemories(session.user.id),
  ]);

  const notice = params.created
    ? notices.created
    : params.updated
      ? notices.updated
      : params.deleted
        ? notices.deleted
        : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">The ones you made.</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
            Write a voice, give it a face, and keep the companions you want to talk to again.
          </p>
        </div>
        <Link
          href="/studio/new"
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-white transition-colors hover:bg-accent-strong"
        >
          New companion
        </Link>
      </div>

      {notice ? (
        <p className="mt-6 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {notice}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line">
        <div className="py-4 pr-4">
          <dt className="eyebrow">Companions</dt>
          <dd className="display mt-1 text-3xl">{companions.length}</dd>
        </div>
        <div className="px-4 py-4">
          <dt className="eyebrow">Conversations</dt>
          <dd className="display mt-1 text-3xl">{conversationCount}</dd>
        </div>
        <div className="py-4 pl-4">
          <dt className="eyebrow">Memories</dt>
          <dd className="display mt-1 text-3xl">{memoryCount}</dd>
        </div>
      </dl>

      {companions.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {companions.map((companion) => (
            <article
              key={companion.id}
              className="paper-card flex flex-col overflow-hidden rounded-[1.25rem]"
            >
              <Link href={`/c/${companion.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  <Image
                    src={companion.imageUrl}
                    alt={`Portrait of ${companion.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-canvas/85 px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase backdrop-blur">
                    {companion.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <p className="eyebrow">{companion.categoryName}</p>
                <h2 className="display mt-1 text-2xl">{companion.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                  {companion.tagline}
                </p>

                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link
                    href={`/studio/${companion.id}/edit`}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-xs transition-colors hover:border-ink"
                  >
                    Edit
                  </Link>
                  <DeleteCompanionButton id={companion.id} name={companion.name} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="paper-card mt-10 rounded-[1.25rem] px-6 py-16 text-center">
          <p className="display text-3xl">No companions yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
            Start with a name and a voice. You can change everything else later.
          </p>
          <Link
            href="/studio/new"
            className="mt-6 inline-block rounded-full border border-line-strong px-5 py-2.5 text-sm hover:border-ink"
          >
            Create your first companion
          </Link>
        </div>
      )}
    </div>
  );
}
