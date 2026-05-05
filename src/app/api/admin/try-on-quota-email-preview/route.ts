import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { getClientKeyRecordById, normalizeClientBillingEmailInput } from "@/lib/apiKeyStore";
import { resolveFitRoomSmtpFrom } from "@/lib/fitRoomSmtp";
import {
  TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT,
  buildTryOnQuotaEightyPctEmailBody,
  getTryOnQuotaUpgradePlanUrl,
  sampleTryOnUsageCountAtLeastEightyPercent,
} from "@/lib/usageTryOnQuotaEmail";
import { listRetailersLinkedToClientId, type RetailerEmailForQuotaNotice } from "@/lib/retailerAuth";

export const runtime = "nodejs";

function buildQuotaDeliveryHint(
  client: ClientApiKeyRecord,
  retailers: RetailerEmailForQuotaNotice[],
): string {
  try {
    const b = normalizeClientBillingEmailInput(client.billingEmail);
    if (b) return `Live send goes to billing email ${b}.`;
  } catch {
    return "Billing email on file is invalid — edit this client and fix it.";
  }
  const emails = retailers.map((r) => r.email).filter(Boolean);
  if (emails.length > 0) {
    return `No billing email saved; live send uses linked retailer signup: ${emails.join(", ")}.`;
  }
  return "No billing email and no linked retailer accounts — reminders will not send.";
}

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId")?.trim();

  let previewStoreLabel = "Example Boutique";
  let usageLimit = 1000;

  let deliveryHint =
    "For real clients with a billing email stored in admin, reminders go there; otherwise to linked retailer signup addresses.";

  if (clientId) {
    const client = await getClientKeyRecordById(clientId);
    if (!client) {
      return Response.json({ error: "Client not found." }, { status: 404 });
    }

    usageLimit = client.usageLimit;
    const retailers = await listRetailersLinkedToClientId(client.id);
    previewStoreLabel =
      retailers.find((r) => r.storeName.trim().length > 0)?.storeName.trim() ||
      client.clientName.trim() ||
      "your store";
    deliveryHint = buildQuotaDeliveryHint(client, retailers);
  }

  const sampleUsed = sampleTryOnUsageCountAtLeastEightyPercent(usageLimit);
  const body = buildTryOnQuotaEightyPctEmailBody({
    storeName: previewStoreLabel,
    used: sampleUsed,
    limit: usageLimit,
  });

  return Response.json({
    subject: TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT,
    body,
    from: resolveFitRoomSmtpFrom(),
    upgradeUrl: getTryOnQuotaUpgradePlanUrl(),
    sampleUsed,
    sampleLimit: usageLimit,
    previewStoreLabel,
    deliveryHint,
    caption:
      "Uses illustrative counts at roughly 80% of the plan's try-on limit — same plaintext template merchants receive.",
  });
}
