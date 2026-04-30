import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-[150px]">
        <section
          aria-label="Home hero"
          className="relative min-h-[calc(100dvh-150px)] overflow-hidden text-white"
        >
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

                <form action="/demo" className="mt-8 block w-fit sm:mt-10">
                  <button type="submit" className="wear-me-3d-final" aria-label="Wear Me — try the demo">
                    <div className="brushed-surface">
                      <div className="monogram-frame">
                        <svg viewBox="0 0 100 100" className="intertwined-wm">
                          <text x="10" y="72" style={{ fontFamily: "serif", fontSize: "65px", fontWeight: "bold" }}>
                            W
                          </text>
                          <text
                            x="36"
                            y="72"
                            style={{
                              fontFamily: "serif",
                              fontSize: "65px",
                              fontWeight: "bold",
                              opacity: 0.9,
                            }}
                          >
                            M
                          </text>
                        </svg>
                      </div>
                      <span className="btn-text-luxury">WEAR ME</span>
                    </div>
                  </button>
                </form>
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
