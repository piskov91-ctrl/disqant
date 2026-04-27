"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function UsageLookup() {
  const router = useRouter();
  const [key, setKey] = useState("");

  const targetHref = useMemo(() => {
    const v = key.trim();
    if (!v) return null;
    return `/usage?key=${encodeURIComponent(v)}`;
  }, [key]);

  return (
    <section className="border-b border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">Already a client?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Enter your API key to open your dashboard and see try-ons used and your try-on limit.
          </p>

          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (!targetHref) return;
              router.push(targetHref);
            }}
          >
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="dq_..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-accent/60 sm:max-w-sm"
            />
            <button
              type="submit"
              disabled={!targetHref}
              className="btn-accent-gradient h-11 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open dashboard
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

