import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Testimonials } from "@/components/Testimonials";

export default function StoriesPage() {
  return (
    <>
      <Header />
      <main className="pt-[120px]">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Stories
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              What teams care about after the novelty wears off: fewer returns, a smoother PDP, and less friction in
              support.
            </p>
          </div>
        </section>
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}

