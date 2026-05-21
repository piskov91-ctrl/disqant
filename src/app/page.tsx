import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MarketingTestimonialsWithPendingFeedback } from "@/components/MarketingTestimonialsWithPendingFeedback";
import {
  listApprovedSubscriptionsFeedback,
  mapApprovedSubscriptionsFeedbackToSlides,
} from "@/lib/subscriptionsFeedbackStore";

/** Approved merchant reviews come from Redis — same source as the subscriptions page carousel. */
export const dynamic = "force-dynamic";

export default async function Home() {
  const approvedRows = await listApprovedSubscriptionsFeedback(80).catch(() => []);
  const approvedSubscriberSlides = mapApprovedSubscriptionsFeedbackToSlides(approvedRows);

  return (
    <>
      <Header />
      <main className="pt-[var(--site-header-height)]">
        <section
          aria-label="Home hero"
          className="relative min-h-[calc(100dvh_-_var(--site-header-height))] overflow-hidden text-white"
        >
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:py-24 xl:py-28">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-10 lg:gap-14 xl:gap-16">
              <div className="order-1 flex min-w-0 flex-col justify-center">
                <h1 className="max-w-[min(100%,34rem)] text-balance font-serif text-4xl font-normal leading-[1.12] tracking-tight text-[#C6A77D] antialiased sm:text-5xl sm:leading-[1.1] md:text-[2.875rem] md:leading-[1.08] lg:text-6xl lg:leading-[1.06] xl:text-[3.5rem]">
                  Give your shoppers a virtual fitting room.
                </h1>

                <h2 className="mt-6 max-w-[40rem] text-pretty font-sans text-lg font-light leading-relaxed text-zinc-200/95 sm:mt-7 sm:text-xl sm:leading-[1.55]">
                  The UK&apos;s first virtual try-on for online fashion stores.
                </h2>

                <p className="mt-6 max-w-[36rem] text-pretty font-sans text-base font-normal leading-[1.75] text-zinc-300 sm:mt-8 sm:text-lg sm:leading-[1.72]">
                  Your customers see how your clothes, shoes, jewellery and eyewear look on them — before they
                  order. Fewer returns, more confident buyers. One line of code. Works on any website.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
                  <Link
                    href="/demo"
                    className="wear-me-btn inline-flex min-h-[44px] items-center justify-center rounded-full px-7 py-3 text-center text-sm font-semibold sm:text-base"
                  >
                    Try it yourself
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/35 bg-white/5 px-5 py-2.5 text-center text-sm font-medium text-zinc-100 backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 sm:min-h-[44px] sm:px-6 sm:text-[0.9375rem]"
                  >
                    About Us
                  </Link>
                </div>
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
                  aria-label="Wear Me virtual try-on preview video"
                >
                  <source src="/demo-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>
        <MarketingTestimonialsWithPendingFeedback subscriberSlides={approvedSubscriberSlides} />
      </main>
      <Footer />
    </>
  );
}
