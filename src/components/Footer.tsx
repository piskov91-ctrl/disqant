import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-white py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
            D
          </span>
          Disquant
        </Link>
        <p className="text-center text-sm text-zinc-500 md:text-left">
          © {new Date().getFullYear()} Disquant. Virtual try-on infrastructure for modern commerce.
        </p>
        <div className="flex gap-6 text-sm text-zinc-600">
          <a href="#" className="hover:text-zinc-900">
            Privacy
          </a>
          <a href="#" className="hover:text-zinc-900">
            Terms
          </a>
          <a href="#" className="hover:text-zinc-900">
            Status
          </a>
        </div>
      </div>
    </footer>
  );
}
