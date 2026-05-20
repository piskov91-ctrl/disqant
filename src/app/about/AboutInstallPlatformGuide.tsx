"use client";

import { useState } from "react";
import {
  getInstallPlatformGuide,
  INSTALL_PLATFORM_TABS,
  type InstallPlatformId,
} from "@/components/install/installPlatformGuideContent";

const tabBase =
  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const tabInactive = "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";
const tabActive =
  "bg-[#c6a77d]/15 text-zinc-900 ring-1 ring-[#c6a77d]/40 shadow-sm shadow-black/5";

/** Written instructions from the dashboard Get Code tab (no live code snippet). */
export function AboutInstallPlatformGuide() {
  const [platform, setPlatform] = useState<InstallPlatformId>("shopify");
  const guides = getInstallPlatformGuide("font-semibold text-zinc-900");
  const g = guides[platform];

  return (
    <section className="border-b border-surface-border bg-white py-14 md:py-16" aria-labelledby="about-install-heading">
      <div className="mx-auto max-w-6xl px-6">
        <h2 id="about-install-heading" className="text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl">
          Where to paste your install line
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-700 md:text-lg">
          After you subscribe, open your retailer dashboard and copy your personal widget script from the{" "}
          <strong className="font-semibold text-zinc-900">Get Code</strong> tab. The steps below match what you see
          there—without showing your secret snippet on this page. Pick your platform and follow along; you only need to
          paste that single line where we describe.
        </p>

        <div
          className="mt-8 flex gap-1 overflow-x-auto rounded-full border border-surface-border bg-white p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Installation platform"
        >
          {INSTALL_PLATFORM_TABS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={platform === p.id}
              onClick={() => setPlatform(p.id)}
              className={`${tabBase} ${platform === p.id ? tabActive : tabInactive}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div
          className="mt-8 rounded-2xl border border-surface-border bg-white p-6 shadow-sm md:p-8"
          role="tabpanel"
        >
          <p className="text-base leading-relaxed text-zinc-700">{g.intro}</p>

          <ol className="mt-8 space-y-6">
            {g.steps.map((content, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 text-sm font-bold text-[#8b7355]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5 text-base leading-relaxed text-zinc-700">{content}</div>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 max-w-3xl rounded-xl border border-surface-border bg-white/80 px-4 py-3 text-sm leading-relaxed text-zinc-600">
          <strong className="font-semibold text-zinc-800">Need help?</strong> Forward your dashboard Get Code page to
          whoever looks after your website—they&apos;ll know where your theme or site-wide footer code lives.
        </p>
      </div>
    </section>
  );
}
