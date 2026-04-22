"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navTextClass = "text-sm text-zinc-600 transition hover:text-zinc-900";
const navStackClass = "block rounded-xl px-3 py-2 text-base text-zinc-800 transition hover:bg-surface-raised";

export function HeaderNav() {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex items-center gap-3">
      {/* Desktop nav */}
      <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
        <Link href="/how-it-works" className={navTextClass}>
          How it works
        </Link>
        <Link href="/product" className={navTextClass}>
          What is Wear Me?
        </Link>
        <Link href="/pricing" className={navTextClass}>
          Subscriptions
        </Link>
        <Link
          href="/demo"
          className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-medium text-white rounded-full"
        >
          Wear Me
        </Link>
        <Link href="/about" className={navTextClass}>
          About
        </Link>
      </nav>

      {/* Right actions (always visible) */}
      <a href="#pricing" className={`${navTextClass} hidden sm:inline`}>
        Sign in
      </a>
      <Link href="/demo" className="btn-accent-gradient h-10 px-5 text-sm font-semibold">
        Try it now
      </Link>

      {/* Mobile menu toggle */}
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-white text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile menu panel */}
      {open ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/30"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            className="absolute right-0 top-16 w-[min(100vw,420px)] max-h-[calc(100dvh-4rem)] overflow-y-auto border-l border-b border-surface-border bg-white/95 p-4 shadow-2xl shadow-zinc-200/40 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Menu</p>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-white text-zinc-800 transition hover:border-zinc-300 hover:bg-surface-raised"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label="Mobile">
              <Link href="/how-it-works" className={navStackClass} onClick={() => setOpen(false)}>
                How it works
              </Link>
              <Link href="/product" className={navStackClass} onClick={() => setOpen(false)}>
                What is Wear Me?
              </Link>
              <Link href="/pricing" className={navStackClass} onClick={() => setOpen(false)}>
                Subscriptions
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-medium text-white rounded-full"
                onClick={() => setOpen(false)}
              >
                Wear Me
              </Link>
              <Link href="/about" className={navStackClass} onClick={() => setOpen(false)}>
                About
              </Link>

              <div className="my-2 h-px w-full bg-surface-border" />

              <a href="#pricing" className={navStackClass} onClick={() => setOpen(false)}>
                Sign in
              </a>
              <Link
                href="/demo"
                className="btn-accent-gradient mt-1 h-11 w-full justify-center text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                Try it now
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
