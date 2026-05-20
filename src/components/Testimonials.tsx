import { TestimonialsSlideshow, type TestimonialsSlideshowTone } from "@/components/TestimonialsSlideshow";

export function Testimonials({ tone = "light" }: { tone?: TestimonialsSlideshowTone }) {
  const isDark = tone === "dark";

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
          Real results from shops using Wear Me
        </p>
        <p
          className={`mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed ${
            isDark ? "text-[#F5EDE4]/65" : "text-zinc-500"
          }`}
        >
          Store names are abbreviated for privacy. Reviews reflect feedback from merchants using Wear Me.
        </p>

        <div className="mt-14">
          <TestimonialsSlideshow tone={tone} />
        </div>
      </div>
    </section>
  );
}
