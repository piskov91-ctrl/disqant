import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "About Wear Me",
  description:
    "Virtual try-on for your store in one line of code — see how Wear Me turns hesitation into confident purchases.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-[var(--site-header-height)]">
        <section className="border-b border-surface-border bg-white py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#C6A77D]">
              About Wear Me
            </p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              The fitting room your online store never had
            </h1>
          </div>
        </section>

        <section className="border-b border-surface-border bg-surface-muted/40 py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl">What is Wear Me?</h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              <p>
                Wear Me is a virtual try-on button that lives on your product pages. A shopper sees something they
                like, taps Wear Me, takes a quick photo, and in about 20 seconds they see themselves actually wearing it.
                No app. No account. No faff. Just a moment that turns &quot;I wonder if this would suit me&quot; into
                &quot;I&apos;m buying this.&quot;
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-border bg-white py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl">
              Why it matters for your store
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              <p>
                Returns cost you money. Hesitation costs you sales. When someone can see how your clothes look on their own
                body before they buy, both of those problems shrink. They buy with confidence. They keep what they
                ordered. And they remember your store as the one that made shopping feel easy.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-border bg-surface-muted/40 py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl">
              One line of code. That is genuinely it.
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              <p>
                You don&apos;t need a developer on standby. You don&apos;t need to rebuild your website. You paste one
                line of code into your store, save, and the button appears on every product page automatically. If you can
                copy and paste, you can have Wear Me live today.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-border bg-white py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl">
              Built for stores like yours
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              <p>
                Whether you sell 50 products or 5,000, Wear Me works the same way. Small boutiques use it. Growing brands
                use it. The button looks and feels like part of your store, not a third-party add-on.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-surface-border bg-surface-muted/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <Link
              href="/demo"
              className="btn-accent-gradient inline-flex min-w-[12rem] items-center justify-center gap-2 px-8 py-3 text-base font-semibold"
            >
              See it in action
              <span aria-hidden className="text-lg leading-none">
                →
              </span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
