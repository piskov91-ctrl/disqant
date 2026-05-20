"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Testimonials } from "@/components/Testimonials";
import { MARKETING_TESTIMONIAL_SLIDES, type TestimonialSlide } from "@/components/TestimonialsSlideshow";
import {
  readPendingFeedbackPreviewSlides,
  SUBSCRIPTIONS_PENDING_FEEDBACK_EVENT,
  SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY,
} from "@/lib/subscriptionsPendingFeedbackPreview";

export function SubscriptionsSubscriberTestimonials({
  initialSubscriberSlides,
}: {
  initialSubscriberSlides: readonly TestimonialSlide[];
}) {
  const [pendingSlides, setPendingSlides] = useState<TestimonialSlide[]>(() =>
    typeof window !== "undefined" ? readPendingFeedbackPreviewSlides() : [],
  );

  const refreshPending = useCallback(() => {
    setPendingSlides(readPendingFeedbackPreviewSlides());
  }, []);

  useEffect(() => {
    refreshPending();
    const interval = window.setInterval(refreshPending, 1000);
    const onPendingFeedback = () => refreshPending();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY || e.key === null) {
        refreshPending();
      }
    };
    window.addEventListener(SUBSCRIPTIONS_PENDING_FEEDBACK_EVENT, onPendingFeedback);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(SUBSCRIPTIONS_PENDING_FEEDBACK_EVENT, onPendingFeedback);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshPending]);

  const marketingCarouselSlides = useMemo(
    () => [...pendingSlides, ...MARKETING_TESTIMONIAL_SLIDES],
    [pendingSlides],
  );

  return (
    <Testimonials
      tone="dark"
      marketingCarouselSlides={marketingCarouselSlides}
      subscriberSlides={initialSubscriberSlides}
    />
  );
}
