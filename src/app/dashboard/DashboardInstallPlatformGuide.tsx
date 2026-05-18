"use client";

import { useState } from "react";
import { InstallDiagramStep3BodyTag, InstallDiagramStep4Success } from "./installGuideDiagrams";

export type InstallPlatformId = "shopify" | "wordpress" | "wix" | "squarespace" | "customHtml";

const PLATFORMS: { id: InstallPlatformId; label: string }[] = [
  { id: "shopify", label: "Shopify" },
  { id: "wordpress", label: "WordPress" },
  { id: "wix", label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "customHtml", label: "Custom HTML" },
];

const tabBase =
  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
const tabInactive = "text-zinc-500 hover:bg-white/5 hover:text-zinc-300";
const tabActive =
  "bg-[#c6a77d]/15 text-[#e8d4b5] ring-1 ring-[#c6a77d]/35 shadow-sm shadow-black/20";

function PastePath({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-[#c6a77d]/25 bg-[#c6a77d]/[0.06] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c6a77d]/80">Where to paste</p>
      <p className="mt-1.5 font-mono text-xs leading-relaxed text-zinc-200">{children}</p>
    </div>
  );
}

const GUIDES: Record<
  InstallPlatformId,
  {
    intro: string;
    pathLine: React.ReactNode;
    steps: React.ReactNode[];
    showBodyDiagram?: boolean;
    showSuccessDiagram?: boolean;
  }
> = {
  shopify: {
    intro: "Shopify keeps theme code in the theme editor. You add one line to your main layout file so the widget loads on every page.",
    pathLine: (
      <>
        Shopify admin → <span className="text-zinc-400">Online Store</span> → <span className="text-zinc-400">Themes</span> →{" "}
        <span className="text-zinc-400">⋯</span> → <span className="text-zinc-400">Edit code</span> →{" "}
        <span className="text-zinc-400">Layout</span> → <strong className="text-[#c6a77d]">theme.liquid</strong>
      </>
    ),
    steps: [
      <>
        Log in to your <strong className="font-medium text-zinc-200">Shopify admin</strong>.
      </>,
      <>
        Go to <strong className="font-medium text-zinc-200">Online Store</strong> → <strong className="font-medium text-zinc-200">Themes</strong>.
      </>,
      <>
        On your live theme, open the <strong className="font-medium text-zinc-200">⋯</strong> (three dots) menu, then choose{" "}
        <strong className="font-medium text-zinc-200">Edit code</strong>.
      </>,
      <>
        In the left sidebar under <strong className="font-medium text-zinc-200">Layout</strong>, click{" "}
        <strong className="font-medium text-zinc-200">theme.liquid</strong>.
      </>,
      <>
        Scroll to the bottom of the file. Paste your Wear Me line on its <strong className="font-medium text-zinc-200">own line</strong>,{" "}
        <strong className="font-medium text-zinc-200">directly above</strong> the closing{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">&lt;/body&gt;</code> tag.
      </>,
      <>
        Click <strong className="font-medium text-zinc-200">Save</strong>, then open a product page on your storefront to check that try-on appears.
      </>,
    ],
    showBodyDiagram: true,
    showSuccessDiagram: true,
  },

  wordpress: {
    intro:
      "WordPress sites usually add third-party scripts either with a small plugin (easiest) or by editing the theme footer. Start with the plugin path if you are not comfortable editing PHP files.",
    pathLine: (
      <>
        Plugin path: <span className="text-zinc-400">Plugins</span> → <span className="text-zinc-400">Add New</span> → search{" "}
        <strong className="text-[#c6a77d]">Insert Headers and Footers</strong> →{" "}
        <span className="text-zinc-400">Settings</span> → <strong className="text-[#c6a77d]">Scripts in Footer</strong>
      </>
    ),
    steps: [
      <>
        Log in to <strong className="font-medium text-zinc-200">WordPress admin</strong> (usually{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">yoursite.com/wp-admin</code>
        ).
      </>,
      <>
        <strong className="font-medium text-zinc-200">Recommended:</strong> go to <strong className="font-medium text-zinc-200">Plugins</strong> →{" "}
        <strong className="font-medium text-zinc-200">Add New</strong>. Search for{" "}
        <strong className="font-medium text-zinc-200">Insert Headers and Footers</strong> (WPBeginner), install and activate.
      </>,
      <>
        Open <strong className="font-medium text-zinc-200">Settings</strong> →{" "}
        <strong className="font-medium text-zinc-200">Insert Headers and Footers</strong>. Paste your snippet into the{" "}
        <strong className="font-medium text-zinc-200">Scripts in Footer</strong> box (not the header).
      </>,
      <>
        Click <strong className="font-medium text-zinc-200">Save</strong>. If you use a cache plugin (WP Rocket, etc.), clear the cache once.
      </>,
      <>
        <strong className="font-medium text-zinc-200">Alternative (advanced):</strong> if you cannot use plugins, go to{" "}
        <strong className="font-medium text-zinc-200">Appearance</strong> → <strong className="font-medium text-zinc-200">Theme File Editor</strong>, open{" "}
        <strong className="font-medium text-zinc-200">footer.php</strong>, and paste <strong className="font-medium text-zinc-200">just before</strong>{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">&lt;/body&gt;</code>
        . Some hosts hide the file editor; in that case use FTP or your host&apos;s file manager with the same rule.
      </>,
      <>Visit a product page and confirm the try-on control loads.</>,
    ],
    showBodyDiagram: true,
    showSuccessDiagram: true,
  },

  wix: {
    intro:
      "Wix stores sitewide scripts in Custom code. You add one snippet and set it to run at the end of the page body so it behaves like a normal embed.",
    pathLine: (
      <>
        Wix dashboard → <span className="text-zinc-400">Settings</span> → <strong className="text-[#c6a77d]">Custom code</strong> →{" "}
        <strong className="text-[#c6a77d]">+ Add Custom Code</strong> → placement: <strong className="text-[#c6a77d]">Body – end</strong>
      </>
    ),
    steps: [
      <>
        Log in to <strong className="font-medium text-zinc-200">Wix</strong> and open your site&apos;s <strong className="font-medium text-zinc-200">dashboard</strong>.
      </>,
      <>
        Go to <strong className="font-medium text-zinc-200">Settings</strong> → <strong className="font-medium text-zinc-200">Custom code</strong> (names may
        be similar such as “Tracking tools” → “Custom code” on older accounts).
      </>,
      <>
        Click <strong className="font-medium text-zinc-200">+ Add Custom Code</strong> (or equivalent).
      </>,
      <>
        Paste your Wear Me line into the code field. Name it something you will recognize, e.g. <em>Fit Room widget</em>.
      </>,
      <>
        Set <strong className="font-medium text-zinc-200">Add code to pages</strong> to <strong className="font-medium text-zinc-200">All pages</strong>{" "}
        (or choose specific pages if you only want catalog/product views). Set placement to{" "}
        <strong className="font-medium text-zinc-200">Body – end</strong> / <strong className="font-medium text-zinc-200">end of body</strong>.
      </>,
      <>
        Apply the code, then <strong className="font-medium text-zinc-200">Publish</strong> your site. Open a live product URL to test.
      </>,
    ],
    showSuccessDiagram: true,
  },

  squarespace: {
    intro:
      "Squarespace has a single place for site-wide footer scripts. Your snippet goes in the Footer injection field—not the header.",
    pathLine: (
      <>
        Squarespace → <span className="text-zinc-400">Settings</span> → <span className="text-zinc-400">Advanced</span> →{" "}
        <strong className="text-[#c6a77d]">Code Injection</strong> → <strong className="text-[#c6a77d]">Footer</strong> box
      </>
    ),
    steps: [
      <>
        Log in to <strong className="font-medium text-zinc-200">Squarespace</strong> and open <strong className="font-medium text-zinc-200">Settings</strong>{" "}
        (gear icon).
      </>,
      <>
        Go to <strong className="font-medium text-zinc-200">Advanced</strong> → <strong className="font-medium text-zinc-200">Code Injection</strong>.
      </>,
      <>
        Scroll to the <strong className="font-medium text-zinc-200">Footer</strong> section. Paste your entire Wear Me line there. Leave{" "}
        <strong className="font-medium text-zinc-200">Header</strong> empty unless your site already uses it for something else.
      </>,
      <>
        Click <strong className="font-medium text-zinc-200">Save</strong>. Preview or open a product page on your live domain.
      </>,
    ],
    showSuccessDiagram: true,
  },

  customHtml: {
    intro:
      "If you control the HTML (static site, custom theme, or framework), paste the script once in the shared layout so it runs on every page that should show try-on.",
    pathLine: (
      <>
        Your layout file (e.g. <strong className="text-[#c6a77d]">layout.html</strong>, <strong className="text-[#c6a77d]">base.html</strong>, main template) →{" "}
        immediately <strong className="text-[#c6a77d]">above</strong> <code className="text-zinc-400">&lt;/body&gt;</code>
      </>
    ),
    steps: [
      <>
        Open the main HTML template or layout that wraps your shop pages (the exact filename depends on your stack).
      </>,
      <>
        Find the closing <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">&lt;/body&gt;</code> tag near the bottom of that file.
      </>,
      <>
        Paste your Wear Me snippet on its <strong className="font-medium text-zinc-200">own line</strong>,{" "}
        <strong className="font-medium text-zinc-200">directly above</strong>{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">&lt;/body&gt;</code>. Do not paste inside another tag unless you know that pattern is safe.
      </>,
      <>
        Save the file and <strong className="font-medium text-zinc-200">deploy</strong> or upload to production. Use a hard refresh (Cmd+Shift+R / Ctrl+Shift+R) when testing.
      </>,
      <>Open a product page and confirm the widget loads.</>,
    ],
    showBodyDiagram: true,
    showSuccessDiagram: true,
  },
};

export function DashboardInstallPlatformGuide() {
  const [platform, setPlatform] = useState<InstallPlatformId>("shopify");
  const g = GUIDES[platform];

  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-100">How to install</h3>
      <p className="mt-2 text-sm text-zinc-500">
        Pick your platform. Each tab tells you the exact area in that product where the code belongs.
      </p>

      <div className="mt-5 rounded-xl border border-[#c6a77d]/20 bg-[#c6a77d]/[0.07] px-4 py-3 text-sm leading-relaxed text-zinc-300">
        <strong className="text-[#e8d4b5]">Before you start:</strong> copy your Wear Me line from the{" "}
        <strong className="text-zinc-100">Widget script</strong> box above using the gold <strong className="text-zinc-100">Copy code</strong> button.
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
        <p className="text-sm leading-relaxed text-zinc-400">{g.intro}</p>
        <PastePath>{g.pathLine}</PastePath>

        <ol className="mt-8 space-y-5">
          {g.steps.map((content, i) => (
            <li key={i} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/35 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5 text-sm leading-relaxed text-zinc-300">{content}</div>
            </li>
          ))}
        </ol>

        {g.showBodyDiagram ? (
          <div className="mt-10 border-t border-white/10 pt-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Visual: in HTML files, paste before &lt;/body&gt;
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Shopify theme, WordPress footer, and custom layouts usually follow this shape.
            </p>
            <InstallDiagramStep3BodyTag />
          </div>
        ) : null}

        {g.showSuccessDiagram ? (
          <div className="mt-10 border-t border-white/10 pt-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">After you save</p>
            <p className="mt-2 text-sm text-zinc-500">Publish or deploy, then check a live product page.</p>
            <InstallDiagramStep4Success />
          </div>
        ) : null}
      </div>
    </div>
  );
}
