import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";
import {
  Camera,
  Code2,
  Gauge,
  Globe,
  Laptop2,
  Sparkles,
  Upload,
} from "lucide-react";

export default function ProductPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        {/* HERO */}
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              What is Disqant?
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              A virtual try-on widget that lets shoppers see themselves wearing your products — before they buy.
            </p>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">The problem</h2>
              <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
                Most shoppers hesitate before buying clothes online. They can&apos;t try them on, they&apos;re
                not sure how they&apos;ll look, and when it doesn&apos;t feel right — they return it. That costs
                your store time, money, and trust.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Virtual try-on, without the friction
            </p>

            <ol className="mt-14 grid gap-6 md:grid-cols-2">
              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Code2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">You add one line of code to your store</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Drop in the snippet once, and you&apos;re ready to go—no long setup calls, no waiting around.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Laptop2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    A &apos;Wear Me&apos; button appears on every product image
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Shoppers see it right where they&apos;re already browsing—on the PDP, next to the photos.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Camera className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Shoppers upload a photo or use their camera
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    They can use a photo they already have or take one on the spot—whatever feels easiest.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    AI shows them wearing your product in seconds
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    They get a quick, believable preview—so they feel confident clicking “buy”.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">Features</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Everything you need to ship try-on
            </p>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Globe className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Works on any website</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Add try-on without rebuilding your site—Shopify, WooCommerce, or custom.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Laptop2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">No app needed</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Fewer drop-offs—shoppers stay on your product page and keep moving toward checkout.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Upload className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Camera or gallery</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  More people complete try-on when they can use the option that feels most comfortable.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">AI powered</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Give shoppers a believable preview that helps them buy with confidence.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Gauge className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Usage tracking</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Stay in control of costs and performance with clear usage per client.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Code2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">One line of code</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Launch fast—perfect for lean teams that don&apos;t want a long integration project.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CODE EXAMPLE */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Code example</h2>
            <p className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Install in seconds
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950 shadow-sm">
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-zinc-100">
                <code>
                  {`<script async src="https://www.disqant.com/widget.js" data-disqant-key="YOUR_KEY"></script>`}
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">FAQ</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Quick answers
            </p>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Does it work on mobile?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Yes—mobile is fully supported. It works on iPhone, Android, tablets, and desktop.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">How long does it take to install?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Usually under 5 minutes. If you can paste a snippet into your theme, you can install Disqant.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">
                  What happens when usage limit is reached?
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  We show a friendly message to shoppers and pause further try-ons for that key. You&apos;ll be
                  notified so you can top up or upgrade—no surprises.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Is my API key safe?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Yes. Your key is used to identify your store for usage and billing—your private provider keys
                  stay on the server and aren&apos;t shown to shoppers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-14">
              <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                    Ready to add virtual try-on to your store?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
                    Try the demo experience end-to-end and see how it fits your product pages.
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

