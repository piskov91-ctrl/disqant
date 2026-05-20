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
   * When provided, carousel shows **only** approved merchant submissions (Subscriptions page).
   * Omit to show curated marketing quotes (home/stories).
   */
  merchantSlides?: readonly TestimonialSlide[];
  subheading?: string;
  footnote?: string;
};

export function Testimonials({ tone = "light", merchantSlides, subheading, footnote }: TestimonialsProps) {
  const isDark = tone === "dark";

  const curatedSlides: TestimonialSlide[] = TESTIMONIAL_REVIEWS.map((r, i) => ({
    id: `curated-${r.attribution}-${i}`,
    rating: r.rating,
    quote: r.quote,
    attribution: r.attribution,
  }));

  const isMerchantSlot = merchantSlides !== undefined;
  const activeSlides = isMerchantSlot ? merchantSlides : curatedSlides;

  if (isMerchantSlot && activeSlides.length === 0) {
    return null;
  }

  const reviewCount = activeSlides.length;
  const avgFromSlides = reviewCount > 0 ? activeSlides.reduce((acc, r) => acc + r.rating, 0) / reviewCount : 0;
  const displayAverage = isMerchantSlot ? Math.round(avgFromSlides * 10) / 10 : DISPLAY_AVERAGE_OUT_OF_FIVE;

  const defaultFootnote = isMerchantSlot
    ? "Merchant-submitted reviews are approved before appearing here."
    : "Store names are abbreviated for privacy. Reviews reflect feedback from merchants using Wear Me.";

  const effectiveFootnote = footnote ?? defaultFootnote;
  const effectiveSubheading =
    subheading ?? (isMerchantSlot ? "Verified subscriber feedback" : "Real results from shops using Wear Me");

  return (
    <section
      id="testimonials"
      className={`scroll-mt-28 ${
        isDark ? "border-t border-[#C6A77D]/15 bg-transparent py-16 md:py-20" : "bg-white py-24"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
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
          {effectiveSubheading}
        </p>

        {reviewCount > 0 ? (
          <p
            className={`mx-auto mt-6 flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1 text-center text-lg tabular-nums sm:text-xl ${
              isDark ? "text-[#F5EDE4]" : "text-zinc-900"
            }`}
          >
            <span className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-500"}`} aria-hidden>
              ★
            </span>
            <span className="font-semibold">{displayAverage.toFixed(1)} out of 5</span>
            <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>from</span>
            <span className={`font-semibold ${isDark ? "text-[#F5EDE4]" : "text-zinc-900"}`}>{reviewCount}</span>
            <span className={`font-normal ${isDark ? "text-[#F5EDE4]/85" : "text-zinc-600"}`}>reviews</span>
          </p>
        ) : null}

        <p
          className={`mx-auto mt-5 max-w-lg text-center text-sm leading-relaxed ${
            isDark ? "text-[#F5EDE4]/65" : "text-zinc-500"
          }`}
        >
          {effectiveFootnote}
        </p>

        <div className="mt-10 md:mt-12">
          <TestimonialsSlideshow tone={tone} slides={isMerchantSlot ? merchantSlides : undefined} />
        </div>
      </div>
    </section>
  );
}
