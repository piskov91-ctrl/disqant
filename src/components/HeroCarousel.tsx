"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/** Exact Unsplash pairs (verified load). Left = product, right = worn. */
const SLIDES = [
  {
    label: "Tops",
    blurb: "Your PDP photo on the left, their mirror snap on the right—no studio reshoot when the colourways change.",
    productSrc: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    wornSrc: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400",
    productAlt: "White T-shirt flat lay",
    wornAlt: "Person wearing a white T-shirt (framed without face)",
  },
  {
    label: "Denim",
    blurb: "Jeans are the worst thing to guess from a flat lay. Showing the drape on someone’s hips beats a size chart essay.",
    productSrc: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
    wornSrc: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400",
    productAlt: "Blue jeans flat lay",
    wornAlt: "Person wearing jeans (framed without face)",
  },
  {
    label: "Outerwear",
    blurb: "Jackets eat margin when they bounce back. A quick preview on their body trims the ‘looked different online’ messages.",
    productSrc: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400",
    wornSrc: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=400",
    productAlt: "Black jacket flat lay",
    wornAlt: "Person wearing a black jacket (framed without face)",
  },
] as const;

const AUTO_MS = 7000;

/** Stable box for Next/Image `fill` — flex parents need explicit aspect + relative. */
function SlidePhoto({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[4/5] w-full min-h-[200px] bg-zinc-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 28vw"
        priority={priority}
      />
    </div>
  );
}

function TransformArrow() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2 md:min-h-[200px] md:py-4" aria-hidden>
      <div className="hidden h-px w-10 bg-gradient-to-r from-zinc-200 via-[#7c3aed] to-[#ec4899] md:block" />
      <div className="rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] p-[2px] shadow-accent-glow">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white md:h-12 md:w-12">
          <span className="hidden bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-2xl font-bold text-transparent animate-hero-arrow-x md:inline-block">
            →
          </span>
          <span className="inline-block bg-gradient-to-b from-[#7c3aed] to-[#ec4899] bg-clip-text text-2xl font-bold text-transparent animate-hero-arrow-y md:hidden">
            ↓
          </span>
        </div>
      </div>
      <div className="hidden h-px w-10 bg-gradient-to-r from-[#ec4899] via-[#7c3aed] to-zinc-200 md:block" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Try on</span>
    </div>
  );
}

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
      aria-label="Product try-on examples"
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

        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl md:leading-[1.12]">
          See it on you before you buy it
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
          <span className="font-medium text-zinc-800">{slide.label}.</span> {slide.blurb}
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
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Example pairs use stock photos—the right column is cropped or shot so faces aren’t in frame.
        </p>

        <div className="relative mx-auto mt-12 w-full max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-xl shadow-zinc-200/70">
            <div className="flex flex-col md:flex-row md:items-stretch">
              {/* Product */}
              <figure className="relative flex min-h-0 flex-1 flex-col bg-zinc-50">
                <figcaption className="border-b border-surface-border bg-white px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Product
                </figcaption>
                <SlidePhoto
                  src={slide.productSrc}
                  alt={slide.productAlt}
                  priority={index === 0}
                />
              </figure>

              {/* Arrow */}
              <div className="flex shrink-0 items-center justify-center border-y border-surface-border bg-surface-muted/30 px-4 py-2 md:w-[5.5rem] md:flex-col md:border-x md:border-y-0 md:px-0 md:py-0">
                <TransformArrow />
              </div>

              {/* Result */}
              <figure className="relative flex min-h-0 flex-1 flex-col bg-zinc-50">
                <figcaption className="border-b border-surface-border bg-white px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  On you
                </figcaption>
                <SlidePhoto
                  src={slide.wornSrc}
                  alt={slide.wornAlt}
                  priority={index === 0}
                />
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
                    aria-label={`${SLIDES[i].label} example`}
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
    </section>
  );
}
