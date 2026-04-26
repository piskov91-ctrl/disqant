import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AnimatedShaderBackground } from "@/components/AnimatedShaderBackground";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <AnimatedShaderBackground />
      </div>
      <div className="relative z-10">
        <Header />
        <main className="pt-16">
          <section
            aria-label="Home hero"
            className="relative min-h-[calc(100dvh-4rem)] overflow-hidden text-white"
          >
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_90%_80%_at_50%_45%,transparent_25%,rgba(0,0,0,0.5)_100%)]"
              aria-hidden
            />
            <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-24 lg:py-28">
              <div className="grid min-h-[min(70vh,640px)] items-center gap-20 md:grid-cols-[0.82fr_1.45fr] md:items-center md:gap-28 lg:gap-32">
                <div className="flex min-h-0 max-w-xl flex-col justify-center pr-2 md:-ml-1 md:pr-8 lg:-ml-2 lg:pr-12">
                  <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
                    Your online fitting room
                  </h1>
                  <p className="mt-6 text-base leading-relaxed text-zinc-400 sm:text-lg">
                    Shoppers try on clothes before they buy. You get fewer returns and more sales. One
                    line of code.
                  </p>
                  <Link
                    href="/how-it-works"
                    className="mt-10 inline-flex w-fit items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                  >
                    Get started
                  </Link>
                </div>

                <div className="relative flex w-full min-w-0 justify-center pl-2 md:justify-end md:pl-16 lg:pl-24 xl:pl-28">
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
      </div>
    </>
  );
}
