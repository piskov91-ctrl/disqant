import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";
import { Code2, MonitorSmartphone, Shirt } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-16">
        {/* CINEMATIC HERO (full-bleed video + overlay) */}
        <section aria-label="Home hero" className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
          <div className="relative min-h-[80vh] w-full bg-black">
            <div className="pointer-events-none flex min-h-[80vh] w-full items-center justify-center">
              <video
                src="/demo-video.mp4"
                className="h-auto w-full max-h-[80vh] object-contain"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                preload="auto"
              />
            </div>

            {/* Cinematic darkening + subtle glow for readable overlay text */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.20),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.20),transparent_50%)]"
              aria-hidden
            />

            <div className="absolute inset-0">
              <div className="absolute left-[5%] top-1/2 w-full max-w-[300px] -translate-y-1/2">
                <h1
                  className="text-balance text-4xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text [text-shadow:0_2px_40px_rgba(0,0,0,0.55)] md:text-6xl md:leading-[1.02]"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Your online fitting room
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/90 [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] max-md:mx-auto md:text-xl md:leading-relaxed">
                  Shoppers try on clothes before they buy. You get fewer returns and more sales. One line of code.
                </p>

                <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 self-center sm:flex-row sm:items-center sm:justify-center md:max-w-none md:self-start md:justify-start">
                  <Link
                    href="/demo"
                    className="btn-accent-gradient h-12 w-full justify-center px-8 text-center shadow-2xl shadow-black/30 sm:w-auto sm:inline-flex"
                  >
                    See it live
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-md transition hover:bg-white/15 sm:w-auto"
                  >
                    Get started
                  </Link>
                </div>
              </div>
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
