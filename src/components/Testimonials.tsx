import {
  DISPLAY_AVERAGE_OUT_OF_FIVE,
  TESTIMONIAL_REVIEWS,
} from "@/data/testimonialReviews";
import {
  TestimonialsSlideshow,
  type TestimonialSlide,
  type TestimonialsSlideshowTone,
} from "@/components/TestimonialsSlideshow";

type TestimonialsProps = {
  tone?: TestimonialsSlideshowTone;
  /**
   * Optional approved merchant submissions rendered **below** the curated carousel
   * (Subscriptions page uses this; home/stories omit it).
   */
  subscriberSlides?: readonly TestimonialSlide[];
  /** Override curated subheading (“Real results…”). */
  subheading?: string;
  /** Override curated footnote. */
  footnote?: string;
};

export function Testimonials({
  tone = "light",
  subscriberSlides,
  subheading,
  footnote,
}: TestimonialsProps) {
  const isDark = tone === "dark";
  const curatedReviewCount = TESTIMONIAL_REVIEWS.length;

  const effectiveCuratedFootnote =
    footnote ??
    "Store names are abbreviated for privacy. Reviews reflect feedback from merchants using Wear Me.";
  const effectiveCuratedSubheading = subheading ?? "Real results from shops using Wear Me";

  const subscriberList = subscriberSlides ?? [];
  const hasSubscriberSlides = subscriberList.length > 0;
  const subscriberCount = subscriberList.length;
  const subscriberAvg =
    subscriberCount > 0
      ? Math.round((subscriberList.reduce((acc, r) => acc + r.rating, 0) / subscriberCount) * 10) / 10
      : 0;

  return (
    <section
      id="testimonials"
      className={`scroll-mt-28 ${
        isDark ? "border-t border-[#C6A77D]/15 bg-transparent py-16 md:py-20" : "bg-white py-24"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Curated (always shown) */}
        <h2
          className={`text-center text-sm font-semibold uppercase tracking-widest ${
            isDark ? "text-[#C6A77D]" : "text-accent"
          }`}
        >
          What retailers say
        </h2>
        <p
          className={`mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight md:text-4xl ${
            isDark ? "text-[#F5EDE4]" : "text-zinc-900"
          }`}
        >
          {effectiveCuratedSubheading}
        </p>

        <p
          className={`mx-auto mt-6 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1 text-center text-lg tabular-nums sm:text-xl ${
            isDark ? "text-[#F5EDE4]" : "text-zinc-900"
          }`}
        >
          <span className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-500"}`} aria-hidden>
            ★
          </span>
          <span className="font-semibold">{DISPLAY_AVERAGE_OUT_OF_FIVE.toFixed(1)} out of 5</span>
          <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>from</span>
          <span className={`font-semibold ${isDark ? "text-[#F5EDE4]" : "text-zinc-900"}`}>
            {curatedReviewCount}
          </span>
          <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>reviews</span>
        </p>

        <p
          className={`mx-auto mt-5 max-w-lg text-center text-sm leading-relaxed ${
            isDark ? "text-[#F5EDE4]/65" : "text-zinc-500"
          }`}
        >
          {effectiveCuratedFootnote}
        </p>

        <div className="mt-10 md:mt-12">
          <TestimonialsSlideshow tone={tone} />
        </div>

        {/* Approved subscriber submissions (Subscriptions only — when Redis has approved rows) */}
        {hasSubscriberSlides ? (
          <div
            className={`mt-16 md:mt-20 border-t pt-14 md:pt-16 ${isDark ? "border-[#C6A77D]/15" : "border-surface-border"}`}
            aria-labelledby="subscriber-reviews-heading"
          >
            <h3
              id="subscriber-reviews-heading"
              className={`text-center text-xs font-semibold uppercase tracking-[0.2em] ${
                isDark ? "text-[#d4bc94]" : "text-zinc-500"
              }`}
            >
              Subscriber reviews
            </h3>
            <p
              className={`mx-auto mt-3 max-w-2xl text-center text-2xl font-semibold tracking-tight md:text-3xl ${
                isDark ? "text-[#F5EDE4]" : "text-zinc-900"
              }`}
            >
              Verified feedback from merchants
            </p>

            <p
              className={`mx-auto mt-6 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1 text-center text-lg tabular-nums sm:text-xl ${
                isDark ? "text-[#F5EDE4]" : "text-zinc-900"
              }`}
            >
              <span className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-500"}`} aria-hidden>
                ★
              </span>
              <span className="font-semibold">{subscriberAvg.toFixed(1)} out of 5</span>
              <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>from</span>
              <span className={`font-semibold ${isDark ? "text-[#F5EDE4]" : "text-zinc-900"}`}>
                {subscriberCount}
              </span>
              <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>reviews</span>
            </p>

            <p
              className={`mx-auto mt-5 max-w-lg text-center text-sm leading-relaxed ${
                isDark ? "text-[#F5EDE4]/65" : "text-zinc-500"
              }`}
            >
              Merchant-submitted reviews are approved before appearing here.
            </p>

            <div className="mt-10 md:mt-12">
              <TestimonialsSlideshow tone={tone} slides={subscriberList} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
