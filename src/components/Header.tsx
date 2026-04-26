import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav } from "@/components/HeaderNav";

/** Renders with `usePathname()`; must be under Suspense in the App Router to avoid a client / static bailout and production “Application error” on prerender. */
function HeaderNavSlot() {
  return (
    <Suspense
      fallback={
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3" aria-hidden>
          <div className="hidden h-9 w-[22rem] rounded-lg bg-zinc-200/80 md:block" />
          <div className="h-9 w-24 rounded-full bg-zinc-200/80" />
          <div className="h-9 w-10 rounded-full border border-surface-border bg-white" />
        </div>
      }
    >
      <HeaderNav />
    </Suspense>
  );
}

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[60] border-b border-surface-border bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            D
          </span>
          Disquant
        </Link>
        <HeaderNavSlot />
      </div>
    </header>
  );
}
