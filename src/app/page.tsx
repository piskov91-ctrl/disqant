import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";
import { Code2, MonitorSmartphone, Shirt } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section
          aria-label="Home hero"
          className="bg-black text-white [background:radial-gradient(ellipse_80%_60%_at_15%_0%,rgba(124,58,237,0.12),transparent),radial-gradient(ellipse_60%_50%_at_90%_20%,rgba(236,72,153,0.08),transparent),#000000]"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24 lg:py-28">
            <div className="grid min-h-[min(70vh,640px)] items-center gap-14 md:grid-cols-2 md:gap-12 lg:gap-16">
              <div className="flex min-h-0 max-w-xl flex-col justify-center">
                <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
                  Your online fitting room
                </h1>
                <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">
                  Shoppers try on clothes before they buy. You get fewer returns and more sales. One line of code.
                </p>
                <a
                  href="#how-it-works"
                  className="mt-10 inline-flex w-fit items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Get started
                </a>
              </div>

              <div className="relative w-full min-h-0">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                  <video
                    className="absolute inset-0 h-full w-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    controls={false}
                    aria-label="Disquant product demo"
                  >
                    <source src="/demo-video.mp4" type="video/mp4" />
                  </video>
                  <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-surface-border bg-surface-muted/40 py-20"
        >
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
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">Under 30 seconds</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">
                  Average time for a shopper to try on a garment
                </div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">1 line of code</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">
                  All it takes to add virtual try-on to your store
                </div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="text-4xl font-semibold tracking-tight text-zinc-900">Any website</div>
                <div className="mt-2 text-sm font-medium text-zinc-700">
                  Works with Shopify, WooCommerce, and custom stores
                </div>
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
                  Try Wear Me
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
