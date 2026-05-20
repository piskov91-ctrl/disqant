import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { SubscriptionsFeedbackSection } from "./SubscriptionsFeedbackSection";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Choose a Wear Me plan for your store.",
};

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function SubscriptionsPage(props: PageProps) {
  const q = await props.searchParams;

  let checkoutBanner: ReactNode = null;
  if (q.checkout === "success") {
    checkoutBanner = (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-emerald-800/70 bg-emerald-950/40 px-5 py-4 text-sm leading-relaxed text-emerald-100 md:mt-14">
        <p className="font-semibold text-emerald-50">Payment successful</p>
        <p className="mt-2 text-emerald-100/90">
          Your subscription is confirmed. Try-on quota and dashboard access are updated shortly after Stripe notifies
          us—refresh the dashboard in a moment if your API key is not visible yet.
        </p>
      </div>
    );
  } else if (q.checkout === "cancelled") {
    checkoutBanner = (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-sm leading-relaxed text-zinc-200 md:mt-14">
        Checkout was cancelled—no charges were made. You can choose a plan again whenever you&apos;re ready.
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="relative min-h-dvh pt-[var(--site-header-height)]">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center md:py-20">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
            Subscriptions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#F5EDE4]/75">
            Pick a plan that fits your try-on volume. All plans include core Wear Me features and integration support.
          </p>
          {checkoutBanner}
        </div>
        <Testimonials tone="dark" />
        <Pricing sectionId="" />
        <SubscriptionsFeedbackSection />
      </main>
      <Footer />
    </>
  );
}
