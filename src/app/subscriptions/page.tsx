import type { Metadata } from "next";
import Link from "next/link";
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
      <main className="pt-20">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center md:py-20">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            Subscriptions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
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
