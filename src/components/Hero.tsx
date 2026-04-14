export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade bg-[length:64px_64px] opacity-40"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised/80 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Virtual try-on API for teams
        </p>
        <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.08]">
          The fastest way to put your catalog on every customer.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          Disquant blends photorealistic fitting with a developer-friendly API so you can ship
          try-on experiences on web, mobile, and in-store—without a months-long build.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="/demo"
            className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white shadow-[0_0_48px_-12px_rgba(124,92,255,0.45)] transition hover:bg-accent-muted"
          >
            Try it now
          </a>
          <a
            href="#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-surface-raised/50 px-8 text-sm font-medium text-zinc-300 backdrop-blur transition hover:border-zinc-600 hover:bg-surface-raised"
          >
            View pricing
          </a>
        </div>
        <p className="mt-8 text-sm text-zinc-500">
          No credit card for sandbox · SOC2 in progress · 99.9% uptime SLA on Enterprise
        </p>
      </div>
    </section>
  );
}
