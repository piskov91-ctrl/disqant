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
          Shrink-wrapped link (`inline-block w-fit`) so the hit target is the logo lockup — a flex `<Link>` used to
          stretch wide/tall and stole clicks meant for dashboard tabs.

          `.header-logo-lockup` sets a nominal height (~294px) in a `--site-header-height` (108px) bar plus old `mt-*`
          on the `<Image>`; spills overlapped page content horizontally (large lockup + `md:-ml-[270px]`) and vertically
          so “My Plan” could receive the click under the inflated box. Clamp with inline max-height + an overflow-hidden
          slot confined to the bar height.
        */}
        <div className="relative z-0 ml-0 flex h-[var(--site-header-height)] min-h-0 min-w-0 shrink-0 items-center justify-self-start overflow-hidden py-0 pl-0 md:ml-[-270px]">
          <Link
            href="/"
            className="inline-block w-fit max-w-[min(360px,calc(100vw-9.75rem))] sm:max-w-[min(420px,calc(100vw-11rem))] md:max-w-[min(720px,calc(100vw-26rem))]"
          >
            <Image
              src="/logo.png"
              alt="Fit Room"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 640px) 360px, (max-width: 767px) 420px, 720px"
              style={{ height: "auto", maxHeight: "var(--site-header-height)" }}
              className="header-logo-lockup mt-0 block max-w-full"
            />
          </Link>
        </div>
        <HeaderNavSlot />
      </div>
    </header>
  );
}
