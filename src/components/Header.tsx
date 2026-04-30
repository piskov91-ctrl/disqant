import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav } from "@/components/HeaderNav";

/** Renders with `usePathname()`; must be under Suspense in the App Router to avoid a client / static bailout and production “Application error” on prerender. */
function HeaderNavSlot() {
  return (
    <Suspense
      fallback={
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3" aria-hidden>
          <div className="hidden h-8 w-[22rem] rounded-lg bg-zinc-200/80 md:block" />
          <div className="h-8 w-24 rounded-full bg-zinc-200/80" />
          <div className="h-9 w-10 rounded-full border border-surface-border bg-white" />
        </div>
      }
    >
      <div className="flex min-w-0 flex-1 justify-end">
        <HeaderNav />
      </div>
    </Suspense>
  );
}

export function Header() {
  return (
    <header className="site-header fixed top-0 left-0 right-0 z-[60] border-b border-white/10 bg-transparent backdrop-blur-md">
      <div className="mx-auto flex h-[60px] max-h-[60px] min-h-[60px] max-w-6xl shrink-0 items-center justify-between gap-3 overflow-hidden px-5 md:px-6">
        <Link href="/" className="flex h-full min-h-0 min-w-0 shrink-0 items-center overflow-hidden py-1">
          <Image
            src="/logo.png"
            alt="Fit Room"
            width={1024}
            height={1024}
            priority
            sizes="280px"
            className="box-border h-full w-auto max-h-full max-w-[min(280px,52vw)] object-contain object-left"
            style={{ mixBlendMode: "multiply", backgroundColor: "transparent" }}
          />
        </Link>
        <HeaderNavSlot />
      </div>
    </header>
  );
}
