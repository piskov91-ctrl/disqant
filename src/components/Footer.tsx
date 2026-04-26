import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/40 py-10 text-center text-sm text-zinc-500 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6">
        <p className="text-zinc-400">
          <span className="whitespace-normal sm:whitespace-nowrap">
            Disquant Ltd <span className="text-zinc-600">|</span> London, UK{" "}
            <span className="text-zinc-600">|</span>{" "}
            <a
              href="mailto:hello@disqant.com"
              className="text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-white hover:decoration-zinc-400"
            >
              hello@disqant.com
            </a>
          </span>
        </p>
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-zinc-400"
          aria-label="Legal"
        >
          <Link
            href="/terms"
            className="transition hover:text-zinc-100"
          >
            Terms &amp; Conditions
          </Link>
          <span className="text-zinc-700" aria-hidden>
            ·
          </span>
          <Link
            href="/privacy"
            className="transition hover:text-zinc-100"
          >
            Privacy &amp; Cookies
          </Link>
        </nav>
        <p className="text-xs text-zinc-600">© 2026 Disquant Ltd</p>
      </div>
    </footer>
  );
}
