import { DemoPanel } from "@/components/DemoPanel";
import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function ProductPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Product
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Photorealistic try-on results, a clean API, and a UI flow that doesn’t get in your way.
            </p>
          </div>
        </section>
        <Features />
        <DemoPanel />
      </main>
      <Footer />
    </>
  );
}

