"use client";

import Link from "next/link";

export function HeroCarousel() {
  return (
    <section
      className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24"
      aria-label="Product demo video"
    >
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade bg-[length:64px_64px] opacity-40"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          Virtual try-on for retailers
        </p>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl md:leading-[1.12]">
          See it on you before you buy it
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
          A short demo of the try-on flow—pick a product, upload a photo, and see the result.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
            Try the demo
          </Link>
          <a
            href="#subscriptions"
            className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-white px-8 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
          >
            See subscriptions
          </a>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">Video is muted and loops by default.</p>

        <div className="mt-12 w-full">
          <div className="flex w-full justify-center">
            <video
              src="/demo-video.mp4"
              className="block w-auto max-w-full rounded-2xl object-contain shadow-xl shadow-zinc-200/70"
              style={{ maxHeight: "70vh" }}
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              preload="auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
