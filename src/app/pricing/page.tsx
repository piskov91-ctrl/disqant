import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";

export const metadata: Metadata = {
  title: "Subscriptions",
  description:
    "Choose a Wear Me subscription that fits your store—try-on bundles, support tiers, and enterprise options.",
};

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="relative min-h-dvh pt-40">
        <section className="border-b border-[#C6A77D]/15 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#F5EDE4] md:text-5xl">
              Subscriptions
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#F5EDE4]/75">
              Transparent try-on plans that scale with your store. Upgrade when you are ready.
            </p>
          </div>
        </section>
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
