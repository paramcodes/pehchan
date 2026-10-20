import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanionMetadata, getCompanionPageData } from "@/app/actions/catalogue";
import { startChatAction } from "@/app/actions/chat";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const metadata = await getCompanionMetadata(slug);
  if (!metadata) return { title: "Companion" };
  return metadata;
}

export default async function CompanionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompanionPageData(slug);

  if (!data) notFound();

  const { companion, isOwner, isSignedIn } = data;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <Link href="/explore" className="text-sm text-muted hover:text-ink">
        ← Back to the catalogue
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-line bg-surface">
            <Image
              src={companion.imageUrl}
              alt={`Portrait of ${companion.name}`}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/explore?category=${companion.categorySlug}`}
              className="eyebrow rounded-full border border-line px-3 py-1 hover:border-line-strong"
            >
              {companion.categoryName}
            </Link>
            {isOwner ? (
              <span className="rounded-full bg-accent-soft px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-accent-strong uppercase">
                Yours
              </span>
            ) : null}
            {companion.visibility === "private" ? (
              <span className="rounded-full border border-line px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Private
              </span>
            ) : null}
          </div>

          <h1 className="display mt-5 text-6xl sm:text-7xl">{companion.name}</h1>
          <p className="mt-3 font-display text-2xl text-accent italic">{companion.tagline}</p>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">{companion.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <form action={startChatAction}>
              <input type="hidden" name="slug" value={companion.slug} />
              <button
                type="submit"
                className="rounded-full bg-accent px-6 py-3 text-sm text-white transition-colors hover:bg-accent-strong"
              >
                Start a conversation
              </button>
            </form>
            {isOwner ? (
              <Link
                href={`/studio/${companion.id}/edit`}
                className="rounded-full border border-line-strong px-5 py-3 text-sm transition-colors hover:border-ink"
              >
                Edit companion
              </Link>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-muted">
            {isSignedIn
              ? "History and memories are saved to your account."
              : "You will need an account to talk."}
          </p>
        </div>
      </div>

      <div className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow">In their words</p>
          <h2 className="display mt-2 text-3xl">How they open.</h2>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
            The greeting is the first thing you see. The example dialogue is the voice underneath.
          </p>
        </div>

        <div className="grid gap-5 lg:col-span-8">
          <blockquote className="paper-card rounded-[1.25rem] p-6">
            <p className="font-display text-2xl leading-snug">“{companion.greeting}”</p>
          </blockquote>

          <div className="grid gap-4 sm:grid-cols-2">
            {companion.examples.map((example) => (
              <div key={example.user} className="rounded-[1.25rem] border border-line p-5">
                <p className="eyebrow">User</p>
                <p className="mt-2 text-sm leading-6">{example.user}</p>
                <p className="eyebrow mt-5">{companion.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{example.assistant}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
