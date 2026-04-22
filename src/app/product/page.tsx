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
              Disqant is a virtual try-on widget that helps shoppers see themselves wearing your products—before
              they buy. It&apos;s built for UK online retailers who want an easy integration, fewer returns, and
              more confident checkouts.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                Try Demo
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

        {/* HOW IT WORKS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              The simplest way to add virtual try-on
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 md:text-base">
              You don&apos;t need a new app, a new checkout, or a big rebuild. You just add the widget, and your
              product pages do the rest.
            </p>

            <ol className="mt-14 grid gap-6 md:grid-cols-2">
              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Code2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Add one line of code</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Paste the install snippet into your store theme and you&apos;re done. That&apos;s the easy
                    integration.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Laptop2 className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    Your product pages get a “Wear Me” button
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    It shows up where it matters—right next to your product photos—so shoppers actually use it.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Camera className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Shoppers use camera or gallery</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Some people prefer a quick camera photo. Others use a saved image. Either way is fine.
                  </p>
                </div>
              </li>

              <li className="flex gap-4 rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">They see the try-on in seconds</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Our AI fashion technology creates a realistic preview fast—helping you increase conversions
                    and reduce returns.
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
                  Keep your current setup. Disqant works with Shopify, WooCommerce, and custom stores.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Laptop2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">No app needed</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Shoppers don&apos;t have to download anything. That means fewer drop-offs and more completed
                  try-ons.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Upload className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Camera or gallery</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Let shoppers choose what&apos;s easiest. More try-ons usually means more confident purchases.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">AI powered</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  AI fashion technology that helps shoppers feel sure about fit and style—so you can increase
                  conversions.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Gauge className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">Usage tracking</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  See usage per client at a glance—so you can manage budgets and spot what&apos;s working.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Code2 className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">One line of code</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Quick to launch, easy to maintain. Perfect when you want results without a long project.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WHY IT MATTERS */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
                Why smart retailers are adding virtual try-on now
              </h2>
              <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
                We&apos;re seeing UK online retailers treat virtual try-on less like a “nice-to-have” and more
                like part of a modern product page. When shoppers can quickly see a garment on themselves, they
                hesitate less. That usually means you increase conversions, reduce returns, and build trust—because
                customers feel like they know what they&apos;re buying.
              </p>
              <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-600 md:text-base">
                Disqant is designed to make that upgrade feel easy: an easy integration, a familiar “Wear Me”
                moment on the PDP, and AI fashion technology doing the heavy lifting in the background.
              </p>
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
                  Yes. Most try-ons happen on mobile, so we made sure it works great on iPhone and Android (and
                  of course tablet + desktop too).
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">How long does it take to install?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Usually under 5 minutes. If you can paste a snippet into your theme (or ask your dev to), you
                  can get it live.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">
                  What happens when usage limit is reached?
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  We show a friendly message to shoppers and pause try-ons for that key, so nothing breaks on your
                  site. Then you can top up or upgrade when you&apos;re ready.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Is my API key safe?</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Yes. Your Disqant key identifies your store and tracks usage. Shoppers never see your private
                  provider keys—they stay server-side.
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
                    Try the demo and picture it on your product pages. It&apos;s the quickest way to see if it
                    feels right for your brand.
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

