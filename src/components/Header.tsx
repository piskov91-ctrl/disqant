import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-white/80 backdrop-blur-xl">
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
        <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
          <a href="#features" className="transition hover:text-zinc-900">
            Product
          </a>
          <a href="#pricing" className="transition hover:text-zinc-900">
            Pricing
          </a>
          <Link href="/demo" className="transition hover:text-zinc-900">
            Demo
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="hidden text-sm text-zinc-600 transition hover:text-zinc-900 sm:inline"
          >
            Sign in
          </a>
          <Link href="/demo" className="btn-accent-gradient h-10 px-5 text-sm font-semibold">
            Try it now
          </Link>
        </div>
      </div>
    </header>
  );
}
