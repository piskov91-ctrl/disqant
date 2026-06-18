import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import {
  deleteRetailerWidgetAd,
  getRetailerWidgetAd,
  normalizeWidgetAdBannerUrl,
  normalizeWidgetAdMessages,
  retailerHasActiveSubscriptionForAds,
  setRetailerWidgetAd,
  widgetAdEmbedPayload,
} from "@/lib/retailerWidgetAd";

export const runtime = "nodejs";

async function requireAdsRetailer() {
  const user = await getRetailerSessionUser();
  if (!user) return { error: Response.json({ error: "Unauthorized." }, { status: 401 }) };

  if (!retailerHasActiveSubscriptionForAds(user)) {
    return {
      error: Response.json(
        { error: "Ads are available with an active subscription." },
        { status: 403 },
      ),
    };
  }

  const clientId = user.clientId?.trim() ?? "";
  if (!clientId) {
    return {
      error: Response.json(
        { error: "No active plan. Choose a subscription to manage ads." },
        { status: 403 },
      ),
    };
  }

  const client = await getClientKeyRecordById(clientId);
  if (!client) {
    return { error: Response.json({ error: "API key record not found." }, { status: 404 }) };
  }

  return { user, clientId, client };
}

export async function GET() {
  const gate = await requireAdsRetailer();
  if ("error" in gate && gate.error) return gate.error;

  const record = await getRetailerWidgetAd(gate.clientId!);
  return Response.json({ ad: record, embed: widgetAdEmbedPayload(record) });
}

export async function DELETE() {
  const gate = await requireAdsRetailer();
  if ("error" in gate && gate.error) return gate.error;

  await deleteRetailerWidgetAd(gate.clientId!);
  return Response.json({ ok: true as const, embed: widgetAdEmbedPayload(null) });
}

type TextBody = { kind: "text"; messages: string[] };
type BannerBody = { kind: "banner"; bannerDataUrl: string };

export async function POST(req: Request) {
  const gate = await requireAdsRetailer();
  if ("error" in gate && gate.error) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const kind = (body as { kind?: unknown }).kind;

  try {
    if (kind === "text") {
      const messages = normalizeWidgetAdMessages(
        Array.isArray((body as TextBody).messages) ? (body as TextBody).messages : [],
      );
      const record = await setRetailerWidgetAd(gate.clientId!, { kind: "text", messages });
      return Response.json({ ok: true as const, ad: record, embed: widgetAdEmbedPayload(record) });
    }

    if (kind === "banner") {
      const bannerDataUrl =
        typeof (body as BannerBody).bannerDataUrl === "string"
          ? (body as BannerBody).bannerDataUrl
          : "";
      const bannerUrl = normalizeWidgetAdBannerUrl(bannerDataUrl);
      const record = await setRetailerWidgetAd(gate.clientId!, { kind: "banner", bannerUrl });
      return Response.json({ ok: true as const, ad: record, embed: widgetAdEmbedPayload(record) });
    }

    return Response.json({ error: "kind must be \"text\" or \"banner\"." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save ad.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
