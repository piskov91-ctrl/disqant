export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade bg-[length:64px_64px] opacity-50"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          Virtual try-on API for teams
        </p>
        <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl md:leading-[1.08]">
          The fastest way to put your catalog on every customer.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
          Disquant blends photorealistic fitting with a developer-friendly API so you can ship
          try-on experiences on web, mobile, and in-store—without a months-long build.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="/demo" className="btn-accent-gradient h-12 px-8">
            Try it now
          </a>
          <a
            href="#pricing"
            className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-white px-8 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
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
