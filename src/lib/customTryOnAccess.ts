import { getRedis } from "@/lib/apiKeyStore";

/**
 * Per-retailer flag granting unlimited "Try your own product" (custom) try-ons on the demo page.
 * Toggled by admins; bypasses the default 3-try IP/localStorage limit when enabled.
 */
const CUSTOM_TRYON_ACCESS_PREFIX = "fit-room:custom-tryon-access:";

export function customTryOnAccessKey(userId: string) {
  return `${CUSTOM_TRYON_ACCESS_PREFIX}${userId}`;
}

/**
 * Strictly interprets the stored flag. Access is OFF unless the value is exactly the enabled
 * sentinel (`"1"`, number `1`, or boolean `true`). Missing keys (`null`/`undefined`) are OFF.
 */
function parseEnabled(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === 1) return true;
  if (typeof raw === "string") return raw.trim() === "1" || raw.trim().toLowerCase() === "true";
  return false;
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

/**
 * Map of userId → enabled for the given ids. Uses per-key reads (same reliable path as
 * {@link getCustomTryOnAccess}) so the value is interpreted identically everywhere — a key that
 * does not exist is always OFF.
 */
export async function getCustomTryOnAccessMap(
  userIds: string[],
): Promise<Record<string, boolean>> {
  const ids = [...new Set(userIds.map((u) => u.trim()).filter(Boolean))];
  const out: Record<string, boolean> = {};
  if (ids.length === 0) return out;
  const results = await Promise.all(ids.map((id) => getCustomTryOnAccess(id)));
  ids.forEach((id, i) => {
    out[id] = results[i] ?? false;
  });
  return out;
}
