import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { isFitRoomSmtpConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomSmtp";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

const SUBJECT = "You're almost there — your Fit Room try-ons are running low";

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

/** Fire-and-forget: notifies linked retailer account(s); safe to omit if SMTP or recipients missing. */
export function sendTryOnLimitEightyPctNoticeAsync(params: {
  client: ClientApiKeyRecord;
}) {
  if (!isFitRoomSmtpConfigured()) return;

  void (async () => {
    const client = params.client;
    try {
      const retailers = await listRetailersLinkedToClientId(client.id);
      const emailTargets = [...new Map(retailers.map((r) => [r.email.toLowerCase(), r.email])).values()];
      if (emailTargets.length === 0) return;

      const storeName =
        retailers.find((r) => r.storeName.trim().length > 0)?.storeName.trim() || client.clientName.trim() || "there";
      const upgradeUrl = resolveUpgradePlanUrl();
      const text = buildQuotaBody(storeName, client.usageCount, client.usageLimit, upgradeUrl);

      await Promise.all(
        emailTargets.map((to) =>
          sendFitRoomPlainTextMail({ to, subject: SUBJECT, text }).catch((err: unknown) => {
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

