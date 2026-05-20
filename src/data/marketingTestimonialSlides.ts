import { TESTIMONIAL_REVIEWS } from "./testimonialReviews";

export type TestimonialSlide = {
  id: string;
  rating: number;
  quote: string;
  attribution: string;
};

export const MARKETING_TESTIMONIAL_SLIDES: readonly TestimonialSlide[] = TESTIMONIAL_REVIEWS.map((r, i) => ({
  id: `curated-${r.attribution}-${i}`,
  rating: r.rating,
  quote: r.quote,
  attribution: r.attribution,
}));
