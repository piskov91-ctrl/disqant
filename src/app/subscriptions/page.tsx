import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Choose a Wear Me plan for your store.",
};

export default function SubscriptionsPage() {
  return (
    <>
      <Header />
      <main className="relative min-h-dvh pt-[80px]">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center md:py-20">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
            Subscriptions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#F5EDE4]/75">
            Pick a plan that fits your try-on volume. All plans include core Wear Me features and integration
            support.
          </p>
        </div>
        <Pricing sectionId="" />
      </main>
      <Footer />
    </>
  );
}
