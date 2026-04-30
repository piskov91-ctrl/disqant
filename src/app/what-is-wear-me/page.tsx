import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";

export default function WhatIsWearMePage() {
  return (
    <>
      <Header />
      <main className="pt-[150px]">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              What is Wear Me?
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Wear Me is the shopper-facing side of your virtual try-on: a clear, low-friction way to see how
              a garment looks on them before they buy.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600">
              It runs on your store with minimal integration, keeps the experience on-brand, and is designed
              to reduce returns while lifting conversion. For setup and flow details, see{" "}
              <Link href="/how-it-works" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-600">
                How it works
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
