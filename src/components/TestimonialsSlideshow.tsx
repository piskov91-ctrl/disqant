"use client";

import { useCallback, useEffect, useState } from "react";
import { TESTIMONIAL_REVIEWS } from "@/data/testimonialReviews";

export type TestimonialsSlideshowTone = "light" | "dark";

const INTERVAL_MS = 3000;
const STAR_MAX = 5;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function Stars({ rating, filledClass, emptyClass }: { rating: number; filledClass: string; emptyClass: string }) {
  return (
    <div role="img" aria-label={`${rating} out of ${STAR_MAX} stars`} className="flex gap-0.5 text-lg leading-none">
      {Array.from({ length: STAR_MAX }, (_, i) =>
        i < rating ? (
          <span key={i} className={filledClass} aria-hidden>
            ★
          </span>
        ) : (
          <span key={i} className={emptyClass} aria-hidden>
            ☆
          </span>
        ),
      )}
    </div>
  );
}

export function TestimonialsSlideshow({
  tone = "light",
  className = "",
}: {
  tone?: TestimonialsSlideshowTone;
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const len = TESTIMONIAL_REVIEWS.length;

  const goPrev = useCallback(() => setIndex((i) => (i <= 0 ? len - 1 : i - 1)), [len]);
  const goNext = useCallback(() => setIndex((i) => (i >= len - 1 ? 0 : i + 1)), [len]);

  useEffect(() => {
    if (prefersReducedMotion || len <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i >= len - 1 ? 0 : i + 1));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, len]);

  const current = TESTIMONIAL_REVIEWS[index];
  const starTone =
    tone === "dark"
      ? { filled: "text-amber-400", empty: "text-[#F5EDE4]/25" }
      : { filled: "text-amber-500", empty: "text-zinc-200" };

  return (
    <div
      className={className}
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews slideshow"
    >
      <div className="relative px-11 sm:px-14 md:px-16">
        <button
          type="button"
          onClick={goPrev}
          className={
            tone === "dark"
              ? "absolute left-0 top-1/2 z-[1] -translate-y-1/2 rounded-lg border border-[#C6A77D]/30 bg-black/35 p-2.5 text-[#F5EDE4]/90 backdrop-blur-sm transition hover:border-[#C6A77D]/50 hover:bg-black/45"
              : "absolute left-0 top-1/2 z-[1] -translate-y-1/2 rounded-lg border border-surface-border bg-white p-2.5 text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          }
          aria-label="Previous review"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          onClick={goNext}
          className={
            tone === "dark"
              ? "absolute right-0 top-1/2 z-[1] -translate-y-1/2 rounded-lg border border-[#C6A77D]/30 bg-black/35 p-2.5 text-[#F5EDE4]/90 backdrop-blur-sm transition hover:border-[#C6A77D]/50 hover:bg-black/45"
              : "absolute right-0 top-1/2 z-[1] -translate-y-1/2 rounded-lg border border-surface-border bg-white p-2.5 text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          }
          aria-label="Next review"
        >
          <Chevron dir="right" />
        </button>

        <article
          aria-live={prefersReducedMotion ? undefined : "polite"}
          className={`mx-auto min-h-[220px] max-w-3xl rounded-2xl border px-8 py-8 shadow-sm sm:min-h-[200px] sm:px-10 sm:py-10 ${
            tone === "dark"
              ? "border-[#C6A77D]/20 bg-black/35 backdrop-blur-sm"
              : "border-surface-border bg-white"
          }`}
        >
          <Stars rating={current.rating} filledClass={starTone.filled} emptyClass={starTone.empty} />
          <blockquote
            key={`slide-${index}`}
            className={`mt-5 text-pretty ${prefersReducedMotion ? "" : "animate-testimonial-slide"} ${
              tone === "dark" ? "text-[#F5EDE4]/90" : "text-zinc-700"
            } text-base leading-relaxed sm:text-lg`}
          >
            <p>&ldquo;{current.quote}&rdquo;</p>
            <footer className={`mt-6 text-sm font-medium not-italic ${tone === "dark" ? "text-[#F5EDE4]/60" : "text-zinc-900"}`}>
              {current.attribution}
            </footer>
          </blockquote>
        </article>
      </div>

      <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Choose review slide">
        {TESTIMONIAL_REVIEWS.map((r, i) => (
          <button
            key={`${r.attribution}-${i}`}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}: ${r.attribution.replace(/^—\s*/, "")}`}
            onClick={() => setIndex(i)}
            className={
              i === index
                ? tone === "dark"
                  ? "h-2 w-8 rounded-full bg-[#C6A77D]"
                  : "h-2 w-8 rounded-full bg-accent"
                : tone === "dark"
                  ? "h-2 w-2 rounded-full bg-[#F5EDE4]/30 transition hover:bg-[#F5EDE4]/50"
                  : "h-2 w-2 rounded-full bg-zinc-300 transition hover:bg-zinc-400"
            }
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {dir === "left" ? (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
