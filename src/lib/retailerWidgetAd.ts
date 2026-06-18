/** Client-safe types, limits, and helpers — no Redis or auth imports. */

export type RetailerWidgetAdKind = "text" | "banner";

export type RetailerWidgetAdRecord = {
  kind: RetailerWidgetAdKind;
  /** Promo lines shown during widget generation (text kind). */
  messages?: string[];
  /** JPEG/PNG/WebP data URLs or https URLs (banner kind), up to {@link RETAILER_WIDGET_AD_MAX_BANNERS}. */
  bannerUrls?: string[];
  updatedAt: string;
};

/** Max banner file size per image (30 MiB). */
export const RETAILER_WIDGET_AD_MAX_BANNER_BYTES = 30 * 1024 * 1024;

/** Max stored payload per banner (base64 data URLs are ~4/3 the binary size). */
export const RETAILER_WIDGET_AD_MAX_BANNER_CHARS =
  Math.ceil(RETAILER_WIDGET_AD_MAX_BANNER_BYTES * (4 / 3)) + 128;

export const RETAILER_WIDGET_AD_MAX_MESSAGES = 5;
export const RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS = 220;
export const RETAILER_WIDGET_AD_MAX_BANNERS = 5;

export const RETAILER_WIDGET_AD_REDIS_PREFIX = "fit-room:retailer:widget-ad:";

export function retailerWidgetAdKey(clientId: string) {
  return `${RETAILER_WIDGET_AD_REDIS_PREFIX}${clientId.trim()}`;
}

function parseBannerUrlsFromRaw(raw: Record<string, unknown>): string[] {
  if (Array.isArray(raw.bannerUrls)) {
    return raw.bannerUrls.map((u) => String(u ?? "").trim()).filter(Boolean);
  }
  const legacy = typeof raw.bannerUrl === "string" ? raw.bannerUrl.trim() : "";
  return legacy ? [legacy] : [];
}

export function parseRetailerWidgetAdRecord(raw: unknown): RetailerWidgetAdRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<RetailerWidgetAdRecord> & { bannerUrl?: string };
  const kind = o.kind === "text" || o.kind === "banner" ? o.kind : null;
  if (!kind || typeof o.updatedAt !== "string" || !o.updatedAt.trim()) return null;

  if (kind === "text") {
    const messages = Array.isArray(o.messages)
      ? o.messages.map((m) => String(m ?? "").trim()).filter(Boolean)
      : [];
    if (!messages.length) return null;
    return { kind: "text", messages, updatedAt: o.updatedAt.trim() };
  }

  const bannerUrls = parseBannerUrlsFromRaw(o as Record<string, unknown>);
  if (!bannerUrls.length) return null;
  return { kind: "banner", bannerUrls, updatedAt: o.updatedAt.trim() };
}

export function normalizeWidgetAdMessages(raw: string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const t = String(item ?? "").trim();
    if (!t) continue;
    out.push(t.slice(0, RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS));
    if (out.length >= RETAILER_WIDGET_AD_MAX_MESSAGES) break;
  }
  if (!out.length) throw new Error("Add at least one promotional message.");
  return out;
}

export function normalizeWidgetAdBannerUrl(raw: string): string {
  const url = String(raw ?? "").trim();
  if (!url) throw new Error("Banner image is required.");
  if (url.length > RETAILER_WIDGET_AD_MAX_BANNER_CHARS) {
    throw new Error("Banner image is too large. Maximum size is 30MB.");
  }
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(url)) return url;
  throw new Error("Banner must be a JPEG, PNG, or WebP image.");
}

export function normalizeWidgetAdBannerUrls(raw: string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const url = normalizeWidgetAdBannerUrl(item);
    out.push(url);
    if (out.length >= RETAILER_WIDGET_AD_MAX_BANNERS) break;
  }
  if (!out.length) throw new Error("Add at least one banner image.");
  return out;
}

export type RetailerAdsEligibilityUser = {
  clientId?: string | null;
  subscriptionAccessUntil?: string | null;
};

/** Dashboard + embed: active plan with access window not expired. */
export function retailerHasActiveSubscriptionForAds(user: RetailerAdsEligibilityUser): boolean {
  if (!user.clientId?.trim()) return false;
  const until = user.subscriptionAccessUntil?.trim();
  if (until) {
    const ms = Date.parse(until);
    if (Number.isFinite(ms) && ms <= Date.now()) return false;
  }
  return true;
}

/** Public embed payload (no internal ids). */
export function widgetAdEmbedPayload(record: RetailerWidgetAdRecord | null) {
  if (!record) return { kind: "none" as const };
  if (record.kind === "text") {
    return { kind: "text" as const, messages: record.messages ?? [] };
  }
  return { kind: "banner" as const, bannerUrls: record.bannerUrls ?? [] };
}
