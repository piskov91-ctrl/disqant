"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { RetailerAccountMenu } from "@/components/RetailerAccountMenu";
import { retailerSessionLabel, type RetailerDisplayUser } from "@/lib/retailerDisplayName";

const navTextClass = "text-sm text-zinc-600 transition hover:text-zinc-900";
const navStackClass = "block rounded-xl px-3 py-2 text-base text-zinc-800 transition hover:bg-surface-raised";
const navAuthBtnClass = "btn-accent-gradient hidden sm:inline-flex";

export function HeaderNav() {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [retailerUser, setRetailerUser] = useState<RetailerDisplayUser | null | undefined>(undefined);
  const [mobileSigningOut, setMobileSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/retailer/me", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          setRetailerUser(null);
          return;
        }
        const data = (await res.json()) as { user?: RetailerDisplayUser };
        setRetailerUser(data.user ?? null);
      } catch {
        if (!cancelled) setRetailerUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const loggedIn = Boolean(retailerUser);

  function linkClass(href: string) {
    return `${navTextClass}${pathname === href ? " font-medium text-zinc-900" : ""}`;
  }

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

  function signOutMobile() {
    void (async () => {
      setMobileSigningOut(true);
      try {
        await fetch("/api/retailer/logout", { method: "POST", credentials: "include" });
      } finally {
        window.location.href = "/";
      }
    })();
  }

  return (
    <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
      <nav className="hidden items-center gap-7 lg:gap-8 md:flex" aria-label="Primary">
        <Link href="/how-it-works" className={linkClass("/how-it-works")}>
          How it works
        </Link>
        <Link href="/pricing" className={linkClass("/pricing")}>
          Subscriptions
        </Link>
        <Link href="/demo" className={linkClass("/demo")}>
          Demo
        </Link>
        <Link href="/contact" className={linkClass("/contact")}>
          Contact
        </Link>
        {loggedIn ? (
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
        ) : null}
      </nav>

      {!loggedIn ? (
        <>
          <Link
            href="/login"
            className={`${navAuthBtnClass}${pathname === "/login" ? " ring-2 ring-[#c6a77d]/50 ring-offset-2 ring-offset-zinc-950" : ""}`}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className={`${navAuthBtnClass}${pathname === "/register" ? " ring-2 ring-[#c6a77d]/50 ring-offset-2 ring-offset-zinc-950" : ""}`}
          >
            Sign Up
          </Link>
        </>
      ) : null}

      {loggedIn && retailerUser ? <RetailerAccountMenu user={retailerUser} /> : null}

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
              <Link href="/pricing" className={navStackClass} onClick={() => setOpen(false)}>
                Subscriptions
              </Link>
              <Link href="/demo" className={navStackClass} onClick={() => setOpen(false)}>
                Demo
              </Link>
              <Link href="/contact" className={navStackClass} onClick={() => setOpen(false)}>
                Contact
              </Link>
              {loggedIn && retailerUser ? (
                <>
                  <Link href="/dashboard" className={navStackClass} onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/profile" className={navStackClass} onClick={() => setOpen(false)}>
                    Profile Settings
                  </Link>
                  <Link href="/plan" className={navStackClass} onClick={() => setOpen(false)}>
                    My Plan
                  </Link>
                  <p className="mt-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600">
                    Signed in as {retailerSessionLabel(retailerUser)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl px-3 py-3 text-left text-base font-semibold text-zinc-800 transition hover:bg-red-50 hover:text-red-900"
                    disabled={mobileSigningOut}
                    onClick={() => {
                      setOpen(false);
                      signOutMobile();
                    }}
                  >
                    {mobileSigningOut ? "Signing out…" : "Sign Out"}
                  </button>
                </>
              ) : null}

              {!loggedIn ? (
                <>
                  <div className="my-2 h-px w-full bg-surface-border" />
                  <Link
                    href="/login"
                    className="btn-accent-gradient w-full"
                    onClick={() => setOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="btn-accent-gradient w-full"
                    onClick={() => setOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
