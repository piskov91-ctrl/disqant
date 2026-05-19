import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { totalTryOnsUsed } from "@/lib/clientTryOnBuckets";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "0%";
  const rounded1 = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded1) ? `${rounded1.toFixed(0)}%` : `${rounded1.toFixed(1)}%`;
}

export const TRY_ON_QUOTA_NEAR_LIMIT_EMAIL_SUBJECT_PREFIX = "Fit Room try-ons: " as const;

/** Upgrade CTA for quota emails (HTML button + plain-text fallback). */
export const FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL = "https://fit-room.com/subscriptions" as const;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveQuotaNoticeRecipients(client: ClientApiKeyRecord): Promise<{
  emailTargets: string[];
  storeName: string;
}> {
  const retailers = await listRetailersLinkedToClientId(client.id);
  const fromRetailers = retailers.map((r) => r.email.trim()).filter(Boolean);
  const contact = client.contactEmail?.trim();
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const addr of [...fromRetailers, ...(contact ? [contact] : [])]) {
    const k = addr.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(addr);
  }
  const storeName =
    retailers.find((r) => r.storeName.trim().length > 0)?.storeName.trim() ||
    client.clientName.trim() ||
    "there";
  return { emailTargets: merged, storeName };
}

function buildQuotaPlainText(storeName: string, used: number, limit: number, upgradeUrl: string) {
  const pct = formatPct((used / Math.max(1, limit)) * 100);
  return [
    `Hi ${storeName},`,
    "",
    `Just a quick heads-up — you've used ${used} out of your ${limit} monthly try-ons (${pct} of your plan).`,
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
  const pct = escapeHtml(formatPct((used / Math.max(1, limit)) * 100));
  const paragraphStyle = "margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fit Room try-ons update</title>
</head>
<body style="margin:0;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#fafafa;color:#3f3f46;">
  <p style="${paragraphStyle}">Hi ${safeName},</p>
  <p style="${paragraphStyle}">Just a quick heads-up — you've used ${used} out of your ${limit} monthly try-ons (${pct} of your plan).</p>
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

/** Plain-text part of the multipart usage reminder (75% or 99%). */
export function buildTryOnQuotaUsageEmailBody(params: {
  storeName: string;
  used: number;
  limit: number;
}): string {
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaPlainText(params.storeName, params.used, params.limit, upgradeUrl);
}

/** HTML part of the multipart usage reminder (75% or 99%). */
export function buildTryOnQuotaUsageEmailHtml(params: {
  storeName: string;
  used: number;
  limit: number;
}): string {
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaHtml(params.storeName, params.used, params.limit, upgradeUrl);
}

/** Smallest usage count ≥ 75% of `limit`, capped at `limit` (whole try-ons only). */
export function sampleTryOnUsageCountAtLeastSeventyFivePercent(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 800;
  return Math.min(Math.ceil((limit * 3) / 4), limit);
}

function buildUsageSubject(used: number, limit: number): string {
  const pct = formatPct((used / Math.max(1, limit)) * 100);
  return `${TRY_ON_QUOTA_NEAR_LIMIT_EMAIL_SUBJECT_PREFIX}${pct} used`;
}

/** Fire-and-forget: usage warning on first cross of 75%. */
export function sendTryOnUsageSeventyFivePctNoticeAsync(params: {
  client: ClientApiKeyRecord;
}) {
  const resendConfigured = isFitRoomEmailConfigured();
  console.log("[fit-room][email-debug] sendTryOnUsageSeventyFivePctNoticeAsync", {
    clientId: params.client.id,
    resendConfigured,
  });
  if (!resendConfigured) {
    console.log("[fit-room][email-debug] sendTryOnUsageSeventyFivePctNoticeAsync skipped (RESEND_API_KEY not set)");
    return;
  }

  void (async () => {
    const client = params.client;
    try {
      const { emailTargets, storeName } = await resolveQuotaNoticeRecipients(client);
      if (emailTargets.length === 0) {
        console.log("[fit-room][email-debug] sendTryOnUsageSeventyFivePctNoticeAsync skipped (no recipient emails)");
        return;
      }

      console.log("[fit-room][email-debug] sendTryOnUsageSeventyFivePctNoticeAsync sending", {
        clientId: client.id,
        recipientCount: emailTargets.length,
      });

      const bodyParams = {
        storeName,
        used: totalTryOnsUsed(client),
        limit: client.usageLimit,
      };
      const subject = buildUsageSubject(bodyParams.used, bodyParams.limit);
      const text = buildTryOnQuotaUsageEmailBody(bodyParams);
      const html = buildTryOnQuotaUsageEmailHtml(bodyParams);

      await Promise.all(
        emailTargets.map((to) =>
          sendFitRoomMail({ to, subject, text, html }).catch((err: unknown) => {
            console.error("[fit-room] try-on quota 75% email failed", {
              clientId: client.id,
              to,
              message: err instanceof Error ? err.message : String(err),
            });
          }),
        ),
      );
    } catch (e) {
      console.error("[fit-room] try-on quota 75% email pipeline failed", {
        clientId: client.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();
}

/** Fire-and-forget: usage warning on first reach of 99% (about to hit the limit). */
export function sendTryOnUsageNinetyNinePctNoticeAsync(params: { client: ClientApiKeyRecord }) {
  const resendConfigured = isFitRoomEmailConfigured();
  console.log("[fit-room][email-debug] sendTryOnUsageNinetyNinePctNoticeAsync", {
    clientId: params.client.id,
    resendConfigured,
    usageAtSend: totalTryOnsUsed(params.client),
    limit: params.client.usageLimit,
  });

  if (!resendConfigured) {
    console.log("[fit-room][email-debug] sendTryOnUsageNinetyNinePctNoticeAsync skipped (RESEND_API_KEY not set)");
    return;
  }

  void (async () => {
    const client = params.client;
    try {
      const { emailTargets, storeName } = await resolveQuotaNoticeRecipients(client);
      if (emailTargets.length === 0) {
        console.log("[fit-room][email-debug] sendTryOnUsageNinetyNinePctNoticeAsync skipped (no recipient emails)");
        return;
      }

      const bodyParams = { storeName, used: totalTryOnsUsed(client), limit: client.usageLimit };
      const subject = buildUsageSubject(bodyParams.used, bodyParams.limit);
      const text = buildTryOnQuotaUsageEmailBody(bodyParams);
      const html = buildTryOnQuotaUsageEmailHtml(bodyParams);

      await Promise.all(
        emailTargets.map((to) =>
          sendFitRoomMail({ to, subject, text, html }).catch((err: unknown) => {
            console.error("[fit-room] try-on quota 99% email failed", {
              clientId: client.id,
              to,
              message: err instanceof Error ? err.message : String(err),
            });
          }),
        ),
      );
    } catch (e) {
      console.error("[fit-room] try-on quota 99% email pipeline failed", {
        clientId: client.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  })();
}
