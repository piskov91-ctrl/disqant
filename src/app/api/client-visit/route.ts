import { getClientByApiKey } from "@/lib/apiKeyStore";
import { recordClientKeyVisit } from "@/lib/platformAnalytics";

export const runtime = "nodejs";

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
  const key = apiKeyFromRequest(req);
  if (!key) return Response.json({ error: "Missing API key." }, { status: 401 });

  const client = await getClientByApiKey(key);
  if (!client) return Response.json({ error: "Invalid API key." }, { status: 401 });

  await recordClientKeyVisit(client.id, client.clientName);
  return Response.json({ ok: true as const });
}
