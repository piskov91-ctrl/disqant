import "server-only";

import { getRedis } from "@/lib/apiKeyStore";
import {
  normalizeWidgetAdBannerUrls,
  normalizeWidgetAdMessages,
  parseRetailerWidgetAdRecord,
  retailerWidgetAdKey,
  type RetailerWidgetAdRecord,
} from "@/lib/retailerWidgetAd";

export async function getRetailerWidgetAd(clientId: string): Promise<RetailerWidgetAdRecord | null> {
  const id = clientId.trim();
  if (!id) return null;
  try {
    const raw = await getRedis().get(retailerWidgetAdKey(id));
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return parseRetailerWidgetAdRecord(JSON.parse(raw) as unknown);
      } catch {
        return null;
      }
    }
    return parseRetailerWidgetAdRecord(raw);
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
          bannerUrls: normalizeWidgetAdBannerUrls(record.bannerUrls ?? []),
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
