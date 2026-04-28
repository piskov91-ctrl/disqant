import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import Link from "next/link";

/** Hero photo: add <code>public/fittingroom.jpg</code> (adjust path if you use another extension). */
const HOME_HERO_BG = "/fittingroom.jpg";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <section
          aria-label="Home hero"
          className="relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden text-white"
        >
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black">
            <div
              className="absolute inset-0 bg-black bg-cover bg-[center_38%] bg-no-repeat md:bg-contain md:bg-center"
              style={{ backgroundImage: `url("${HOME_HERO_BG}")` }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/52 to-black/78 md:from-black/70 md:via-black/45 md:to-black/68"
              aria-hidden
            />
          </div>
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:py-24 xl:py-28">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-10 lg:gap-14 xl:gap-16">
              <div className="order-1 flex min-w-0 flex-col justify-center">
                <h1 className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.5rem] md:leading-[1.1] lg:text-5xl lg:leading-[1.08]">
                  Your online fitting room
                </h1>

                <p className="mt-8 max-w-[36rem] text-base leading-[1.65] text-zinc-200 sm:mt-10 sm:text-lg sm:leading-[1.7]">
                  Shoppers try on clothes before they buy — reducing returns and boosting sales.
                </p>

                <p className="mt-6 max-w-[36rem] text-base leading-[1.65] text-zinc-200 sm:mt-8 sm:text-lg sm:leading-[1.7]">
                  Wear Me adds a virtual try-on button to your store in minutes. No app, no 3D models, just one
                  line of code.
                </p>

                <p className="mt-6 max-w-[36rem] text-sm leading-relaxed text-zinc-300 sm:mt-8 sm:text-base">
                  Trusted by fashion retailers worldwide.
                </p>

                <Link
                  href="/how-it-works"
                  className="mt-8 inline-flex w-fit min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10 sm:mt-10"
                >
                  Get Started
                </Link>
              </div>

              <div className="order-2 flex w-full min-w-0 justify-center md:justify-end">
                <video
                  className="h-auto w-full max-h-[min(52vh,420px)] max-w-full rounded-2xl object-contain shadow-lg shadow-black/30 sm:max-h-[min(56vh,480px)] md:max-h-[min(62vh,560px)] lg:max-h-[min(68vh,640px)]"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  controls={false}
                  aria-label="Wear Me virtual try-on demo video"
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
