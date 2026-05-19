"use client";

import { useState } from "react";

export type InstallPlatformId = "shopify" | "wordpress" | "wix" | "squarespace" | "customHtml";

const PLATFORMS: { id: InstallPlatformId; label: string }[] = [
  { id: "shopify", label: "Shopify" },
  { id: "wordpress", label: "WordPress" },
  { id: "wix", label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "customHtml", label: "Other site" },
];

const tabBase =
  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
const tabInactive = "text-zinc-500 hover:bg-white/5 hover:text-zinc-300";
const tabActive =
  "bg-[#c6a77d]/15 text-[#e8d4b5] ring-1 ring-[#c6a77d]/35 shadow-sm shadow-black/20";

const GUIDES: Record<
  InstallPlatformId,
  {
    intro: string;
    steps: React.ReactNode[];
  }
> = {
  shopify: {
    intro: "These steps are for Shopify—the place where you manage your online store.",
    steps: [
      <>
        Sign in to Shopify. On the left, click <strong className="text-zinc-100">Online store</strong>. Then click{" "}
        <strong className="text-zinc-100">Themes</strong>.
      </>,
      <>
        Look for the <strong className="text-zinc-100">three dots</strong> next to your current theme. Click them, then
        click <strong className="text-zinc-100">Edit code</strong>. On the left, under{" "}
        <strong className="text-zinc-100">Layout</strong>, open the main theme file (
        <strong className="text-zinc-100">theme.liquid</strong>—that&apos;s just the name Shopify uses; you don&apos;t need
        to understand it).
      </>,
      <>
        Scroll to the <strong className="text-zinc-100">very bottom</strong> of the page you&apos;re looking at.{" "}
        <strong className="text-zinc-100">Paste</strong> what you copied into a fresh line just above the last line or
        two, then click <strong className="text-zinc-100">Save</strong>.
      </>,
    ],
  },

  wordpress: {
    intro: "These steps use a small free add-on inside WordPress so you can paste in one box—no hunting through files.",
    steps: [
      <>Sign in to your WordPress dashboard (the back end of your site).</>,
      <>
        On the left, click <strong className="text-zinc-100">Plugins</strong>, then{" "}
        <strong className="text-zinc-100">Add new</strong>. In the search area, type{" "}
        <strong className="text-zinc-100">Insert Headers and Footers</strong>. Install it and click the button to turn it
        on.
      </>,
      <>
        Click <strong className="text-zinc-100">Settings</strong>, then open{" "}
        <strong className="text-zinc-100">Insert Headers and Footers</strong>. Look for the box meant for the{" "}
        <strong className="text-zinc-100">bottom</strong> of the site (it may say “footer”).{" "}
        <strong className="text-zinc-100">Paste</strong> what you copied there—not in the top box. Then save.
      </>,
    ],
  },

  wix: {
    intro: "Wix lets you add one piece of text that runs on your pages from your site settings.",
    steps: [
      <>
        Sign in to Wix and open your site&apos;s <strong className="text-zinc-100">Settings</strong> area (not the
        visual drag-and-drop editor—look for site-wide settings).
      </>,
      <>
        Look for something like <strong className="text-zinc-100">Custom code</strong> or extra code for your site.
        Click the button to <strong className="text-zinc-100">add</strong> a new piece of code.
      </>,
      <>
        <strong className="text-zinc-100">Paste</strong> what you copied into the box. When it asks where the code
        should run, pick <strong className="text-zinc-100">all pages</strong> (or your whole shop) and choose the option
        that means <strong className="text-zinc-100">end of the page</strong> (close to the bottom). Then apply your
        changes and <strong className="text-zinc-100">publish</strong> the site so shoppers can see it.
      </>,
    ],
  },

  squarespace: {
    intro: "Squarespace has one place where you can add text that runs at the bottom of every page.",
    steps: [
      <>
        Sign in to Squarespace. Click the <strong className="text-zinc-100">gear</strong> icon for{" "}
        <strong className="text-zinc-100">Settings</strong>.
      </>,
      <>
        Click <strong className="text-zinc-100">Advanced</strong>, then look for a setting about{" "}
        <strong className="text-zinc-100">adding code to your site</strong> (Squarespace often calls it{" "}
        <strong className="text-zinc-100">Code injection</strong>) and open it.
      </>,
      <>
        Find the section for the <strong className="text-zinc-100">footer</strong>—the bottom area of your site, not the
        top. <strong className="text-zinc-100">Paste</strong> what you copied there. Click{" "}
        <strong className="text-zinc-100">Save</strong>.
      </>,
    ],
  },

  customHtml: {
    intro: "Use this if someone else built your site in a custom way, or the options above don’t match your setup.",
    steps: [
      <>
        Find the person or team who can edit your website files, or open your site&apos;s main layout yourself if you
        already know how.
      </>,
      <>Open the layout that wraps your product pages—the file that loads on every shopping page.</>,
      <>
        Go to the bottom of that file. <strong className="text-zinc-100">Paste</strong> what you copied on its own line
        just above the very end, save, and make the change live on the internet.
      </>,
    ],
  },
};

export function DashboardInstallPlatformGuide() {
  const [platform, setPlatform] = useState<InstallPlatformId>("shopify");
  const g = GUIDES[platform];

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
        {PLATFORMS.map((p) => (
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
