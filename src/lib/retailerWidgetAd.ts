/** Client-safe types, limits, and helpers — no Redis or auth imports. */

export type RetailerWidgetAdKind = "text" | "banner";

export type RetailerWidgetAdBannerSlide = {
  url: string;
  durationSec: number;
  /** Optional click-through URL shown during widget try-on generation. */
  linkUrl?: string;
};

export type RetailerWidgetAdRecord = {
  kind: RetailerWidgetAdKind;
  /** Promo lines shown during widget generation (text kind). */
  messages?: string[];
  /** Banner slides with per-image display duration (banner kind). */
  banners?: RetailerWidgetAdBannerSlide[];
  updatedAt: string;
};

/** Max banner file size per image (30 MiB). */
export const RETAILER_WIDGET_AD_MAX_BANNER_BYTES = 30 * 1024 * 1024;

/** Max stored payload per banner (base64 data URLs are ~4/3 the binary size). */
export const RETAILER_WIDGET_AD_MAX_BANNER_CHARS =
  Math.ceil(RETAILER_WIDGET_AD_MAX_BANNER_BYTES * (4 / 3)) + 128;

export const RETAILER_WIDGET_AD_MAX_MESSAGES = 5;
export const RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS = 220;

export const RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC = 10;
export const RETAILER_WIDGET_AD_MIN_BANNER_DURATION_SEC = 1;
export const RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC = 45;
export const RETAILER_WIDGET_AD_MAX_BANNER_LINK_CHARS = 2048;

export const RETAILER_WIDGET_AD_REDIS_PREFIX = "fit-room:retailer:widget-ad:";

export function retailerWidgetAdKey(clientId: string) {
  return `${RETAILER_WIDGET_AD_REDIS_PREFIX}${clientId.trim()}`;
}

export function normalizeWidgetAdBannerDuration(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC;
  return Math.min(
    RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC,
    Math.max(RETAILER_WIDGET_AD_MIN_BANNER_DURATION_SEC, Math.round(n)),
  );
}

function parseBannersFromRaw(raw: Record<string, unknown>): RetailerWidgetAdBannerSlide[] {
  if (Array.isArray(raw.banners)) {
    const out: RetailerWidgetAdBannerSlide[] = [];
    for (const item of raw.banners) {
      if (!item || typeof item !== "object") continue;
      const o = item as { url?: unknown; durationSec?: unknown; linkUrl?: unknown };
      const url = typeof o.url === "string" ? o.url.trim() : "";
      if (!url) continue;
      const slide: RetailerWidgetAdBannerSlide = {
        url,
        durationSec: normalizeWidgetAdBannerDuration(o.durationSec),
      };
      const link = typeof o.linkUrl === "string" ? o.linkUrl.trim() : "";
      if (link && /^https?:\/\//i.test(link)) {
        slide.linkUrl = link.slice(0, RETAILER_WIDGET_AD_MAX_BANNER_LINK_CHARS);
      }
      out.push(slide);
    }
    if (out.length) return out;
  }

  const legacyUrls: string[] = [];
  if (Array.isArray(raw.bannerUrls)) {
    legacyUrls.push(...raw.bannerUrls.map((u) => String(u ?? "").trim()).filter(Boolean));
  } else if (typeof raw.bannerUrl === "string" && raw.bannerUrl.trim()) {
    legacyUrls.push(raw.bannerUrl.trim());
  }

  return legacyUrls.map((url) => ({
    url,
    durationSec: RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC,
  }));
}

export function parseRetailerWidgetAdRecord(raw: unknown): RetailerWidgetAdRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<RetailerWidgetAdRecord>;
  const kind = o.kind === "text" || o.kind === "banner" ? o.kind : null;
  if (!kind || typeof o.updatedAt !== "string" || !o.updatedAt.trim()) return null;

  if (kind === "text") {
    const messages = Array.isArray(o.messages)
      ? o.messages.map((m) => String(m ?? "").trim()).filter(Boolean)
      : [];
    if (!messages.length) return null;
    return { kind: "text", messages, updatedAt: o.updatedAt.trim() };
  }

  const banners = parseBannersFromRaw(o as Record<string, unknown>);
  if (!banners.length) return null;
  return { kind: "banner", banners, updatedAt: o.updatedAt.trim() };
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

export function normalizeWidgetAdBannerLinkUrl(raw: unknown): string | undefined {
  const t = String(raw ?? "").trim();
  if (!t) return undefined;
  if (t.length > RETAILER_WIDGET_AD_MAX_BANNER_LINK_CHARS) {
    throw new Error("Banner link URL is too long.");
  }
  if (!/^https?:\/\//i.test(t)) {
    throw new Error("Banner link must start with http:// or https://");
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("Banner link must be http or https.");
    }
    return u.href;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Banner link")) throw e;
    throw new Error("Enter a valid banner link URL.");
  }
}

export type WidgetAdBannerInput = {
  url?: string;
  durationSec?: unknown;
  linkUrl?: unknown;
};

export function normalizeWidgetAdBanners(raw: WidgetAdBannerInput[]): RetailerWidgetAdBannerSlide[] {
  const out: RetailerWidgetAdBannerSlide[] = [];
  for (const item of raw) {
    const url = normalizeWidgetAdBannerUrl(String(item?.url ?? ""));
    const linkUrl = normalizeWidgetAdBannerLinkUrl(item?.linkUrl);
    const slide: RetailerWidgetAdBannerSlide = {
      url,
      durationSec: normalizeWidgetAdBannerDuration(item?.durationSec),
    };
    if (linkUrl) slide.linkUrl = linkUrl;
    out.push(slide);
  }
  if (!out.length) throw new Error("Add at least one banner image.");
  return out;
}

export function normalizeWidgetAdBannersFromUrls(urls: string[]): RetailerWidgetAdBannerSlide[] {
  return normalizeWidgetAdBanners(
    urls.map((url) => ({
      url,
      durationSec: RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC,
    })),
  );
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
  return { kind: "banner" as const, banners: record.banners ?? [] };
}
