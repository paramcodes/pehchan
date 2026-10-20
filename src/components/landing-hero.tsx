"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import type { CompanionListItem } from "@/domain/catalogue";

export function LandingHero({
  companions,
  companionCount,
  categoryCount,
}: {
  companions: CompanionListItem[];
  companionCount: number;
  categoryCount: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline
        .from(".hero-kicker", { y: 12, opacity: 0, duration: 0.6 })
        .from(".hero-title > span", { y: 40, opacity: 0, duration: 0.8, stagger: 0.08 }, "-=0.25")
        .from(".hero-copy", { y: 16, opacity: 0, duration: 0.6 }, "-=0.4")
        .from(".hero-actions", { y: 14, opacity: 0, duration: 0.5 }, "-=0.3")
        .from(
          ".hero-portrait",
          { y: 36, opacity: 0, rotate: 0, duration: 0.9, stagger: 0.1 },
          "-=0.5",
        )
        .from(".hero-stats", { opacity: 0, duration: 0.4 }, "-=0.3");

      return () => timeline.kill();
    });

    return () => media.revert();
  }, []);

  return (
    <div
      ref={root}
      className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-12 pb-16 lg:grid-cols-12 lg:gap-8 lg:pt-20"
    >
      <div className="lg:col-span-7 lg:pr-8">
        <p className="hero-kicker eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-line-strong" />
          AI companions, with a memory
        </p>

        <h1 className="hero-title display mt-6 text-[clamp(3.6rem,9vw,7.2rem)]">
          <span className="block">Meet someone</span>
          <span className="block text-accent italic">worth</span>
          <span className="block">remembering.</span>
        </h1>

        <p className="hero-copy mt-7 max-w-md text-base leading-7 text-muted">
          Browse companions by mood, start a conversation, and keep the details that make it feel
          like a relationship instead of a reset button.
        </p>

        <div className="hero-actions mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/explore"
            className="rounded-full bg-ink px-5 py-3 text-sm text-canvas transition-colors hover:bg-ink-soft"
          >
            Browse companions
          </Link>
          <Link
            href="/studio"
            className="rounded-full border border-line-strong px-5 py-3 text-sm text-ink transition-colors hover:border-ink"
          >
            Make your own
          </Link>
        </div>

        <dl className="hero-stats mt-12 flex gap-10 border-t border-line pt-5">
          <div>
            <dt className="eyebrow">Companions</dt>
            <dd className="mt-1 font-display text-3xl">{companionCount}</dd>
          </div>
          <div>
            <dt className="eyebrow">Categories</dt>
            <dd className="mt-1 font-display text-3xl">{categoryCount}</dd>
          </div>
          <div>
            <dt className="eyebrow">Memory</dt>
            <dd className="mt-1 font-display text-3xl">On</dd>
          </div>
        </dl>
      </div>

      <div className="relative min-h-[28rem] lg:col-span-5 lg:min-h-[36rem]">
        {companions.slice(0, 3).map((companion, index) => {
          const rotations = ["-6deg", "3deg", "-2deg"];
          const positions = [
            "left-0 top-4 w-[54%] rotate-[-6deg]",
            "right-0 top-24 w-[50%] rotate-[3deg]",
            "left-[22%] bottom-0 w-[46%] rotate-[-2deg]",
          ];

          return (
            <Link
              key={companion.id}
              href={`/c/${companion.slug}`}
              className={`hero-portrait absolute block overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_-24px_rgba(35,34,28,0.55)] ${positions[index] ?? positions[0]}`}
              style={{ transform: `rotate(${rotations[index] ?? "0deg"})` }}
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={companion.imageUrl}
                  alt={`Portrait of ${companion.name}`}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 20vw, 45vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-12">
                  <p className="font-mono text-[9px] tracking-[0.16em] text-canvas/70 uppercase">
                    {companion.categoryName}
                  </p>
                  <p className="display mt-0.5 text-xl text-canvas">{companion.name}</p>
                </div>
              </div>
            </Link>
          );
        })}
        <span className="absolute top-2 right-2 z-10 rounded-full border border-line bg-paper/90 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase backdrop-blur">
          {companions.length > 0 ? "Now talking" : "Coming soon"}
        </span>
      </div>
    </div>
  );
}
