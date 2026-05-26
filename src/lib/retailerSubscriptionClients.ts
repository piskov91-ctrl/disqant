import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { getClientKeyRecordById, listClientKeys } from "@/lib/apiKeyStore";
import { normalizeClientTryOnBuckets, storedOrDerivedBasePlanLimit, totalTryOnsUsed } from "@/lib/clientTryOnBuckets";
import type { RetailerUser } from "@/lib/retailerAuth";
import { getSubscriptionPlanDefinition, parseSubscriptionPlanKey, planLabelFromTryOnLimit } from "@/lib/subscriptionPlans";

export function normalizeRetailerBillingEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Clients that bill to this retailer: always the linked storefront key when present,
 * plus any other indexed API keys sharing the retailer account email.
 */
export async function listSubscriptionClientRecordsForRetailerDashboard(
  user: Pick<RetailerUser, "email" | "clientId">,
): Promise<ClientApiKeyRecord[]> {
  const emailNorm = normalizeRetailerBillingEmail(user.email);
  const linkedId = user.clientId?.trim() ?? "";
  const byId = new Map<string, ClientApiKeyRecord>();

  if (linkedId) {
    const full = await getClientKeyRecordById(linkedId);
    if (full && !full.deletedAt) {
      byId.set(full.id, normalizeClientTryOnBuckets(full));
    }
  }

  const summaries = (await listClientKeys()).map((k) => normalizeClientTryOnBuckets(k));
  for (const k of summaries) {
    if (normalizeRetailerBillingEmail(k.contactEmail ?? "") !== emailNorm) continue;
    const full = await getClientKeyRecordById(k.id);
    if (!full || full.deletedAt) continue;
    byId.set(full.id, normalizeClientTryOnBuckets(full));
  }

  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export type RetailerDashboardSubscriptionClientUsagePayload = {
  clientId: string;
  clientName: string;
  keyPrefix: string;
  isLinked: boolean;
  usageCount: number;
  usageLimit: number;
  basePlanLimit: number;
  planUsageCount: number;
  /** @deprecated use basePlanLimit */
  planLimit: number;
  topUpUsageCount: number;
  topUpLimit: number;
  billingAnchorDay?: number;
  createdAt: string;
  /** Next monthly plan bucket (try-ons) after the current subscription bucket is fully used. */
  pendingBasePlanLimit?: number | null;
  pendingPlanDisplayName?: string | null;
  pendingSubscriptionPlanKey?: string | null;
  pendingPlanRecordedAt?: string | null;
};

export function buildRetailerSubscriptionClientUsagePayload(
  client: ClientApiKeyRecord,
  linkedClientId: string | null,
): RetailerDashboardSubscriptionClientUsagePayload {
  const basePlanLimit = storedOrDerivedBasePlanLimit(client);
  const trimmedLinked = linkedClientId?.trim() || null;
  const pendLim = client.pendingBasePlanLimit;
  let pendingBasePlanLimit: number | null = null;
  let pendingPlanDisplayName: string | null = null;
  let pendingSubscriptionPlanKey: string | null = null;
  if (pendLim != null && Number.isFinite(pendLim)) {
    pendingBasePlanLimit = Math.floor(pendLim);
    const pk = client.pendingSubscriptionPlanKey?.trim()
      ? parseSubscriptionPlanKey(client.pendingSubscriptionPlanKey)
      : null;
    pendingSubscriptionPlanKey = client.pendingSubscriptionPlanKey?.trim().toLowerCase() || null;
    pendingPlanDisplayName = pk ? getSubscriptionPlanDefinition(pk).name : planLabelFromTryOnLimit(pendingBasePlanLimit);
  }
  return {
    clientId: client.id,
    clientName: client.clientName,
    keyPrefix: `${(client.key || "").slice(0, 8)}…`,
    isLinked: Boolean(trimmedLinked && client.id === trimmedLinked),
    usageCount: totalTryOnsUsed(client),
    usageLimit: client.usageLimit,
    basePlanLimit,
    planUsageCount: client.usageCount,
    planLimit: basePlanLimit,
    topUpUsageCount: client.topUpUsageCount ?? 0,
    topUpLimit: client.topUpLimit ?? 0,
    billingAnchorDay: client.billingAnchorDay,
    createdAt: client.createdAt,
    pendingBasePlanLimit,
    pendingPlanDisplayName,
    pendingSubscriptionPlanKey,
    pendingPlanRecordedAt:
      pendingBasePlanLimit != null ? (typeof client.pendingPlanRecordedAt === "string" ? client.pendingPlanRecordedAt : null) : null,
  };
}
