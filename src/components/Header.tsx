import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav } from "@/components/HeaderNav";

/** Renders with `usePathname()`; must be under Suspense in the App Router to avoid a client / static bailout and production “Application error” on prerender. */
function HeaderNavSlot() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 w-full min-w-0 items-center justify-end gap-3" aria-hidden>
          <div className="hidden h-8 w-[22rem] rounded-lg bg-zinc-200/80 md:block" />
          <div className="h-8 w-24 rounded-full bg-zinc-200/80" />
          <div className="h-9 w-10 rounded-full border border-surface-border bg-white" />
        </div>
      }
    >
      <div className="relative z-10 flex min-h-0 w-full min-w-0 justify-end justify-self-end">
        <HeaderNav />
      </div>
    </Suspense>
  );
}

export function Header() {
  return (
    <header className="site-header fixed top-0 left-0 right-0 z-[60] overflow-visible border-b border-white/10 bg-transparent backdrop-blur-md">
      <div className="mx-auto grid h-[var(--site-header-height)] max-h-[var(--site-header-height)] min-h-[var(--site-header-height)] w-full max-w-6xl shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center justify-items-stretch gap-x-6 overflow-visible pl-0 pr-4 md:gap-x-10 md:pr-5">
        {/*
          Logo art extends below the 108px bar (see `.header-logo-lockup`). A full-size <Link> around the image
          leaves a huge hit region over the main content and blocked the leftmost dashboard tab (“My Plan”).
          Image is decorative for pointing; the overlay link matches logo max-width breakpoints from globals.css.
        */}
        <div className="relative z-0 flex min-h-0 min-w-0 shrink-0 items-center justify-self-start ml-0 md:ml-[-270px] pl-0 py-0">
          <Image
            src="/logo.png"
            alt=""
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 640px) 360px, (max-width: 767px) 420px, 720px"
            className="header-logo-lockup mt-10 pointer-events-none select-none"
            aria-hidden
          />
          <Link
            href="/"
            className="absolute left-0 top-0 z-[1] block h-[var(--site-header-height)] w-[min(360px,calc(100vw-9.75rem))] sm:w-[min(420px,calc(100vw-11rem))] md:w-[min(720px,calc(100vw-26rem))]"
          >
            <span className="sr-only">Fit Room home</span>
          </Link>
        </div>
        <HeaderNavSlot />
      </div>
    </header>
  );
}
