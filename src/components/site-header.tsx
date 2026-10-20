import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getSession } from "@/lib/session";

const navLink =
  "rounded-full px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Pehchan home">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-ink text-[13px] font-semibold">
            P
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase">
            Pehchan
          </span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5" aria-label="Main">
          <Link href="/explore" className={navLink}>
            Explore
          </Link>
          {session ? (
            <>
              <Link href="/chats" className={`${navLink} hidden sm:inline-flex`}>
                Chats
              </Link>
              <Link href="/studio" className={navLink}>
                Studio
              </Link>
              <form action={signOutAction} className="ml-1">
                <button
                  type="submit"
                  className="rounded-full border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className={`${navLink} hidden sm:inline-flex`}>
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="ml-1 rounded-full bg-ink px-4 py-2 text-sm text-canvas transition-colors hover:bg-ink-soft"
              >
                Start
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
