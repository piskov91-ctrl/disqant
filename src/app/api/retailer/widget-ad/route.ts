import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import {
  normalizeWidgetAdBanners,
  normalizeWidgetAdBannersFromUrls,
  normalizeWidgetAdMessages,
  retailerHasActiveSubscriptionForAds,
  widgetAdEmbedPayload,
  type WidgetAdBannerInput,
} from "@/lib/retailerWidgetAd";
import {
  deleteRetailerWidgetAd,
  getRetailerWidgetAd,
  setRetailerWidgetAd,
} from "@/lib/retailerWidgetAdStore";

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
type BannerBody = {
  kind: "banner";
  banners?: WidgetAdBannerInput[];
  bannerDataUrls?: string[];
  bannerDataUrl?: string;
};

function bannersFromBody(body: BannerBody): WidgetAdBannerInput[] {
  if (Array.isArray(body.banners) && body.banners.length) {
    return body.banners;
  }
  const urls: string[] = [];
  if (Array.isArray(body.bannerDataUrls) && body.bannerDataUrls.length) {
    urls.push(...body.bannerDataUrls);
  } else if (typeof body.bannerDataUrl === "string" && body.bannerDataUrl.trim()) {
    urls.push(body.bannerDataUrl);
  }
  return urls.map((url) => ({ url, durationSec: undefined }));
}

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
      const bannerBody = body as BannerBody;
      const bannersInput = bannersFromBody(bannerBody);
      const banners =
        Array.isArray(bannerBody.banners) && bannerBody.banners.length
          ? normalizeWidgetAdBanners(bannersInput)
          : normalizeWidgetAdBannersFromUrls(
              bannersInput.map((b) => String(b.url ?? "")).filter(Boolean),
            );
      const record = await setRetailerWidgetAd(gate.clientId!, { kind: "banner", banners });
      return Response.json({ ok: true as const, ad: record, embed: widgetAdEmbedPayload(record) });
    }

    return Response.json({ error: "kind must be \"text\" or \"banner\"." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save ad.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
