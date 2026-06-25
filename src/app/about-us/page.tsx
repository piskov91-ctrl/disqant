import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "About Us — Fit Room",
  description:
    "Fit Room helps independent fashion retailers turn hesitation into confident purchases with virtual try-on — no app, no complicated setup, live in minutes.",
};

const whyChooseFitRoom = [
  "Give shoppers more confidence before purchasing",
  "Create a more personal shopping experience",
  "Reduce hesitation during checkout",
  "Offer something unique that larger retailers often cannot",
  "Go live with minimal setup",
] as const;

function SectionDivider() {
  return (
    <div
      className="my-12 h-px w-full bg-gradient-to-r from-transparent via-[#C6A77D]/25 to-transparent md:my-14"
      aria-hidden
    />
  );
}

export default function AboutUsPage() {
  return (
    <>
      <Header />
      <main className="relative z-10 pt-[var(--site-header-height)]">
        <article className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C6A77D]/40 bg-black/20 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#C6A77D] backdrop-blur-md">
              About Us
            </p>

            <h1
              className="max-w-2xl font-serif text-4xl font-normal leading-[1.15] tracking-tight text-white md:text-5xl md:leading-[1.12]"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              Built for{" "}
              <span className="text-[#C6A77D]">independent fashion retailers</span>.
            </h1>

            <div
              className="mt-5 h-px w-28 bg-gradient-to-r from-[#C6A77D]/80 to-transparent"
              aria-hidden
            />

            <div
              className="mt-12 space-y-6 text-base leading-[1.8] text-zinc-300/95 md:text-lg md:leading-[1.75]"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              <p>We built Fit Room because we kept seeing the same problem.</p>
              <p>
                Fashion stores spend time, effort and money bringing customers to their websites,
                only to lose them at the final step.
              </p>
              <p className="font-serif text-xl leading-snug text-[#C6A77D] md:text-2xl">
                The question is always the same: &ldquo;Will this actually look good on me?&rdquo;
              </p>
              <p>
                That small moment of doubt leads to abandoned carts, lost sales and customers who
                never return.
              </p>
              <p>
                <span className="font-medium text-zinc-100">Fit Room was created</span> to remove
                that uncertainty.
              </p>
              <p>
                By allowing shoppers to see themselves wearing your products before they buy, we help
                fashion stores create a more personal, confident and engaging shopping experience.
              </p>
              <p className="text-zinc-200/90">
                <span className="text-[#C6A77D]">No apps.</span>{" "}
                <span className="text-[#C6A77D]">No complicated setup.</span>{" "}
                <span className="text-[#C6A77D]">No developers required.</span> Just a simple
                experience that works in seconds.
              </p>
            </div>

            <SectionDivider />

            <h2
              className="font-serif text-2xl font-normal tracking-tight text-white md:text-3xl"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              Why stores choose <span className="text-[#C6A77D]">Fit Room</span>:
            </h2>

            <ul
              className="mt-8 space-y-4 text-base leading-relaxed text-zinc-300 md:text-lg"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              {whyChooseFitRoom.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-sm font-semibold text-[#C6A77D]" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <SectionDivider />

            <div
              className="space-y-6 text-base leading-[1.8] text-zinc-300/95 md:text-lg md:leading-[1.75]"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              <p>
                We built Fit Room specifically for{" "}
                <span className="text-[#C6A77D]">independent fashion retailers</span> — the brands
                that care about every customer, every order and every sale.
              </p>
              <p>
                We&apos;re a small team based in London, and when you contact us, you speak directly
                with the people building the product.
              </p>
              <p className="text-zinc-200/90">
                No ticket systems. No automated replies. Just real people building technology for
                modern fashion stores.
              </p>
            </div>

            <div className="mt-14 text-center md:mt-16">
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
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
