"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import {
  disableGoogleAnalytics,
  GOOGLE_ANALYTICS_ID,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookieConsent";

export function CookieConsent() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChoice(readCookieConsent());
    setReady(true);
  }, []);

  function accept() {
    saveCookieConsent("accepted");
    setChoice("accepted");
  }

  function decline() {
    saveCookieConsent("declined");
    disableGoogleAnalytics();
    setChoice("declined");
  }

  const showBanner = ready && choice === null;

  return (
    <>
      {choice === "accepted" ? (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GOOGLE_ANALYTICS_ID}');
            `}
          </Script>
        </>
      ) : null}

      {showBanner ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
        >
          <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-[#C6A77D]/30 bg-[#1a1612]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-6">
            <p
              id="cookie-consent-title"
              className="font-serif text-lg font-semibold tracking-tight text-[#F5EDE4]"
            >
              Cookies &amp; privacy
            </p>
            <p id="cookie-consent-desc" className="mt-2 text-sm leading-relaxed text-[#F5EDE4]/75">
              We use cookies to understand how visitors use our site and to improve your experience.
              Analytics cookies are only set if you accept.{" "}
              <Link href="/privacy" className="text-[#C6A77D] underline-offset-2 hover:underline">
                Privacy policy
              </Link>
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={decline}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#C6A77D]/35 bg-transparent px-6 text-sm font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D]/60 hover:bg-[#2C241F]"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-6 text-sm font-semibold text-[#2C241F] shadow-[0_4px_18px_rgba(198,167,125,0.35)] transition hover:opacity-95"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
