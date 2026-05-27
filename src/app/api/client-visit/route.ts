import { getClientByApiKey } from "@/lib/apiKeyStore";
import { recordClientKeyVisit } from "@/lib/platformAnalytics";
import { resolveEmbedCorsAllowOrigin } from "@/lib/embedCors";

export const runtime = "nodejs";

const CLIENT_VISIT_CORS_BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export function OPTIONS(request: Request) {
  const allowOrigin = resolveEmbedCorsAllowOrigin(request.headers.get("Origin"));
  return new Response(null, {
    status: 204,
    headers: {
      ...CLIENT_VISIT_CORS_BASE_HEADERS,
      "Access-Control-Allow-Origin": allowOrigin,
    },
  });
}

function withClientVisitCors(response: Response, allowOrigin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  for (const [k, v] of Object.entries(CLIENT_VISIT_CORS_BASE_HEADERS)) {
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

/** Beacon when the embed widget loads on a retailer site (valid client key required). */
export async function POST(req: Request) {
  const corsAllowOrigin = resolveEmbedCorsAllowOrigin(req.headers.get("Origin"));
  const key = apiKeyFromRequest(req);
  if (!key)
    return withClientVisitCors(Response.json({ error: "Missing API key." }, { status: 401 }), corsAllowOrigin);

  const client = await getClientByApiKey(key);
  if (!client)
    return withClientVisitCors(Response.json({ error: "Invalid API key." }, { status: 401 }), corsAllowOrigin);

  await recordClientKeyVisit(client.id, client.clientName);
  return withClientVisitCors(Response.json({ ok: true as const }), corsAllowOrigin);
}
