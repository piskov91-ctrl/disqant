import { TestimonialsSlideshow, type TestimonialsSlideshowTone } from "@/components/TestimonialsSlideshow";
import { MARKETING_TESTIMONIAL_SLIDES, type TestimonialSlide } from "@/data/marketingTestimonialSlides";

type TestimonialsProps = {
  tone?: TestimonialsSlideshowTone;
  /**
   * Optional approved merchant submissions (e.g. Subscriptions). Merged into the same slideshow as curated quotes.
   */
  subscriberSlides?: readonly TestimonialSlide[];
  /**
   * Full slide list for the curated portion of the carousel (pending preview + marketing). When omitted, uses default
   * marketing testimonials. Subscriptions merges pending + marketing here; subscriber slides append after.
   */
  marketingCarouselSlides?: readonly TestimonialSlide[];
  /** Override curated subheading (“Real results…”). */
  subheading?: string;
  /** Override curated footnote. */
  footnote?: string;
  /**
   * When true, the marketing carousel from curated marketing testimonials is not rendered (subscriber block only).
   * Subscriptions uses this temporarily while testing the feedback pipeline.
   */
  hideCuratedTestimonials?: boolean;
};

export function Testimonials({
  tone = "light",
  subscriberSlides,
  marketingCarouselSlides,
  subheading,
  footnote,
  hideCuratedTestimonials = false,
}: TestimonialsProps) {
  const isDark = tone === "dark";

  const subscriberList = subscriberSlides ?? [];

  const curatedSlides: TestimonialSlide[] = hideCuratedTestimonials
    ? []
    : marketingCarouselSlides && marketingCarouselSlides.length > 0
      ? [...marketingCarouselSlides]
      : [...MARKETING_TESTIMONIAL_SLIDES];

  const allSlides: TestimonialSlide[] = [...curatedSlides, ...subscriberList];

  if (allSlides.length === 0) {
    return null;
  }

  const displayAvg =
    Math.round((allSlides.reduce((acc, s) => acc + s.rating, 0) / allSlides.length) * 10) / 10;

  const effectiveCuratedSubheading = subheading ?? "Real results from shops using Wear Me";

  const effectiveCuratedFootnote =
    footnote ??
    (subscriberList.length > 0
      ? "Curated quotes plus approved merchant submissions. Store names may be abbreviated for privacy."
      : "Store names are abbreviated for privacy. Reviews reflect feedback from merchants using Wear Me.");

  return (
    <section
      id="testimonials"
      className={`scroll-mt-28 ${
        isDark ? "border-t border-[#C6A77D]/15 bg-transparent py-16 md:py-20" : "bg-white py-24"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#C6A77D]">
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
          <span className="font-semibold">{displayAvg.toFixed(1)} out of 5</span>
        </p>

        <p
          className={`mx-auto mt-5 max-w-lg text-center text-sm leading-relaxed ${
            isDark ? "text-[#F5EDE4]/65" : "text-zinc-500"
          }`}
        >
          {effectiveCuratedFootnote}
        </p>

        <div className="mt-10 md:mt-12">
          <TestimonialsSlideshow tone={tone} slides={allSlides} />
        </div>
      </div>
    </section>
  );
}
