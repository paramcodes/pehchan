import Link from "next/link";
import { LandingHero } from "@/components/landing-hero";
import { CompanionCard } from "@/components/companion-card";
import { countCatalogue, listCategories, listFeaturedCompanions } from "@/db/companions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured, counts] = await Promise.all([
    listCategories(),
    listFeaturedCompanions(4),
    countCatalogue(),
  ]);

  return (
    <div>
      <LandingHero
        companions={featured}
        companionCount={counts.companions}
        categoryCount={counts.categories}
      />

      <section className="border-y border-line bg-paper/50">
        <div className="mx-auto flex w-full max-w-6xl gap-3 overflow-x-auto px-5 py-4">
          <span className="eyebrow shrink-0 self-center pr-2">Browse by mood</span>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/explore?category=${category.slug}`}
              className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-line-strong hover:bg-surface"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The catalogue</p>
            <h2 className="display mt-2 text-4xl sm:text-5xl">A few good first meetings.</h2>
          </div>
          <Link
            href="/explore"
            className="text-sm text-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            See everyone
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((companion, index) => (
            <CompanionCard key={companion.id} companion={companion} index={index} />
          ))}
        </div>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Memory, without the theatre</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">It remembers the small things.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
            {[
              {
                number: "01",
                title: "Talk normally",
                body: "Conversations stream in real time and are stored per companion. No lost tabs, no starting over.",
              },
              {
                number: "02",
                title: "Facts are extracted",
                body: "After a reply, durable details are pulled out and embedded. Preferences, people, plans, promises.",
              },
              {
                number: "03",
                title: "Context comes back",
                body: "Before the next reply, retrieval pulls the few memories that matter and leaves the rest alone.",
              },
            ].map((item) => (
              <div key={item.number} className="border-t border-line pt-5">
                <p className="font-mono text-[11px] text-accent">{item.number}</p>
                <h3 className="mt-3 text-base font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-24">
        <div className="paper-card rounded-[1.5rem] px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">Your turn</p>
              <h2 className="display mt-3 text-4xl sm:text-5xl">
                Write someone who only exists here.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                Give them a voice, a history, and a reason to ask the second question. Keep them
                private, or add them to the catalogue.
              </p>
            </div>
            <Link
              href="/studio/new"
              className="shrink-0 rounded-full bg-accent px-5 py-3 text-sm text-white transition-colors hover:bg-accent-strong"
            >
              Open the studio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
