"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { RetailerAccountMenu } from "@/components/RetailerAccountMenu";
import { retailerSessionLabel, type RetailerDisplayUser } from "@/lib/retailerDisplayName";

const navAuthBtnClass = "btn-accent-gradient hidden sm:inline-flex";

export type HeaderNavProps = {
  /** Server-rendered retailer snapshot so auth UI matches session on first paint (no Log In flicker). */
  initialNavUser: RetailerDisplayUser | null;
};

export function HeaderNav({ initialNavUser }: HeaderNavProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const initialNavKey =
    initialNavUser === null
      ? "__signed_out__"
      : `${initialNavUser.email}\u0001${initialNavUser.firstName ?? ""}\u0001${initialNavUser.lastName ?? ""}`;

  const [retailerUser, setRetailerUser] = useState<RetailerDisplayUser | null>(initialNavUser);
  const [mobileSigningOut, setMobileSigningOut] = useState(false);

  /* When navigating, RSC can deliver a newer session snapshot before `/api/me` finishes. */
  useEffect(() => {
    setRetailerUser(initialNavUser);
  }, [initialNavKey, initialNavUser]);

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

  const loggedIn = retailerUser !== null;

  function desktopNavLinkClass(href: string) {
    const active = pathname === href;
    return `header-nav-link${active ? " header-nav-link--active" : ""}`;
  }

  function mobileNavLinkClass(href: string) {
    const active = pathname === href;
    const base =
      "relative block overflow-hidden rounded-xl border-l-[3px] py-3 pr-3 text-[15px] tracking-[0.12em] transition-[color,letter-spacing,background-color,padding-left,border-color,font-weight] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none after:pointer-events-none after:absolute after:bottom-2 after:left-4 after:right-5 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#c6a77d]/85 after:to-transparent after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:after:transition-none";
    if (active) {
      return `${base} border-[#c6a77d] bg-[#c6a77d]/[0.11] pl-[1.125rem] font-normal text-zinc-950 after:scale-x-100`;
    }
    return `${base} border-transparent bg-transparent pl-4 font-light text-zinc-800 after:origin-center after:scale-x-0 hover:border-[#c6a77d]/85 hover:bg-[#c6a77d]/[0.07] hover:pl-5 hover:font-normal hover:text-zinc-950 hover:tracking-[0.16em] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white`;
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
      <nav className="hidden items-center gap-4 md:flex md:gap-5" aria-label="Primary">
        <Link href="/how-it-works" className={desktopNavLinkClass("/how-it-works")}>
          How it works
        </Link>
        <Link href="/subscriptions" className={desktopNavLinkClass("/subscriptions")}>
          Subscriptions
        </Link>
        <Link href="/demo" className={desktopNavLinkClass("/demo")}>
          Demo
        </Link>
        <Link href="/about" className={`${desktopNavLinkClass("/about")} nav-about-us-highlight`}>
          About Us
        </Link>
        <Link href="/contact" className={desktopNavLinkClass("/contact")}>
          Contact
        </Link>
        {loggedIn && pathname !== "/dashboard" ? (
          <Link
            href="/dashboard"
            className={`${desktopNavLinkClass("/dashboard")} shrink-0 whitespace-nowrap`}
          >
            My Plan
          </Link>
        ) : null}
      </nav>

      {!loggedIn ? (
        <>
          <Link
            href="/login"
            className={`${navAuthBtnClass}${pathname === "/login" ? " ring-2 ring-[#c6a77d]/50 ring-offset-2 ring-offset-zinc-950" : ""}`}
          >
            Log In
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
            className="absolute right-0 top-[var(--site-header-height)] w-[min(100vw,420px)] max-h-[calc(100dvh_-_var(--site-header-height))] overflow-y-auto border-l border-b border-surface-border bg-white/95 p-4 shadow-2xl shadow-zinc-200/40 backdrop-blur-xl"
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
              <Link href="/how-it-works" className={mobileNavLinkClass("/how-it-works")} onClick={() => setOpen(false)}>
                How it works
              </Link>
              <Link href="/subscriptions" className={mobileNavLinkClass("/subscriptions")} onClick={() => setOpen(false)}>
                Subscriptions
              </Link>
              <Link href="/demo" className={mobileNavLinkClass("/demo")} onClick={() => setOpen(false)}>
                Demo
              </Link>
              <Link href="/about" className={`${mobileNavLinkClass("/about")} nav-about-us-highlight`} onClick={() => setOpen(false)}>
                About Us
              </Link>
              <Link href="/contact" className={mobileNavLinkClass("/contact")} onClick={() => setOpen(false)}>
                Contact
              </Link>
              {loggedIn && retailerUser ? (
                <>
                  {pathname !== "/dashboard" ? (
                    <Link
                      href="/dashboard"
                      className={`${mobileNavLinkClass("/dashboard")} whitespace-nowrap`}
                      onClick={() => setOpen(false)}
                    >
                      My Plan
                    </Link>
                  ) : null}
                  <Link href="/profile" className={mobileNavLinkClass("/profile")} onClick={() => setOpen(false)}>
                    Profile Settings
                  </Link>
                  <Link href="/plan" className={mobileNavLinkClass("/plan")} onClick={() => setOpen(false)}>
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
                    Log In
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
