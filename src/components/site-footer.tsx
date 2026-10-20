import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase">Pehchan</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Companions with a point of view, a short memory of the small things, and no interest in
            pretending to be human.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-muted">
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/studio" className="hover:text-ink">
            Studio
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
