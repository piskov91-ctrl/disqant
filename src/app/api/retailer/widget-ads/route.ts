import { getClientByApiKey } from "@/lib/apiKeyStore";
import { widgetAdEmbedPayload } from "@/lib/retailerWidgetAd";
import { getRetailerWidgetAd } from "@/lib/retailerWidgetAdStore";
import { resolveEmbedCorsAllowOrigin } from "@/lib/embedCors";

export const runtime = "nodejs";

const WIDGET_ADS_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-fit-room-api-key, x-disquant-api-key",
};

export function OPTIONS(request: Request) {
  const allowOrigin = resolveEmbedCorsAllowOrigin(request.headers.get("Origin"));
  return new Response(null, {
    status: 204,
    headers: {
      ...WIDGET_ADS_CORS_HEADERS,
      "Access-Control-Allow-Origin": allowOrigin,
    },
  });
}

function withEmbedCors(response: Response, allowOrigin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  for (const [k, v] of Object.entries(WIDGET_ADS_CORS_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function apiKeyFromRequest(req: Request): string | null {
  const h =
    req.headers.get("x-api-key") ||
    req.headers.get("x-fit-room-api-key") ||
    req.headers.get("x-disquant-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice("Bearer ".length)
      : null);
  const t = h?.trim();
  return t || null;
}

/** Widget embed: retailer loading-overlay ads (valid client API key required). */
export async function GET(req: Request) {
  const corsAllowOrigin = resolveEmbedCorsAllowOrigin(req.headers.get("Origin"));
  const key = apiKeyFromRequest(req);
  if (!key) {
    return withEmbedCors(Response.json({ error: "Missing API key." }, { status: 401 }), corsAllowOrigin);
  }

  const client = await getClientByApiKey(key);
  if (!client) {
    return withEmbedCors(Response.json({ error: "Invalid API key." }, { status: 401 }), corsAllowOrigin);
  }

  const record = await getRetailerWidgetAd(client.id);
  return withEmbedCors(Response.json(widgetAdEmbedPayload(record)), corsAllowOrigin);
}
