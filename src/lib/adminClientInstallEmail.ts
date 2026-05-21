/**
 * Admin client install onboarding: platform taxonomy + subjects for Send Email flows.
 */

import type { WearMePdfPlatformSlug } from "@/lib/wearMeGuidePdf";
import {
  buildWearMeIntegrationEmailHtml,
  buildWearMeIntegrationPlainEmailBody,
} from "@/lib/fitRoomWearMeIntegrationEmail";

export type AdminClientInstallPlatform = WearMePdfPlatformSlug;

export const ADMIN_CLIENT_INSTALL_EMAIL_PLATFORMS: readonly {
  readonly id: AdminClientInstallPlatform;
  readonly label: string;
}[] = [
  { id: "shopify", label: "Shopify" },
  { id: "wordpress", label: "WordPress" },
  { id: "wix", label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "custom", label: "Custom" },
];

function sanitizeStoreLabel(name: string): string {
  const t = name.trim();
  return t.length > 0 ? t : "there";
}

export function adminInstallPlatformLabel(platform: AdminClientInstallPlatform): string {
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
      return "Custom setups";
  }
}

export function buildAdminClientInstallEmailSubject(platform: AdminClientInstallPlatform, storeName: string): string {
  const base = sanitizeStoreLabel(storeName);
  const plat = adminInstallPlatformLabel(platform);
  return `Wear Me integration guide (${plat}) for ${base}`;
}

export function buildAdminClientInstallPlainEmailBody(opts: {
  platform: AdminClientInstallPlatform;
  storeName: string;
  widgetSnippet: string;
}): string {
  void opts.platform;
  return buildWearMeIntegrationPlainEmailBody(opts.storeName, opts.widgetSnippet);
}

export function buildAdminClientInstallEmailHtml(opts: {
  platform: AdminClientInstallPlatform;
  storeName: string;
  widgetSnippet: string;
  emailSubjectLine: string;
}): string {
  const plat = adminInstallPlatformLabel(opts.platform);
  return buildWearMeIntegrationEmailHtml({
    emailSubjectLine: opts.emailSubjectLine,
    storeLabel: opts.storeName,
    snippet: opts.widgetSnippet,
    heading: `${plat} Wear Me integration`,
  });
}

/** Clipboard helper (manual paste) — aligns with multipart body + subject banner. */
export function buildAdminClientInstallClipboardText(opts: {
  platform: AdminClientInstallPlatform;
  storeName: string;
  widgetSnippet: string;
}): string {
  const subject = buildAdminClientInstallEmailSubject(opts.platform, opts.storeName);
  const body = buildWearMeIntegrationPlainEmailBody(opts.storeName, opts.widgetSnippet);
  return `Subject: ${subject}\n\n${body}`;
}
