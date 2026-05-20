"use client";

import { useState } from "react";
import {
  getInstallPlatformGuide,
  INSTALL_PLATFORM_TABS,
  type InstallPlatformId,
} from "@/components/install/installPlatformGuideContent";

const tabBase =
  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
const tabInactive = "text-zinc-500 hover:bg-white/5 hover:text-zinc-300";
const tabActive =
  "bg-[#c6a77d]/15 text-[#e8d4b5] ring-1 ring-[#c6a77d]/35 shadow-sm shadow-black/20";

export function DashboardInstallPlatformGuide() {
  const [platform, setPlatform] = useState<InstallPlatformId>("shopify");
  const guides = getInstallPlatformGuide("text-zinc-100");
  const g = guides[platform];

  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-100">How to install</h3>
      <p className="mt-2 text-sm text-zinc-400">
        Choose the tool you use for your website. Each tab has three short steps in everyday words.
      </p>

      <div className="mt-5 rounded-xl border border-[#c6a77d]/20 bg-[#c6a77d]/[0.07] px-4 py-3 text-sm leading-relaxed text-zinc-300">
        <strong className="text-[#e8d4b5]">First:</strong> click <strong className="text-zinc-100">Copy code</strong> in the{" "}
        <strong className="text-zinc-100">Widget script</strong> box above so your Wear Me line is ready to paste.
      </div>

      <div
        className="mt-6 flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-zinc-950/60 p-1 shadow-inner shadow-black/30 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/45 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] md:p-8"
        role="tabpanel"
      >
        <p className="text-sm leading-relaxed text-zinc-300">{g.intro}</p>

        <ol className="mt-8 space-y-6">
          {g.steps.map((content, i) => (
            <li key={i} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/35 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5 text-sm leading-relaxed text-zinc-200">{content}</div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-200">Not sure where to paste it?</strong> Just forward this page to your web developer
        — they&apos;ll know exactly what to do in under 2 minutes.
      </p>
    </div>
  );
}
