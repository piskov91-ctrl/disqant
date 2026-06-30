import { getRedis } from "@/lib/apiKeyStore";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

/**
 * Admin flag: internal/demo retailer accounts — unlimited try-ons, no subscription, no billing.
 * Redis key per retailer user id (not stored on the user record).
 */
const INTERNAL_DEMO_PREFIX = "fit-room:retailer:internal-demo:";

export function retailerInternalDemoKey(userId: string) {
  return `${INTERNAL_DEMO_PREFIX}${userId}`;
}

function parseEnabled(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === 1) return true;
  if (typeof raw === "string") return raw.trim() === "1" || raw.trim().toLowerCase() === "true";
  return false;
}

export async function isRetailerInternalDemo(userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;
  try {
    return parseEnabled(await getRedis().get(retailerInternalDemoKey(id)));
  } catch {
    return false;
  }
}

export async function setRetailerInternalDemo(userId: string, enabled: boolean): Promise<void> {
  const id = userId.trim();
  if (!id) throw new Error("User id is required.");
  const redis = getRedis();
  if (enabled) {
    await redis.set(retailerInternalDemoKey(id), "1");
  } else {
    await redis.del(retailerInternalDemoKey(id));
  }
}

export async function getRetailerInternalDemoMap(
  userIds: string[],
): Promise<Record<string, boolean>> {
  const ids = [...new Set(userIds.map((u) => u.trim()).filter(Boolean))];
  const out: Record<string, boolean> = {};
  if (ids.length === 0) return out;
  const results = await Promise.all(ids.map((id) => isRetailerInternalDemo(id)));
  ids.forEach((id, i) => {
    out[id] = results[i] ?? false;
  });
  return out;
}

/** True when any retailer linked to this client API key record is marked internal/demo. */
export async function isClientKeyInternalDemo(clientId: string): Promise<boolean> {
  const cid = clientId.trim();
  if (!cid) return false;
  const retailers = await listRetailersLinkedToClientId(cid);
  for (const r of retailers) {
    if (await isRetailerInternalDemo(r.userId)) return true;
  }
  return false;
}
