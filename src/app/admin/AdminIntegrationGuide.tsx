"use client";

import { useCallback, useEffect, useState } from "react";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatInstructionsBlock(title: string, steps: readonly string[]): string {
  const lines = steps.map((s, i) => `${i + 1}. ${s}`);
  return `${title}\n\n${lines.join("\n")}`;
}

type CopyChipProps = {
  label: string;
  disabled?: boolean;
  onCopy: () => void;
  copied: boolean;
};

function CopyChip({ label, disabled, onCopy, copied }: CopyChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onCopy}
      className="inline-flex min-h-[2.375rem] items-center justify-center rounded-full border border-[#C6A77D]/45 bg-[#2c241f]/80 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#e8d4bc] shadow-sm shadow-black/30 transition hover:border-[#e8d4bc]/65 hover:bg-[#3d342c] hover:text-[#fdf6ed] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

type IntegrationPlatform = {
  id: string;
  title: string;
  instructionsIntro: string;
  instructionSteps: readonly string[];
  emailSubject: string;
  emailBody: string;
};

const PLATFORMS: readonly IntegrationPlatform[] = [
  {
    id: "shopify",
    title: "Shopify",
    instructionsIntro:
      "Wear Me installs in your active theme—the button appears automatically on product pages once the snippet is saved.",
    instructionSteps: [
      "Log in to your Shopify admin.",
      "Go to Online Store → Themes.",
      "Click the three dots next to your current theme and select Edit code.",
      "Under Layout, open theme.liquid.",
      "Scroll to the very bottom and paste your Wear Me code just above the closing </body> tag.",
      "Click Save.",
    ],
    emailSubject: "Your Fit Room widget — quick install guide (Shopify)",
    emailBody:
      "Hi [store name], Great news — your Fit Room virtual try-on is ready to go live. Here is how to add it to your Shopify store in under 5 minutes: 1. Log in to your Shopify admin. 2. Go to Online Store → Themes. 3. Click the three dots next to your current theme and select Edit code. 4. Under Layout, open theme.liquid. 5. Scroll to the very bottom and paste your Wear Me code just above the closing tag. 6. Click Save. That is it — the Wear Me button will appear on all your product pages automatically. Your unique code is below. If you get stuck at any point just reply to this email and I will sort it for you personally. Warm regards, Fit Room",
  },
  {
    id: "wordpress",
    title: "WordPress",
    instructionsIntro:
      "Prefer a plugin over the theme editor if updates overwrite footer.php—or when your host hides Theme File Editor.",
    instructionSteps: [
      "Log in to your WordPress admin.",
      "Go to Appearance → Theme File Editor. If this screen is disabled, install a snippets plugin such as WPCode or “Insert Headers and Footers”.",
      "Open footer.php under your active theme—or open your plugin’s “Footer Scripts” / “Scripts in Footer” panel.",
      "Paste your Wear Me code immediately above the closing </body> tag (or into the footer script box and save).",
      "Save / Update File, then flush any page cache.",
    ],
    emailSubject: "Your Fit Room widget — quick install guide (WordPress)",
    emailBody:
      "Hi [store name],\n\n" +
      "Great news — your Fit Room virtual try-on is ready to go live.\n\n" +
      "Here is how to add it to WordPress in a few minutes:\n\n" +
      "1. Log in to your WordPress dashboard.\n" +
      "2. Go to Appearance → Theme File Editor. If your host disables it, install “Insert Headers and Footers” (or WPCode) and use the Footer section instead.\n" +
      "3. Open footer.php (Theme Footer)—or paste into your plugin’s footer snippet box.\n" +
      "4. Paste your Wear Me code just above the closing </body> tag (or save in Footer Scripts).\n" +
      "5. Save / Update File, then clear caches if you use a caching plugin.\n\n" +
      "The Wear Me button should appear automatically on eligible product URLs once the snippet loads.\n\n" +
      "Your unique code is below.\n\n" +
      "Reply to this email if anything looks off—we’re happy to help.\n\n" +
      "Warm regards,\n" +
      "Fit Room",
  },
  {
    id: "wix",
    title: "Wix",
    instructionsIntro: "Dashboard labels vary slightly; look for Custom code or Tracking & Analytics under Marketing settings.",
    instructionSteps: [
      "Log in to Wix and open the Editor for your site.",
      "Open Settings → Custom Code (alternative path: Dashboard → Marketing & Analytics → Tracking & Analytics).",
      "Add a new custom code snippet.",
      "Name it (for example Fit Room try-on), paste your Wear Me code, choose placement Body – end.",
      "Apply to All Pages or Products & Store pages as needed for product grids and PDP coverage.",
      "Publish the site.",
    ],
    emailSubject: "Your Fit Room widget — quick install guide (Wix)",
    emailBody:
      "Hi [store name],\n\n" +
      "Great news — your Fit Room virtual try-on is ready to go live.\n\n" +
      "Here is how to add it on Wix:\n\n" +
      "1. Log in to Wix and open your site in the Editor.\n" +
      "2. Go to Settings → Custom Code (or Tracking & Analytics → Custom code in the dashboard).\n" +
      "3. Choose Add Custom Code.\n" +
      "4. Paste your Wear Me snippet, select placement Body – end, include product pages.\n" +
      "5. Publish your site.\n\n" +
      "The Wear Me button should attach automatically wherever your product markup loads.\n\n" +
      "Your unique code is below.\n\n" +
      "Message us anytime if placement needs a tweak—we’re happy to help.\n\n" +
      "Warm regards,\n" +
      "Fit Room",
  },
  {
    id: "squarespace",
    title: "Squarespace",
    instructionsIntro: "Squarespace exposes a single Footer injector on most templates—perfect for Wear Me.",
    instructionSteps: [
      "Log in to Squarespace.",
      "Go to Settings → Advanced → Code Injection (on some workspaces: Settings → Developer → Code Injection).",
      "Paste your Wear Me snippet into the Footer field.",
      "Click Save.",
    ],
    emailSubject: "Your Fit Room widget — quick install guide (Squarespace)",
    emailBody:
      "Hi [store name],\n\n" +
      "Great news — your Fit Room virtual try-on is ready to go live.\n\n" +
      "Here is how to add it on Squarespace:\n\n" +
      "1. Log in to Squarespace.\n" +
      "2. Open Settings → Developer → Code Injection (or Advanced → Code Injection).\n" +
      "3. Paste your Wear Me code into Footer.\n" +
      "4. Save changes.\n\n" +
      "The Wear Me button should surface on product layouts once scripts load globally.\n\n" +
      "Your unique code is below.\n\n" +
      "Reply anytime if Squarespace versioning differs on your dashboard—we’ll walk you through it.\n\n" +
      "Warm regards,\n" +
      "Fit Room",
  },
  {
    id: "custom",
    title: "Custom / Other",
    instructionsIntro: "Ideal when Shopify, WordPress, Wix or Squarespace do not apply—or you need bespoke routing.",
    instructionSteps: [
      "Copy the numbered brief below.",
      "Email it (or Slack it) directly to [store name]’s developer or agency lead.",
      "Attach—or paste—the client’s personalised Wear Me embed snippet in the same thread so nothing is gated behind logins.",
      "Ask them to load the snippet from a global footer or shared product template AFTER the PDP DOM renders (defer/async as needed).",
      "Confirm CSP, cookie consent banners, and SPA navigation won’t strip third-party injections.",
      "Offer a Fit Room escalation contact for questions (you).",
    ],
    emailSubject: "Fit Room snippet — forward to your web developer",
    emailBody:
      "Hi [store name],\n\n" +
      "We’re activating Fit Room (Wear Me virtual try-on) on your storefront.\n\n" +
      "Please forward everything below to your web developer or technical contact—it has what they need in one pass:\n\n" +
      "• Goal: Surface the Wear Me button on product pages where shoppers can try items on realistic photos.\n" +
      "• Delivery: Paste the supplied JavaScript snippet once in your global footer, shared PDP template footer, or equivalent hook that runs across product URLs.\n" +
      "• HTTPS only; avoid blocking CSP without allowlisting Fit Room endpoints.\n" +
      "• Respect consent banners—delay loading until appropriate if required.\n" +
      "• Questions: developer can reply to this thread and Fit Room support will liaise.\n\n" +
      "Your personalised embed code is pasted below.\n\n" +
      "Thanks,\n" +
      "Fit Room",
  },
] as const;

export default function AdminIntegrationGuide() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) return;
    const t = window.setTimeout(() => setCopiedKey(null), 2200);
    return () => window.clearTimeout(t);
  }, [copiedKey]);

  const onCopyInstructions = useCallback((platform: IntegrationPlatform) => {
    const block = formatInstructionsBlock(
      `Fit Room — ${platform.title} integration`,
      platform.instructionSteps,
    );
    const full =
      `${block}\n\n---\n${platform.instructionsIntro}\n`;
    void (async () => {
      const ok = await writeClipboard(full.trim());
      if (ok) setCopiedKey(`${platform.id}-instructions`);
    })();
  }, []);

  const onCopyEmail = useCallback((platform: IntegrationPlatform) => {
    const full = [`Subject: ${platform.emailSubject}`, "", platform.emailBody.trim()].join("\n");
    void (async () => {
      const ok = await writeClipboard(full);
      if (ok) setCopiedKey(`${platform.id}-email`);
    })();
  }, []);

  return (
    <section
      className="mt-8 w-full space-y-8 pb-16"
      aria-labelledby="integration-guide-heading"
    >
      <header className="rounded-2xl border border-[#C6A77D]/25 bg-gradient-to-br from-[#1a1612] via-[#141210] to-zinc-950 p-6 shadow-lg shadow-black/40 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b896]">
          Partner enablement
        </p>
        <h2 id="integration-guide-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[#F5EDE4] md:text-3xl">
          Integration guide
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Luxury-ready instructions and customer emails — copy straight into Gmail, Shopify Inbox or Help Scout. Swap{" "}
          <span className="font-mono text-[#C6A77D]/90">[store name]</span> before sending.
        </p>
      </header>

      <article
        className="rounded-2xl border border-[#C6A77D]/20 bg-[#141210]/95 p-6 shadow-inner shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-sm md:p-8"
        aria-labelledby="stripe-webhook-guide-title"
      >
        <div className="border-b border-zinc-800/80 pb-5">
          <h3
            id="stripe-webhook-guide-title"
            className="text-lg font-semibold tracking-tight text-[#f3e9dc] md:text-xl"
          >
            Check if a Stripe webhook worked
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-500">
            After a retailer pays via a Payment Link, confirm that{" "}
            <span className="font-mono text-[#C6A77D]/90">checkout.session.completed</span> was fulfilled
            successfully.
          </p>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Vercel logs</p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-200">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  1
                </span>
                <span>
                  Open{" "}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#C6A77D] underline decoration-[#C6A77D]/40 underline-offset-2 hover:text-[#e8d4bc]"
                  >
                    vercel.com
                  </a>{" "}
                  and open your project&apos;s logs.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  2
                </span>
                <span>
                  Look for requests to{" "}
                  <span className="font-mono text-[#C6A77D]/90">/api/stripe/webhook</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  3
                </span>
                <span>
                  <span className="font-semibold text-emerald-400/90">Status 200</span> means success — the
                  retailer&apos;s API key should be created and linked.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  4
                </span>
                <span>
                  <span className="font-semibold text-red-400/90">Status 500</span> means fulfillment failed — use
                  the Stripe steps on the right to resend.
                </span>
              </li>
            </ol>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              If the webhook failed
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-200">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  1
                </span>
                <span>Open the Stripe Dashboard.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  2
                </span>
                <span>
                  Go to <span className="font-medium text-zinc-100">Workbench</span> →{" "}
                  <span className="font-medium text-zinc-100">Webhooks</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  3
                </span>
                <span>
                  Open <span className="font-mono text-[#C6A77D]/90">fit-room-webhook</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  4
                </span>
                <span>Find the failed event in the delivery log.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                  5
                </span>
                <span>
                  Click <span className="font-medium text-zinc-100">Resend</span> to retry delivery after fixing
                  the underlying issue.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </article>

      <div className="space-y-6">
        {PLATFORMS.map((platform) => {
          const instrCopied = copiedKey === `${platform.id}-instructions`;
          const emailCopied = copiedKey === `${platform.id}-email`;
          return (
            <article
              key={platform.id}
              className="rounded-2xl border border-[#C6A77D]/20 bg-[#141210]/95 p-6 shadow-inner shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-sm md:p-8"
              aria-labelledby={`integration-${platform.id}-title`}
            >
              <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3
                    id={`integration-${platform.id}-title`}
                    className="text-lg font-semibold tracking-tight text-[#f3e9dc] md:text-xl"
                  >
                    {platform.title}
                  </h3>
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-500">{platform.instructionsIntro}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyChip
                    label="Copy instructions"
                    copied={instrCopied}
                    onCopy={() => onCopyInstructions(platform)}
                  />
                  <CopyChip
                    label="Copy email"
                    copied={emailCopied}
                    onCopy={() => onCopyEmail(platform)}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Steps</p>
                  <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-200">
                    {platform.instructionSteps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-zinc-800/90 bg-black/35 p-4 md:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Email preview</p>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#d4b896]">
                    Subject
                  </p>
                  <p className="mt-1 text-sm text-zinc-100">{platform.emailSubject}</p>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#d4b896]">Body</p>
                  <pre className="mt-2 max-h-[min(340px,50vh)] overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                    {platform.emailBody.trim()}
                  </pre>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
