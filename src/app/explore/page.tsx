import Link from "next/link";
import { CompanionCard } from "@/components/companion-card";
import { listCategories, listCompanions } from "@/db/companions";
import { normalizeSearchQuery } from "@/domain/search";

export const metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const category = params.category;

  const [categories, companions] = await Promise.all([
    listCategories(),
    listCompanions({ query, categorySlug: category }),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">
            {activeCategory ? activeCategory.name : "Everyone, for now."}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
            {activeCategory?.description ??
              "Eight voices with different jobs, different weather, and different ideas about what a good question sounds like."}
          </p>
        </div>

        <form className="w-full max-w-sm" action="/explore" method="get">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <label htmlFor="catalogue-search" className="eyebrow">
            Search
          </label>
          <div className="mt-2 flex overflow-hidden rounded-full border border-line bg-paper focus-within:border-line-strong">
            <input
              id="catalogue-search"
              name="q"
              defaultValue={query}
              placeholder="Name, mood, or a word they would use"
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted/70"
            />
            <button
              type="submit"
              className="border-l border-line px-4 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              Find
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/explore"
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            category
              ? "border-line text-muted hover:border-line-strong hover:text-ink"
              : "border-ink bg-ink text-canvas"
          }`}
        >
          All
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={`/explore?category=${item.slug}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              category === item.slug
                ? "border-ink bg-ink text-canvas"
                : "border-line text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
        <p className="text-sm text-muted">
          {companions.length} {companions.length === 1 ? "companion" : "companions"}
          {query ? ` for “${query}”` : ""}
        </p>
        {query || category ? (
          <Link href="/explore" className="text-xs text-muted underline underline-offset-4">
            Clear filters
          </Link>
        ) : null}
      </div>

      {companions.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {companions.map((companion, index) => (
            <CompanionCard key={companion.id} companion={companion} index={index} />
          ))}
        </div>
      ) : (
        <div className="paper-card mt-6 rounded-[1.25rem] px-6 py-16 text-center">
          <p className="display text-3xl">Nobody by that description.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
            Try a broader mood, or make the companion you were looking for.
          </p>
          <Link
            href="/studio/new"
            className="mt-6 inline-block rounded-full border border-line-strong px-5 py-2.5 text-sm hover:border-ink"
          >
            Create a companion
          </Link>
        </div>
      )}
    </div>
  );
}
