import Image from "next/image";
import Link from "next/link";
import type { CompanionListItem } from "@/db/companions";

export function CompanionCard({
  companion,
  index = 0,
}: {
  companion: CompanionListItem;
  index?: number;
}) {
  return (
    <Link
      href={`/c/${companion.slug}`}
      className="group block focus-visible:rounded-[1.25rem]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article className="paper-card overflow-hidden rounded-[1.25rem] transition-transform duration-500 ease-out group-hover:-translate-y-1">
        <div className="relative aspect-[4/5] overflow-hidden bg-surface">
          <Image
            src={companion.imageUrl}
            alt={`Portrait of ${companion.name}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/55 to-transparent opacity-70" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-canvas/75 uppercase">
                {companion.categoryName}
              </p>
              <h3 className="display mt-1 text-2xl text-canvas">{companion.name}</h3>
            </div>
            <span className="translate-y-2 rounded-full border border-canvas/40 px-2.5 py-1 font-mono text-[10px] text-canvas/90 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              Meet
            </span>
          </div>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-muted">{companion.tagline}</p>
        </div>
      </article>
    </Link>
  );
}
