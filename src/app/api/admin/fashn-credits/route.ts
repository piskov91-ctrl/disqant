import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";

export const runtime = "nodejs";

const FASHN_CREDITS_URL = "https://api.fashn.ai/v1/credits";

type FashnCreditsPayload = {
  credits?: {
    total?: number;
    subscription?: number;
    on_demand?: number;
  };
};

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const apiKey = (process.env.FASHN_API_KEY || "").trim();
  if (!apiKey) {
    return Response.json(
      { error: "FASHN_API_KEY is not set in the server environment." },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(FASHN_CREDITS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not reach Fashn API." },
      { status: 502 },
    );
  }

  const text = await res.text();
  let data: FashnCreditsPayload & { error?: unknown };
  try {
    data = text ? (JSON.parse(text) as FashnCreditsPayload & { error?: unknown }) : {};
  } catch {
    return Response.json(
      { error: `Fashn credits response was not JSON (${res.status}).` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : data.error != null && typeof data.error === "object" && "message" in data.error
          ? String((data.error as { message?: unknown }).message)
          : text || `Fashn /credits failed (${res.status}).`;
    return Response.json({ error: msg.trim() || `Fashn /credits failed (${res.status}).` }, { status: 502 });
  }

  const c = data.credits;
  const total = typeof c?.total === "number" && Number.isFinite(c.total) ? c.total : null;
  const subscription =
    typeof c?.subscription === "number" && Number.isFinite(c.subscription) ? c.subscription : null;
  const onDemand = typeof c?.on_demand === "number" && Number.isFinite(c.on_demand) ? c.on_demand : null;

  const resolvedTotal =
    total ?? (subscription != null && onDemand != null ? subscription + onDemand : null);

  if (resolvedTotal === null && subscription === null && onDemand === null) {
    return Response.json({ error: "Fashn returned no usable credit fields." }, { status: 502 });
  }

  return Response.json({
    credits: {
      total: resolvedTotal,
      subscription,
      onDemand,
    },
  });
}
