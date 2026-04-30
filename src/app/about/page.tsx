import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-[150px]">
        {/* HERO */}
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
              About
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">About Fit Room</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              We build practical tools for fashion retailers—starting with virtual try-on that feels believable, fast, and
              easy to add to a product page.
            </p>
          </div>
        </section>

        {/* OUR MISSION */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Our mission</h2>
            <p className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Why we built this
            </p>
            <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-600 md:text-base">
              <p>
                We started Fit Room because shopping for clothes online still depends on guesswork. Shoppers squint at
                photos, read reviews, and hope for the best—then a chunk of orders come back when reality doesn&apos;t
                match expectations.
              </p>
              <p>
                Our mission is to give UK online retailers a simple way to add virtual try-on to the product page, so
                customers can make better decisions before they pay. The goal isn&apos;t novelty—it&apos;s confidence.
              </p>
              <p>
                We care about the boring stuff too: easy integration, clear usage, and a shopper experience that feels
                normal, not like a science experiment.
              </p>
            </div>
          </div>
        </section>

        {/* THE PROBLEM WE SOLVE */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">The problem we solve</h2>
            <p className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Online returns and shopper confidence
            </p>
            <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-600 md:text-base">
              <p>
                Returns are expensive in ways that don&apos;t always show up in a single line item: restocking, support
                tickets, lost margin, and the quiet damage to customer trust.
              </p>
              <p>
                A lot of those returns start with a simple mismatch—what the shopper imagined versus what arrived. Virtual
                try-on doesn&apos;t fix every fit issue, but it helps people feel more sure about what they&apos;re
                choosing, which can reduce returns and protect margin.
              </p>
              <p>
                For store teams, the win is also operational: fewer “it looked different on me” conversations, fewer
                emotional refund requests, and a clearer story on the PDP about what the product is for.
              </p>
            </div>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Who we are</h2>
            <p className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              A small team passionate about fashion tech
            </p>
            <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-600 md:text-base">
              <p>
                We&apos;re a small team with a mix of retail instincts and product engineering habits. We&apos;ve seen
                what it&apos;s like to launch campaigns on tight calendars, keep conversion healthy, and keep support
                from getting overwhelmed.
              </p>
              <p>
                That&apos;s why we build with retailers in mind: the people managing Shopify themes, the teams running
                WooCommerce with custom plugins, and the founders who still answer customer emails on Sunday night.
              </p>
              <p>
                We don&apos;t pretend virtual try-on is magic. We treat it as a product decision: if it doesn&apos;t
                help shoppers feel clearer, it doesn&apos;t belong on the page.
              </p>
            </div>
          </div>
        </section>

        {/* OUR VALUES */}
        <section className="border-y border-surface-border bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Our values</h2>
            <p className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Simplicity, innovation, accessibility
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Simplicity</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Retail moves fast. We aim for clear defaults, honest copy, and flows that don&apos;t require a manual.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Innovation</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  We use modern AI where it helps shoppers—but we measure success in business outcomes, not buzzwords.
                </p>
              </div>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900">Accessibility</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Try-on should feel approachable: camera or gallery, mobile-first, and language that doesn&apos;t talk
                  down to customers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-surface-border bg-white p-10 shadow-sm md:p-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">Contact</h2>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Talk to us</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base">
                If you&apos;re a UK retailer thinking about virtual try-on, we&apos;re happy to answer practical
                questions—how it installs, what shoppers experience, and what to measure after you go live.
              </p>
              <div className="mt-6">
                <a className="btn-accent-gradient" href="mailto:hello@fit-room.com">
                  hello@fit-room.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
