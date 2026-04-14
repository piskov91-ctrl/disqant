import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
            D
          </span>
          Disquant
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a href="#features" className="transition hover:text-white">
            Product
          </a>
          <a href="#pricing" className="transition hover:text-white">
            Pricing
          </a>
          <Link href="/demo" className="transition hover:text-white">
            Demo
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="hidden text-sm text-zinc-400 transition hover:text-white sm:inline"
          >
            Sign in
          </a>
          <Link
            href="/demo"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0c0c0f] transition hover:bg-zinc-200"
          >
            Try it now
          </Link>
        </div>
      </div>
    </header>
  );
}
