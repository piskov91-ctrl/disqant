"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Testimonials } from "@/components/Testimonials";
import type { TestimonialsSlideshowTone } from "@/components/TestimonialsSlideshow";
import {
  MARKETING_TESTIMONIAL_SLIDES,
  type TestimonialSlide,
} from "@/data/marketingTestimonialSlides";
import {
  readPendingFeedbackPreviewSlides,
  stripPendingPreviewsWhoseIdsAreApproved,
  SUBSCRIPTIONS_PENDING_FEEDBACK_EVENT,
  SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY,
} from "@/lib/subscriptionsPendingFeedbackPreview";

type MarketingTestimonialsWithPendingFeedbackProps = {
  tone?: TestimonialsSlideshowTone;
  /** Server-loaded Redis-approved slides (home + subscriptions). Merged into the carousel after pending preview + marketing quotes. */
  subscriberSlides?: readonly TestimonialSlide[];
};

/**
 * Prepends short-lived pending previews (localStorage) ahead of marketing quotes when present; merges **subscriberSlides**
 * from Redis (approved by admin) at the end via {@link Testimonials} so they stay permanently alongside hardcoded quotes.
 */
export function MarketingTestimonialsWithPendingFeedback({
  tone = "light",
  subscriberSlides,
}: MarketingTestimonialsWithPendingFeedbackProps) {
  const [pendingSlides, setPendingSlides] = useState<TestimonialSlide[]>(() =>
    typeof window !== "undefined" ? readPendingFeedbackPreviewSlides() : [],
  );

  const refreshPending = useCallback(() => {
    setPendingSlides(readPendingFeedbackPreviewSlides());
  }, []);

  useEffect(() => {
    const ids = subscriberSlides?.map((s) => s.id) ?? [];
    stripPendingPreviewsWhoseIdsAreApproved(ids);
    refreshPending();
  }, [subscriberSlides, refreshPending]);

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

  const approvedIdSet = useMemo(
    () => new Set((subscriberSlides ?? []).map((s) => s.id)),
    [subscriberSlides],
  );

  const pendingWithoutApprovedDupes = useMemo(
    () => pendingSlides.filter((s) => !approvedIdSet.has(s.id)),
    [pendingSlides, approvedIdSet],
  );

  const marketingCarouselSlides = useMemo(() => {
    if (pendingWithoutApprovedDupes.length === 0) return undefined;
    return [...pendingWithoutApprovedDupes, ...MARKETING_TESTIMONIAL_SLIDES];
  }, [pendingWithoutApprovedDupes]);

  return (
    <Testimonials
      tone={tone}
      {...(marketingCarouselSlides ? { marketingCarouselSlides } : {})}
      subscriberSlides={subscriberSlides}
    />
  );
}
