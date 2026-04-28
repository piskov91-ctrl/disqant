"use client";

import { useState } from "react";

export function DemoPanel() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleTry() {
    setLoading(true);
    setDone(false);
    window.setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1400);
  }

  return (
    <section
      id="demo"
      className="scroll-mt-28 border-y border-surface-border bg-surface-muted/80 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              See the demo in seconds
            </h2>
            <p className="mt-4 text-zinc-600">
              Upload a portrait and a garment—Fit Room returns a studio-quality composite you can
              drop into your PDP or checkout flow. This preview simulates the flow; wire your keys
              when you are ready to integrate.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-zinc-700">
              <li className="flex gap-3">
                <span className="mt-0.5 text-accent">✓</span>
                Consistent lighting and body-aware drape
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-accent">✓</span>
                Batch jobs for full collections
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-accent">✓</span>
                Webhooks when renders complete
              </li>
            </ul>
          </div>
          <div className="relative rounded-2xl border border-surface-border bg-gradient-to-br from-surface-raised to-white p-1 shadow-xl shadow-zinc-200/60">
            <div className="rounded-[0.875rem] bg-white p-6 md:p-8">
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
                {done ? (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600">
                      ✓
                    </div>
                    <p className="font-medium text-zinc-900">Preview ready</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      In production, your image URL would appear here.
                    </p>
                  </div>
                ) : loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-accent" />
                    <p className="text-sm text-zinc-600">Fitting garment…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">Interactive demo placeholder</p>
                    <button
                      type="button"
                      onClick={handleTry}
                      className="wear-me-btn"
                    >
                      Try it now
                    </button>
                  </>
                )}
              </div>
              {done && (
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="mt-4 w-full rounded-lg border border-surface-border py-2 text-sm text-zinc-600 transition hover:bg-surface-raised hover:text-zinc-900"
                >
                  Reset demo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
