import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { isFitRoomSmtpConfigured, sendFitRoomMail } from "@/lib/fitRoomSmtp";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

export const TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT =
  "You're almost there — your Fit Room try-ons are running low" as const;

/** Upgrade CTA for the 80% usage reminder (HTML button + plain-text fallback). */
export const FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL = "https://fit-room.com/subscriptions" as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildQuotaPlainText(storeName: string, used: number, limit: number, upgradeUrl: string) {
  return [
    `Hi ${storeName},`,
    "",
    `Just a quick heads-up — you've used ${used} out of your ${limit} monthly try-ons, which means you're 80% through your current plan.`,
    "",
    "Your customers are clearly loving the virtual try-on experience! To make sure they never miss out, you might want to consider upgrading before you hit the limit. It only takes a minute and your store will stay live without any interruption.",
    "",
    "Upgrade your plan:",
    upgradeUrl,
    "",
    "If you have any questions, just reply to this email — we're always happy to help.",
    "",
    "Warm regards,",
    "The Fit Room Team",
  ].join("\n");
}

function buildQuotaHtml(storeName: string, used: number, limit: number, upgradeUrl: string) {
  const safeName = escapeHtml(storeName);
  const escapedUrl = escapeHtml(upgradeUrl);
  const paragraphStyle = "margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT}</title>
</head>
<body style="margin:0;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#fafafa;color:#3f3f46;">
  <p style="${paragraphStyle}">Hi ${safeName},</p>
  <p style="${paragraphStyle}">Just a quick heads-up — you've used ${used} out of your ${limit} monthly try-ons, which means you're 80% through your current plan.</p>
  <p style="${paragraphStyle}">Your customers are clearly loving the virtual try-on experience! To make sure they never miss out, you might want to consider upgrading before you hit the limit. It only takes a minute and your store will stay live without any interruption.</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="left" style="border-radius:10px;background-color:#18181b;">
        <a href="${escapedUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#fafafa;text-decoration:none;border-radius:10px;line-height:1.2;">Upgrade My Plan</a>
      </td>
    </tr>
  </table>
  <p style="${paragraphStyle}">If you have any questions, just reply to this email — we're always happy to help.</p>
  <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#3f3f46;">Warm regards,<br>The Fit Room Team</p>
</body>
</html>`;
}

export function getTryOnQuotaUpgradePlanUrl(): string {
  return FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
}

/** Plain-text part of the multipart 80% usage reminder. */
export function buildTryOnQuotaEightyPctEmailBody(params: {
  storeName: string;
  used: number;
  limit: number;
}): string {
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaPlainText(params.storeName, params.used, params.limit, upgradeUrl);
}

/** HTML part of the multipart 80% usage reminder (includes the upgrade button). */
export function buildTryOnQuotaEightyPctEmailHtml(params: {
  storeName: string;
  used: number;
  limit: number;
}): string {
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaHtml(params.storeName, params.used, params.limit, upgradeUrl);
}

/** Smallest usage count ≥ 80% of `limit`, capped at `limit` (whole try-ons only). */
export function sampleTryOnUsageCountAtLeastEightyPercent(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 800;
  return Math.min(Math.ceil((limit * 4) / 5), limit);
}

/** Fire-and-forget: linked retailer signup email(s) only. */
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

      const bodyParams = {
        storeName,
        used: client.usageCount,
        limit: client.usageLimit,
      };
      const text = buildTryOnQuotaEightyPctEmailBody(bodyParams);
      const html = buildTryOnQuotaEightyPctEmailHtml(bodyParams);

      await Promise.all(
        emailTargets.map((to) =>
          sendFitRoomMail({ to, subject: TRY_ON_QUOTA_EIGHTY_PCT_EMAIL_SUBJECT, text, html }).catch((err: unknown) => {
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
