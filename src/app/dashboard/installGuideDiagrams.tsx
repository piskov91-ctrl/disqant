/** Decorative install-guide diagrams (Get Code tab). */

export function InstallDiagramStep1CopyCode() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: a code box with a typing cursor"
    >
      <figcaption className="sr-only">Code snippet with cursor</figcaption>
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Embed snippet</span>
      </div>
      <div className="relative p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
        <div className="flex flex-wrap items-center gap-x-0.5">
          <span className="text-[#c6a77d]/80">&lt;script</span>
          <span className="text-zinc-500"> async </span>
          <span className="text-[#c6a77d]/80">src=</span>
          <span className="text-emerald-400/70">&quot;…/widget.js&quot;</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-0.5">
          <span className="text-[#c6a77d]/80">data-fit-room-key=</span>
          <span className="text-emerald-400/70">&quot;••••••••&quot;</span>
          <span className="text-[#c6a77d]/80">&gt;&lt;/script&gt;</span>
          <span className="ml-0.5 inline-block h-3.5 w-px bg-[#c6a77d] motion-safe:animate-pulse" aria-hidden />
        </div>
      </div>
    </figure>
  );
}

export function InstallDiagramStep2Editors() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: browser window with Shopify and WordPress"
    >
      <figcaption className="sr-only">Browser window and popular site builders</figcaption>
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="6" r="0.75" fill="currentColor" />
            <circle cx="8.5" cy="6" r="0.75" fill="currentColor" />
          </svg>
          <span className="truncate text-[10px] text-zinc-500">yoursite.com · theme editor</span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-8">
        <div
          className="flex h-14 w-[88%] max-w-sm items-center justify-center rounded-lg border border-white/10 bg-zinc-950/60"
          aria-hidden
        >
          <div className="h-8 w-[85%] rounded border border-dashed border-white/15 bg-zinc-900/40" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#95BF47]/15 px-4 py-2.5 shadow-sm shadow-black/20">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#95BF47] text-[10px] font-bold text-white shadow-inner"
              aria-hidden
            >
              S
            </span>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">Shopify</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#21759B]/15 px-4 py-2.5 shadow-sm shadow-black/20">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21759B] text-xs font-bold text-white shadow-inner"
              aria-hidden
            >
              W
            </span>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">WordPress</span>
          </div>
        </div>
        <p className="text-center text-[10px] uppercase tracking-wider text-zinc-600">Also works with other site builders</p>
      </div>
    </figure>
  );
}

export function InstallDiagramStep3BodyTag() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: HTML with closing body tag highlighted"
    >
      <figcaption className="sr-only">Paste embed before closing body tag</figcaption>
      <div className="border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">theme.liquid / footer</span>
      </div>
      <div className="p-4 font-mono text-[11px] leading-7 text-zinc-500">
        <div>
          <span className="text-zinc-600">&lt;html&gt;</span>
        </div>
        <div>
          <span className="text-zinc-600">&nbsp;&nbsp;&lt;head&gt;</span>
          <span className="text-zinc-700"> … </span>
          <span className="text-zinc-600">&lt;/head&gt;</span>
        </div>
        <div>
          <span className="text-zinc-600">&nbsp;&nbsp;&lt;body&gt;</span>
        </div>
        <div className="pl-4 text-emerald-400/50">
          <span>&lt;script </span>
          <span className="text-emerald-400/35">… your Wear Me line …</span>
          <span>&gt;&lt;/script&gt;</span>
        </div>
        <div className="pl-4">
          <span className="inline-block rounded-md bg-[#c6a77d]/20 px-2 py-0.5 font-semibold text-[#e8d4b5] ring-1 ring-[#c6a77d]/45">
            &lt;/body&gt;
          </span>
          <span className="ml-2 text-[10px] font-sans font-medium uppercase tracking-wide text-[#c6a77d]/70">
            ← paste above this
          </span>
        </div>
        <div>
          <span className="text-zinc-600">&lt;/html&gt;</span>
        </div>
      </div>
    </figure>
  );
}

export function InstallDiagramStep4Success() {
  return (
    <figure
      className="mt-4 flex max-w-xl flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-6 py-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: success"
    >
      <figcaption className="sr-only">Published successfully</figcaption>
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/[0.12] shadow-[0_0_40px_rgba(52,211,153,0.12)]"
        aria-hidden
      >
        <div className="absolute inset-3 rounded-full border border-emerald-400/20" />
        <svg className="relative h-11 w-11 text-emerald-300" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 12.5 10.2 17 18 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-5 text-sm font-medium text-zinc-300">Live on your site</p>
      <p className="mt-1 text-xs text-zinc-500">Save, publish, then check a product page</p>
    </figure>
  );
}
