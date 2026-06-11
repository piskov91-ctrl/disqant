import { getRedis } from "@/lib/apiKeyStore";

/**
 * Per-retailer flag granting unlimited "Try your own product" (custom) try-ons on the demo page.
 * Toggled by admins; bypasses the default 3-try IP/localStorage limit when enabled.
 */
const CUSTOM_TRYON_ACCESS_PREFIX = "fit-room:custom-tryon-access:";

export function customTryOnAccessKey(userId: string) {
  return `${CUSTOM_TRYON_ACCESS_PREFIX}${userId}`;
}

function parseEnabled(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  const s = String(raw).trim().toLowerCase();
  return s === "1" || s === "true";
}

/** Whether unlimited custom try-on access is enabled for this retailer user id. */
export async function getCustomTryOnAccess(userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;
  try {
    return parseEnabled(await getRedis().get(customTryOnAccessKey(id)));
  } catch {
    return false;
  }
}

/** Enable/disable unlimited custom try-on access for a retailer user id. */
export async function setCustomTryOnAccess(userId: string, enabled: boolean): Promise<void> {
  const id = userId.trim();
  if (!id) throw new Error("User id is required.");
  const redis = getRedis();
  if (enabled) {
    await redis.set(customTryOnAccessKey(id), "1");
  } else {
    await redis.del(customTryOnAccessKey(id));
  }
}

/** Map of userId → enabled for the given ids (single batched read). */
export async function getCustomTryOnAccessMap(
  userIds: string[],
): Promise<Record<string, boolean>> {
  const ids = userIds.map((u) => u.trim()).filter(Boolean);
  const out: Record<string, boolean> = {};
  if (ids.length === 0) return out;
  try {
    const redis = getRedis();
    const vals = (await redis.mget(...ids.map(customTryOnAccessKey))) as unknown[];
    ids.forEach((id, i) => {
      out[id] = parseEnabled(vals[i]);
    });
  } catch {
    for (const id of ids) out[id] = false;
  }
  return out;
}
