"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function RetailerDashboardClient({ apiKey }: { apiKey: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const copyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiKey;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [apiKey]);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/retailer/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void copyKey()}
        className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-6 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:bg-zinc-900/80"
      >
        {copied ? "Copied" : "Copy API key"}
      </button>
      <button
        type="button"
        disabled={loggingOut}
        onClick={() => void logout()}
        className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-60"
      >
        {loggingOut ? "Signing out…" : "Log out"}
      </button>
    </div>
  );
}
