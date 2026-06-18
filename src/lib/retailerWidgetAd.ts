import { getRedis } from "@/lib/apiKeyStore";
import type { RetailerUser } from "@/lib/retailerAuth";

export type RetailerWidgetAdKind = "text" | "banner";

export type RetailerWidgetAdRecord = {
  kind: RetailerWidgetAdKind;
  /** Promo lines shown during widget generation (text kind). */
  messages?: string[];
  /** JPEG/PNG/WebP data URL or https URL (banner kind). */
  bannerUrl?: string;
  updatedAt: string;
};

const WIDGET_AD_PREFIX = "fit-room:retailer:widget-ad:";

/** Max stored banner payload (~300KB image as data URL). */
export const RETAILER_WIDGET_AD_MAX_BANNER_CHARS = 420_000;

export const RETAILER_WIDGET_AD_MAX_MESSAGES = 5;
export const RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS = 220;

export function retailerWidgetAdKey(clientId: string) {
  return `${WIDGET_AD_PREFIX}${clientId.trim()}`;
}

function parseRecord(raw: unknown): RetailerWidgetAdRecord | null {
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

  const bannerUrl = typeof o.bannerUrl === "string" ? o.bannerUrl.trim() : "";
  if (!bannerUrl) return null;
  return { kind: "banner", bannerUrl, updatedAt: o.updatedAt.trim() };
}

export async function getRetailerWidgetAd(clientId: string): Promise<RetailerWidgetAdRecord | null> {
  const id = clientId.trim();
  if (!id) return null;
  try {
    const raw = await getRedis().get(retailerWidgetAdKey(id));
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return parseRecord(JSON.parse(raw) as unknown);
      } catch {
        return null;
      }
    }
    return parseRecord(raw);
  } catch {
    return null;
  }
}

export async function setRetailerWidgetAd(
  clientId: string,
  record: Omit<RetailerWidgetAdRecord, "updatedAt"> & { updatedAt?: string },
): Promise<RetailerWidgetAdRecord> {
  const id = clientId.trim();
  if (!id) throw new Error("Client id is required.");

  const next: RetailerWidgetAdRecord = {
    kind: record.kind,
    updatedAt: record.updatedAt?.trim() || new Date().toISOString(),
    ...(record.kind === "text"
      ? {
          messages: normalizeWidgetAdMessages(record.messages ?? []),
        }
      : {
          bannerUrl: normalizeWidgetAdBannerUrl(record.bannerUrl ?? ""),
        }),
  };

  await getRedis().set(retailerWidgetAdKey(id), JSON.stringify(next));
  return next;
}

export async function deleteRetailerWidgetAd(clientId: string): Promise<void> {
  const id = clientId.trim();
  if (!id) throw new Error("Client id is required.");
  await getRedis().del(retailerWidgetAdKey(id));
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
    throw new Error("Banner image is too large. Use a smaller image (max ~300KB).");
  }
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(url)) return url;
  throw new Error("Banner must be a JPEG, PNG, or WebP image.");
}

/** Dashboard + embed: active plan with access window not expired. */
export function retailerHasActiveSubscriptionForAds(
  user: Pick<RetailerUser, "clientId" | "subscriptionAccessUntil">,
): boolean {
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
  return { kind: "banner" as const, bannerUrl: record.bannerUrl ?? "" };
}
