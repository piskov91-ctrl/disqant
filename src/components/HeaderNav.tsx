"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navTextClass = "text-sm text-zinc-600 transition hover:text-zinc-900";
const navStackClass = "block rounded-xl px-3 py-2 text-base text-zinc-800 transition hover:bg-surface-raised";

export function HeaderNav() {
  const pathname = usePathname();

  function linkClass(href: string) {
    return `${navTextClass}${pathname === href ? " font-medium text-zinc-900" : ""}`;
  }
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
      <nav className="hidden items-center gap-7 lg:gap-8 md:flex" aria-label="Primary">
        <Link href="/how-it-works" className={linkClass("/how-it-works")}>
          How it works
        </Link>
        <Link href="/what-is-wear-me" className={linkClass("/what-is-wear-me")}>
          What is Wear Me?
        </Link>
        <Link href="/pricing" className={linkClass("/pricing")}>
          Pricing
        </Link>
        <Link href="/demo" className={linkClass("/demo")}>
          Demo
        </Link>
        <Link href="/contact" className={linkClass("/contact")}>
          Contact
        </Link>
      </nav>

      <Link
        href="/pricing"
        className={`${navTextClass} hidden sm:inline${pathname === "/pricing" ? " font-medium text-zinc-900" : ""}`}
      >
        Sign in
      </Link>
      <Link href="/demo" className="btn-accent-gradient h-10 px-5 text-sm font-semibold">
        Try it now
      </Link>

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
              <Link href="/what-is-wear-me" className={navStackClass} onClick={() => setOpen(false)}>
                What is Wear Me?
              </Link>
              <Link href="/pricing" className={navStackClass} onClick={() => setOpen(false)}>
                Pricing
              </Link>
              <Link href="/demo" className={navStackClass} onClick={() => setOpen(false)}>
                Demo
              </Link>
              <Link href="/contact" className={navStackClass} onClick={() => setOpen(false)}>
                Contact
              </Link>

              <div className="my-2 h-px w-full bg-surface-border" />

              <Link href="/pricing" className={navStackClass} onClick={() => setOpen(false)}>
                Sign in
              </Link>
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
