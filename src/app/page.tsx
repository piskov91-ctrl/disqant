import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";
import { Code2, MonitorSmartphone, Shirt } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-28 pb-14 md:pt-36 md:pb-16">
          <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
          <div
            className="pointer-events-none absolute inset-0 bg-grid-fade bg-[length:64px_64px] opacity-40"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-6">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
              Virtual try-on for UK retailers
            </p>

            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl md:leading-[1.05]">
              Let shoppers try before they buy
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
              Add AI virtual try-on to your store in one line of code. No app. No friction.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                See it live
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-white px-8 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
              >
                Get started
              </Link>
            </div>
          </div>
        </section>

        {/* VIDEO */}
        <section aria-label="Product demo video" className="pb-18 md:pb-22">
          <div className="mx-auto max-w-6xl px-6">
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
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">How it works</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Built for conversion, not complexity
            </p>

            <ol className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
              <li className="flex flex-col rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Code2 className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">1. Add one line of code</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Drop the script into your theme once. It works across product pages with no app download.
                </p>
              </li>
              <li className="flex flex-col rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <MonitorSmartphone className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">2. Shoppers upload their photo</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  They use a normal full-length photo from their camera roll. No signup wall, no friction.
                </p>
              </li>
              <li className="flex flex-col rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Shirt className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">3. They see themselves wearing it</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  A believable preview in seconds—so customers buy with confidence and return less.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* FOR WHO */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">For who</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Fits the way fashion retail works
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Fashion Boutiques</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Give customers confidence on fit and style without adding operational overhead.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Sports Retailers</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Help shoppers choose the right size and layer combinations across seasonal ranges.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Online Stores</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Reduce returns and increase conversion with try-on directly on your PDPs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">30s</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">average try-on time</div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">1</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">line of code to install</div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">Any</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">website compatible</div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-14">
              <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                    Ready to boost your sales?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
                    See the try-on flow end-to-end and imagine it on your product pages.
                  </p>
                </div>
                <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                  Try Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
