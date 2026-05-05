import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { normalizeClientBillingEmailInput } from "@/lib/apiKeyStore";
import { isFitRoomSmtpConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomSmtp";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

export const TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT =
  "You're almost there — your Fit Room try-ons are running low" as const;

function resolveSiteOrigin(): string {
  const explicit = process.env.FIT_ROOM_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const t = explicit?.trim().replace(/\/$/, "") ?? "";
  if (t) return t.startsWith("http") ? t : `https://${t}`;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "") ?? "";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "https://fit-room.com";
}

function resolveUpgradePlanUrl(): string {
  const path = "/subscriptions";
  const override = process.env.FIT_ROOM_UPGRADE_PATH?.trim();
  const normalized = override
    ? override.startsWith("/")
      ? override
      : `/${override}`
    : path;
  return `${resolveSiteOrigin()}${normalized}`;
}

function buildQuotaBody(storeName: string, used: number, limit: number, upgradeUrl: string) {
  return [
    `Hi ${storeName},`,
    "",
    `Just a quick heads-up — you've used ${used} out of your ${limit} monthly try-ons, which means you're 80% through your current plan.`,
    "",
    "Your customers are clearly loving the virtual try-on experience! To make sure they never miss out, you might want to consider upgrading before you hit the limit. It only takes a minute and your store will stay live without any interruption.",
    "",
    `Upgrade your plan here: ${upgradeUrl}`,
    "",
    "If you have any questions, just reply to this email — we're always happy to help.",
    "",
    "Warm regards,",
    "The Fit Room Team",
  ].join("\n");
}

export function getTryOnQuotaUpgradePlanUrl(): string {
  return resolveUpgradePlanUrl();
}

/** Plaintext body for the 80% usage reminder (upgrade URL mirrors production env). */
export function buildTryOnQuotaEightyPctEmailBody(params: {
  storeName: string;
  used: number;
  limit: number;
}): string {
  const upgradeUrl = resolveUpgradePlanUrl();
  return buildQuotaBody(params.storeName, params.used, params.limit, upgradeUrl);
}

/** Smallest usage count ≥ 80% of `limit`, capped at `limit` (whole try-ons only). */
export function sampleTryOnUsageCountAtLeastEightyPercent(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 800;
  return Math.min(Math.ceil((limit * 4) / 5), limit);
}

function resolveTryOnQuotaNotificationRecipients(
  client: ClientApiKeyRecord,
  retailers: Awaited<ReturnType<typeof listRetailersLinkedToClientId>>,
): string[] {
  try {
    const fromStored = normalizeClientBillingEmailInput(client.billingEmail);
    if (fromStored) return [fromStored];
  } catch {
    // Skip invalid stored value (should not happen).
  }
  return [...new Map(retailers.map((r) => [r.email.toLowerCase(), r.email])).values()];
}

function greetingStoreNameFromContext(
  client: ClientApiKeyRecord,
  retailers: Awaited<ReturnType<typeof listRetailersLinkedToClientId>>,
): string {
  return retailers.find((r) => r.storeName.trim().length > 0)?.storeName.trim() || client.clientName.trim() || "there";
}

/** Fire-and-forget; uses client billing email when set, else linked retailer signup addresses. */
export function sendTryOnLimitEightyPctNoticeAsync(params: {
  client: ClientApiKeyRecord;
}) {
  if (!isFitRoomSmtpConfigured()) return;

  void (async () => {
    const client = params.client;
    try {
      const retailers = await listRetailersLinkedToClientId(client.id);
      const emailTargets = resolveTryOnQuotaNotificationRecipients(client, retailers);
      if (emailTargets.length === 0) return;

      const storeName = greetingStoreNameFromContext(client, retailers);

      const text = buildTryOnQuotaEightyPctEmailBody({
        storeName,
        used: client.usageCount,
        limit: client.usageLimit,
      });

      await Promise.all(
        emailTargets.map((to) =>
          sendFitRoomPlainTextMail({ to, subject: TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT, text }).catch((err: unknown) => {
            console.error("[fit-room] try-on quota 80% email failed", {
              clientId: client.id,
              to,
              message: err instanceof Error ? err.message : String(err),
            });
          }),
        ),
      );
    } catch (e) {
      console.error("[fit-room] try-on quota 80% email pipeline failed", {
        clientId: client.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();
}
