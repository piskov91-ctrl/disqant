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
    <section className="border-t border-surface-border bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Already a client?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Enter your API key to check your current usage.
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
              className="h-11 w-full rounded-xl border border-surface-border bg-white px-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-accent/60 sm:max-w-sm"
            />
            <button
              type="submit"
              disabled={!targetHref}
              className="btn-accent-gradient h-11 px-6 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Check my usage
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

