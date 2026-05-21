import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { totalTryOnsUsed } from "@/lib/clientTryOnBuckets";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  transactionalCtaHtml,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";
import { listRetailersLinkedToClientId } from "@/lib/retailerAuth";

export type TryOnQuotaEmailTone = "runningLow" | "atMonthlyCap";

/** For admin previews: `tone=cap|atMonthlyCap` selects the heavier copy variant. */
export function parseTryOnQuotaEmailToneParam(raw: string | null): TryOnQuotaEmailTone {
  const t = raw?.trim().toLowerCase();
  if (t === "cap" || t === "atcap" || t === "full" || t === "limit") {
    return "atMonthlyCap";
  }
  return "runningLow";
}

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "0%";
  const rounded1 = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded1) ? `${rounded1.toFixed(0)}%` : `${rounded1.toFixed(1)}%`;
}

/** Upgrade CTA for quota emails (HTML button + plain-text fallback). */
export const FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL = "https://fit-room.com/subscriptions" as const;

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

function quotaPlainToneCopy(tone: TryOnQuotaEmailTone, upgradeUrl: string): {
  preheader: string;
  paragraphLines: string[];
} {
  if (tone === "atMonthlyCap") {
    return {
      preheader: "You've used your allotment for this billing month.",
      paragraphLines: [
        "You've used every try-on in your allowance for this month. Anything new waits until your counter resets, unless you notch the plan up a tier.",
        "No drama — bumping the limit is fast, and you can always sit tight instead if you'd rather.",
        `If it's useful, here's the billing page:${"\n"}${upgradeUrl}`,
        "Reply anytime if you want a steer on what's sensible for your traffic. We read everything ourselves.",
      ],
    };
  }
  return {
    preheader: "You're making good progress on your monthly try-on allowance.",
    paragraphLines: [
      "Thought we'd drop you a polite note early. Things are ticking along nicely, and we'd rather you hear from us before the meter runs dry.",
      "You've still got runway, so nothing pauses tonight — we just didn't want surprises later in the month.",
      `When you have two minutes:${"\n"}${upgradeUrl}`,
      "Hit reply if you'd rather chat it through live; it's the same inbox as this message.",
    ],
  };
}

function buildQuotaPlainText(storeName: string, used: number, limit: number, upgradeUrl: string, tone: TryOnQuotaEmailTone) {
  const pct = formatPct((used / Math.max(1, limit)) * 100);
  const { paragraphLines } = quotaPlainToneCopy(tone, upgradeUrl);
  return [
    `Hi ${storeName},`,
    "",
    `By the numbers: ${used} of ${limit} try-ons this billing month (${pct}).`,
    "",
    ...paragraphLines.flatMap((p) => [p, ""]),
    "Warmly,",
    "The Fit Room team",
  ].join("\n");
}

function buildQuotaHtml(storeName: string, used: number, limit: number, upgradeUrl: string, tone: TryOnQuotaEmailTone) {
  const pct = formatPct((used / Math.max(1, limit)) * 100);
  const { preheader } = quotaPlainToneCopy(tone, upgradeUrl);
  const heading = tone === "atMonthlyCap" ? "You've hit your monthly allowance" : "You're getting closer to your cap";
  const inner =
    transactionalParagraph(`Hi ${storeName},`) +
    transactionalParagraph(
      `By the numbers you've used ${used} of ${limit} try-ons this month (${pct} of your allotment). That's the busy kind of month we're hoping you have.`,
    ) +
    (tone === "atMonthlyCap"
      ? transactionalParagraph(
          "You've reached the ceiling on this tier for now. Sessions will politely wait until things reset unless you give the quota a bump — whichever feels right.",
        )
      : transactionalParagraph(
          "There's still elbow room today. We're only writing because nobody likes scrambling on the last afternoon of the month.",
        )) +
    transactionalParagraph("If you'd like uninterrupted flow while traffic grows:") +
    transactionalCtaHtml(upgradeUrl, "Open subscription options") +
    transactionalParagraph("Otherwise do nothing — we just appreciate you letting us sit in your inbox.") +
    transactionalParagraph("Warmly,") +
    transactionalParagraph("The Fit Room team");

  return wrapFitRoomTransactionalHtml({
    documentTitle: "Try-on usage",
    preheader,
    heading,
    innerHtml: inner,
  });
}

export function getTryOnQuotaUpgradePlanUrl(): string {
  return FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
}

export function buildTryOnQuotaUsageEmailSubject(params: { tone: TryOnQuotaEmailTone }): string {
  if (params.tone === "atMonthlyCap") {
    return "Fit Room — you're at your monthly try-on allowance";
  }
  return "Fit Room — gentle nudge before you tap out on try-ons";
}

/** Plain-text part of the usage reminder (`runningLow`: ~75% trigger, `atMonthlyCap`: ~99%). */
export function buildTryOnQuotaUsageEmailBody(params: {
  storeName: string;
  used: number;
  limit: number;
  tone?: TryOnQuotaEmailTone;
}): string {
  const tone = params.tone ?? "runningLow";
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaPlainText(params.storeName, params.used, params.limit, upgradeUrl, tone);
}

/** HTML part of the multipart usage reminder. */
export function buildTryOnQuotaUsageEmailHtml(params: {
  storeName: string;
  used: number;
  limit: number;
  tone?: TryOnQuotaEmailTone;
}): string {
  const tone = params.tone ?? "runningLow";
  const upgradeUrl = FIT_ROOM_TRY_ON_QUOTA_UPGRADE_URL;
  return buildQuotaHtml(params.storeName, params.used, params.limit, upgradeUrl, tone);
}

/** Smallest usage count ≥ 75% of `limit`, capped at `limit` (whole try-ons only). */
export function sampleTryOnUsageCountAtLeastSeventyFivePercent(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 800;
  return Math.min(Math.ceil((limit * 3) / 4), limit);
}

/** Fire-and-forget: usage heads-up around 75%. */
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

      const used = totalTryOnsUsed(client);
      const limit = client.usageLimit;
      const tone: TryOnQuotaEmailTone = "runningLow";
      const subject = buildTryOnQuotaUsageEmailSubject({ tone });
      const bodyParams = { storeName, used, limit, tone };
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

/** Fire-and-forget: usage alert right before hitting the ceiling (~99%). */
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

      const used = totalTryOnsUsed(client);
      const limit = client.usageLimit;
      const tone: TryOnQuotaEmailTone = "atMonthlyCap";
      const subject = buildTryOnQuotaUsageEmailSubject({ tone });
      const bodyParams = { storeName, used, limit, tone };
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
