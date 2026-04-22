import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              How it works
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              A simple flow your customers already know: pick something, upload a photo, and see the result.
            </p>
          </div>
        </section>
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}

