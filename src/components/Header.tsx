import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";

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
        <HeaderNav />
      </div>
    </header>
  );
}
