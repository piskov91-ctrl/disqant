import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatYouNeedToDoSteps } from "@/components/WhatYouNeedToDoSteps";
import { Pricing } from "@/components/Pricing";
import type { TestimonialSlide } from "@/components/TestimonialsSlideshow";
import { listApprovedSubscriptionsFeedback } from "@/lib/subscriptionsFeedbackStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { SubscriptionsFeedbackSection } from "./SubscriptionsFeedbackSection";
import { SubscriptionsSubscriberTestimonials } from "./SubscriptionsSubscriberTestimonials";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "Choose a Wear Me plan for your store.",
};

/** Approved testimonials come from Redis — never serve a cached page with stale moderator deletes. */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function SubscriptionsPage(props: PageProps) {
  const q = await props.searchParams;
  const retailerUser = await getRetailerSessionUser();

  const approvedRows = await listApprovedSubscriptionsFeedback(80).catch(() => []);
  const subscriberSlides: TestimonialSlide[] = approvedRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    quote: r.message,
    attribution: `— ${r.storeName}`,
  }));

  let checkoutBanner: ReactNode = null;
  if (q.checkout === "success") {
    checkoutBanner = (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-800/70 bg-emerald-950/40 px-5 py-4 text-sm leading-relaxed text-emerald-100">
        <p className="font-semibold text-emerald-50">Payment successful</p>
        <p className="mt-2 text-emerald-100/90">
          Your subscription is confirmed. Try-on quota and dashboard access are updated shortly after Stripe notifies
          us—refresh the dashboard in a moment if your API key is not visible yet.
        </p>
      </div>
    );
  } else if (q.checkout === "cancelled") {
    checkoutBanner = (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-sm leading-relaxed text-zinc-200">
        Checkout was cancelled—no charges were made. You can choose a plan again whenever you&apos;re ready.
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="relative min-h-dvh pt-[var(--site-header-height)]">
        <section
          className="bg-transparent py-10 md:py-14"
          aria-labelledby="what-you-need-to-do-heading"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-4xl">
              <WhatYouNeedToDoSteps />
            </div>
          </div>
        </section>
        {checkoutBanner ? (
          <div className="mx-auto max-w-6xl px-6 pb-2 md:pb-4">
            {checkoutBanner}
          </div>
        ) : null}
        <Pricing sectionId="" />
        <SubscriptionsSubscriberTestimonials initialSubscriberSlides={subscriberSlides} />
        {retailerUser ? <SubscriptionsFeedbackSection /> : null}
      </main>
      <Footer />
    </>
  );
}
