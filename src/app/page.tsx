import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section
          aria-label="Home hero"
          className="min-h-[calc(100dvh-4rem)] bg-black text-white [background:radial-gradient(ellipse_80%_60%_at_15%_0%,rgba(124,58,237,0.12),transparent),radial-gradient(ellipse_60%_50%_at_90%_20%,rgba(236,72,153,0.08),transparent),#000000]"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24 lg:py-28">
            <div className="grid min-h-[min(70vh,640px)] items-center gap-12 md:grid-cols-[1fr_1.22fr] md:items-center md:gap-10 lg:gap-14">
              <div className="flex min-h-0 max-w-xl flex-col justify-center">
                <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
                  Your online fitting room
                </h1>
                <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">
                  Shoppers try on clothes before they buy. You get fewer returns and more sales. One line of code.
                </p>
                <Link
                  href="/how-it-works"
                  className="mt-10 inline-flex w-fit items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Get started
                </Link>
              </div>

              <div className="relative flex w-full min-w-0 justify-center">
                <video
                  className="h-auto w-full max-h-[min(41vh,476px)] object-contain sm:max-h-[min(45vh,532px)] md:max-h-[min(59.5vh,672px)]"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  controls={false}
                  aria-label="Disquant product demo"
                >
                  <source src="/demo-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
