"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const SLIDES = [
  {
    headline: "Let shoppers see the jacket before they commit",
    description:
      "Pair a quick phone snap with any coat from your feed. They get a realistic preview; you get fewer “wrong colour” returns.",
    beforeSrc:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=640&h=800&q=80",
    afterSrc:
      "https://images.unsplash.com/photo-1495385794364-5bde2b47701d?auto=format&fit=crop&w=640&h=800&q=80",
    beforeAlt: "Woman in a plain top, neutral background",
    afterAlt: "Woman in a styled outfit outdoors",
  },
  {
    headline: "Same customer, new look—no reshoot",
    description:
      "When the brief changes mid-season, you shouldn’t need another studio day. Swap the garment in the flow and keep the page fresh.",
    beforeSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&h=800&q=80",
    afterSrc:
      "https://images.unsplash.com/photo-1617137968427-85924c2a50e2?auto=format&fit=crop&w=640&h=800&q=80",
    beforeAlt: "Man in a simple casual shirt",
    afterAlt: "Man in a layered outfit with jacket",
  },
  {
    headline: "From “maybe” to “that’s the one”",
    description:
      "Denim fits are awkward online. Showing the drape on their body—not a model who’s six inches taller—quietly lifts conversion.",
    beforeSrc:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=640&h=800&q=80",
    afterSrc:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=640&h=800&q=80",
    beforeAlt: "Person in a light top, studio-style shot",
    afterAlt: "Person in full street-style outfit",
  },
  {
    headline: "Outerwear without the guesswork",
    description:
      "Bulky layers are the worst to judge from a flat lay. A try-on preview answers the obvious question: how will this actually sit?",
    beforeSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=640&h=800&q=80",
    afterSrc:
      "https://images.unsplash.com/photo-14839883588185-ef41fcf0acd4?auto=format&fit=crop&w=640&h=800&q=80",
    beforeAlt: "Woman facing camera in a simple top",
    afterAlt: "Woman in a coat outdoors",
  },
] as const;

const AUTO_MS = 6500;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir: -1 | 1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(t);
  }, [paused, go]);

  const slide = SLIDES[index];

  return (
    <section
      className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24"
      aria-roledescription="carousel"
      aria-label="Product examples"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fade bg-[length:64px_64px] opacity-40"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.55)]" />
          Virtual try-on for retailers
        </p>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0">
            <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl md:leading-[1.12]">
              {slide.headline}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-600 md:text-xl">
              {slide.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/demo" className="btn-accent-gradient h-12 px-8 text-center sm:inline-flex">
                Try the demo
              </Link>
              <a
                href="#pricing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-surface-border bg-white px-8 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-surface-raised"
              >
                See pricing
              </a>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-zinc-500">
              Photos are stock examples to show the idea—your shoppers use their own picture and your SKU.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-xl shadow-zinc-200/70">
              <div className="grid grid-cols-2 gap-px bg-zinc-200">
                <figure className="relative aspect-[3/4] bg-zinc-100">
                  <Image
                    src={slide.beforeSrc}
                    alt={slide.beforeAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 320px"
                    priority={index === 0}
                  />
                  <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10 text-center text-[11px] font-semibold uppercase tracking-wider text-white">
                    Before
                  </figcaption>
                </figure>
                <figure className="relative aspect-[3/4] bg-zinc-100">
                  <Image
                    src={slide.afterSrc}
                    alt={slide.afterAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 320px"
                    priority={index === 0}
                  />
                  <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10 text-center text-[11px] font-semibold uppercase tracking-wider text-white">
                    After
                  </figcaption>
                </figure>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-surface-border bg-surface-muted/50 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-surface-border bg-white text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-surface-raised"
                  aria-label="Previous slide"
                >
                  ←
                </button>
                <div className="flex flex-1 items-center justify-center gap-1.5" role="tablist" aria-label="Slides">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === index ? "w-8 bg-gradient-to-r from-[#7c3aed] to-[#ec4899]" : "w-2 bg-zinc-300 hover:bg-zinc-400"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-surface-border bg-white text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-surface-raised"
                  aria-label="Next slide"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
