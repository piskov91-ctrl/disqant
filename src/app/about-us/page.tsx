import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "About Us — Fit Room",
  description:
    "A small London team building Wear Me — a virtual try-on button that lets shoppers see themselves in your clothes before they buy.",
};

const paragraphs = [
  'We are a small team based in London. We built Fit Room because we kept seeing the same problem — fashion stores spending money on ads to get people in, only to lose them to doubt at the last step. "Will this actually look good on me?" That question costs stores more than they realise.',
  "Wear Me is our answer to it. A single button that lets your shoppers see themselves in your clothes before they buy. No complicated setup. No developer required. Just a tool that does one thing well — and does it in seconds.",
  "We built it for independent fashion retailers. The ones who care about every sale. The ones who know their customers and want to give them something the big stores cannot — a personal, confident shopping experience.",
  "We are still a small operation, which means when you write to us, you hear back from us — not a bot, not a ticket system. Just a reply.",
];

export default function AboutUsPage() {
  return (
    <>
      <Header />
      <main className="relative z-10 pt-[var(--site-header-height)]">
        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c6a77d]/40 bg-black/20 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#c6a77d] backdrop-blur-md">
              About Us
            </p>
            <h1 className="on-photo-heading text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
              About Us
            </h1>
            <div className="mt-3 h-px w-24 bg-gradient-to-r from-[#c6a77d]/80 to-transparent" />

            <div className="mt-10 rounded-2xl border border-[#c6a77d]/25 bg-black/20 p-7 shadow-2xl shadow-black/30 backdrop-blur-md md:p-10">
              <div className="space-y-6 text-base leading-relaxed text-zinc-200/90 md:text-lg">
                {paragraphs.map((text) => (
                  <p key={text.slice(0, 32)}>{text}</p>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center">
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
        </section>
      </main>
      <Footer />
    </>
  );
}
