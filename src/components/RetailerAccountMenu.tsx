"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogOut, User } from "lucide-react";
import { retailerSessionLabel, type RetailerDisplayUser } from "@/lib/retailerDisplayName";

function userInitials(u: RetailerDisplayUser): string {
  const f = u.firstName?.trim();
  const l = u.lastName?.trim();
  if (f && l) return (f.charAt(0) + l.charAt(0)).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return u.email.charAt(0).toUpperCase();
}

const itemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-100";

type RetailerAccountMenuProps = {
  user: RetailerDisplayUser;
};

export function RetailerAccountMenu({ user }: RetailerAccountMenuProps) {
  const menuId = useId();
  const btnId = useId();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await fetch("/api/retailer/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/";
    }
  }, []);

  const label = retailerSessionLabel(user);

  return (
    <div className="relative hidden md:block" ref={wrapRef}>
      <button
        id={btnId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[14rem] items-center gap-2 rounded-full border border-surface-border bg-white py-1.5 pl-1.5 pr-2 text-left shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent"
          aria-hidden
        >
          {userInitials(user)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={btnId}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] min-w-[13.5rem] rounded-xl border border-zinc-200/90 bg-white p-1.5 shadow-xl shadow-zinc-900/10"
        >
          <Link
            href="/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            Profile Settings
          </Link>
          <Link href="/plan" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <CreditCard className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            My Plan
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            className={`${itemClass} mt-0.5 border-t border-zinc-100 text-zinc-700 disabled:opacity-60`}
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
