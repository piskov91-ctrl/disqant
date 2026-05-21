/**
 * Clipboard-ready onboarding emails sent from admin (Clients tab). Plain text only.
 */

export type AdminClientInstallPlatform = "shopify" | "wordpress" | "wix" | "squarespace" | "custom";

export const ADMIN_CLIENT_INSTALL_EMAIL_PLATFORMS: readonly {
  readonly id: AdminClientInstallPlatform;
  readonly label: string;
}[] = [
  { id: "shopify", label: "Shopify" },
  { id: "wordpress", label: "WordPress" },
  { id: "wix", label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "custom", label: "Custom / Other" },
];

function sanitizeStoreLabel(name: string): string {
  const t = name.trim();
  return t.length > 0 ? t : "there";
}

/** Subject line per platform — short, inbox-friendly */
function subjectFor(platform: AdminClientInstallPlatform, storeLabel: string): string {
  const base = sanitizeStoreLabel(storeLabel);
  switch (platform) {
    case "shopify":
      return `Wear Me try-on — quick Shopify steps for ${base}`;
    case "wordpress":
      return `Wear Me try-on — quick WordPress steps for ${base}`;
    case "wix":
      return `Wear Me try-on — quick Wix steps for ${base}`;
    case "squarespace":
      return `Wear Me try-on — quick Squarespace steps for ${base}`;
    default:
      return `Wear Me snippet for ${base} — forward to dev if handy`;
  }
}

function numberedSteps(platform: AdminClientInstallPlatform): string {
  switch (platform) {
    case "shopify":
      return [
        "Pop into Shopify admin → Online store → Themes.",
        "On your published theme: ⋯ menu → Edit code.",
        'Under Layout, open theme.liquid, scroll way down.',
        'Paste our script line directly above the closing </body> tag (fresh line above it works best). Hit Save.',
        "Give product pages a quick refresh—or open one in private browsing—to spot the Wear Me cue on imagery.",
      ]
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

    case "wordpress":
      return [
        "Dashboard → Plugins → Add new.",
        'Search Insert Headers and Footers (WPBeginner’s one is tidy), Install + Activate—you’ll only do this once.',
        "Go to Settings → Insert Headers and Footers.",
        "Drop our script line into Footer / Scripts in Footer—not the Header box—and save.",
        "Clear cache plugins if anything felt sticky, then skim a PDP to confirm the Wear Me ribbon shows.",
      ]
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

    case "wix":
      return [
        "Dashboard → Settings (site-level, not necessarily the pixel editor).",
        "Custom code—or Tracking tools / Marketing integrations depending on dashboard vintage → Add snippet.",
        "Paste our line, placement Body-end (bottom of pages), covering store + product layouts; publish afterward.",
        "Spot-check one product listing after publish so you know shoppers will see try-on beside gallery shots.",
      ]
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

    case "squarespace":
      return [
        "Gear icon → Website → Settings navigation (wording hops between 7/7.1 builds).",
        "Advanced → Code Injection (sometimes Developer → Code Injection).",
        "Footer field only—paste the script, nothing extra required around it—and save.",
        "Preview a PDP; you should spot Wear Me perched near product imagery shortly after caches calm down.",
      ]
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");

    default:
      return [
        "Ping whoever owns layouts/templates for your stack—feel free to forward this whole email verbatim.",
        "Ask them to place the snippet below once inside the shared footer/global layout so PDPs inherit it reliably.",
        "Goal: single script execution per page load after HTML is in place—HTTPS storefronts only.",
        "If CSP or consent banners intervene, stagger the load appropriately; shout if Fit Room endpoints need explicit allow-listing—we've done that rodeo before.",
      ]
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n");
  }
}

function platformFriendlyName(platform: AdminClientInstallPlatform): string {
  switch (platform) {
    case "shopify":
      return "Shopify";
    case "wordpress":
      return "WordPress";
    case "wix":
      return "Wix";
    case "squarespace":
      return "Squarespace";
    default:
      return "your stack";
  }
}

function buildBody(opts: {
  platform: AdminClientInstallPlatform;
  storeName: string;
  widgetSnippet: string;
}): string {
  const who = sanitizeStoreLabel(opts.storeName);
  const platformLabel = platformFriendlyName(opts.platform);
  const steps = numberedSteps(opts.platform);

  if (opts.platform === "custom") {
    return [
      `Hi ${who},`,
      "",
      `We've lined up Wear Me virtual try-on so shoppers can audition pieces on-photo before committing. Sharing the snippet + context below—sometimes it's quickest to lob this straight across to whoever tinkers behind the scenes.`,
      "",
      `What devs usually need (${platformLabel === "your stack" ? "custom setups" : platformLabel})`,
      steps,
      "",
      "Paste once, leave it untouched afterwards:",
      opts.widgetSnippet,
      "",
      "When it’s behaving, PDP galleries should tuck a discreet Wear Me control beside hero imagery—it’s unobtrusive until someone taps.",
      "",
      "If fingerprints get smudgy (CSP, consent gating, headless quirks), punt the thread back—we’ll riff with them until calm waters.",
      "",
      "Thanks for letting us nerd out alongside you.",
      "",
      "— Fit Room",
    ].join("\n");
  }

  return [
    `Hi ${who},`,
    "",
    `Your Wear Me snippet is humming on our servers—whatever's left is a five-minute housekeeping moment inside ${platformLabel}.`,
    "",
    `${platformLabel} walkthrough`,
    steps,
    "",
    "Paste this intact (one line—no tweaking the key tucked inside please):",
    opts.widgetSnippet,
    "",
    "Post-save, skim a PDP in quiet browsing mode; you ought to glimpse Wear Me perched near product photography. If vibes feel off—cache, staged themes, unpublished edits—shoot a reply and we’ll chase it.",
    "",
    "Cheering you on.",
    "",
    "— Fit Room team",
  ].join("\n");
}

/** Full clipboard blob (subject header + plain body Gmail pastes fine). */
export function buildAdminClientInstallClipboardText(opts: {
  platform: AdminClientInstallPlatform;
  storeName: string;
  widgetSnippet: string;
}): string {
  const subject = subjectFor(opts.platform, opts.storeName);
  const body = buildBody(opts);
  return `Subject: ${subject}\n\n${body}`;
}
