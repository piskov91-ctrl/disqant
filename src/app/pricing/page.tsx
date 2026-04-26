import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";
import { UsageLookup } from "@/components/UsageLookup";

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <UsageLookup />
        <section className="border-b border-white/10 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              Pricing
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
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

