"use client";

import { MarketingTestimonialsWithPendingFeedback } from "@/components/MarketingTestimonialsWithPendingFeedback";
import type { TestimonialSlide } from "@/components/TestimonialsSlideshow";

export function SubscriptionsSubscriberTestimonials({
  initialSubscriberSlides,
}: {
  initialSubscriberSlides: readonly TestimonialSlide[];
}) {
  return (
    <MarketingTestimonialsWithPendingFeedback tone="dark" subscriberSlides={initialSubscriberSlides} />
  );
}
