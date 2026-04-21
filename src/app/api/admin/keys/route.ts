import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { createClientKey, listClientKeys } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  const ok = isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
  if (!ok) return false;
  return true;
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const keys = await listClientKeys();
  // Do not send raw Fashn keys to the browser.
  const redacted = keys.map((k) => {
    const { fashnApiKey, ...rest } = k;
    void fashnApiKey;
    return rest;
  });
  return Response.json({ keys: redacted });
}

type CreateBody = { clientName?: unknown; usageLimit?: unknown; fashnApiKey?: unknown };

export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientName = typeof body.clientName === "string" ? body.clientName : "";
  const fashnApiKey = typeof body.fashnApiKey === "string" ? body.fashnApiKey : "";
  const usageLimitNum =
    typeof body.usageLimit === "number"
      ? body.usageLimit
      : typeof body.usageLimit === "string"
        ? Number(body.usageLimit)
        : NaN;

  try {
    const rec = await createClientKey({ clientName, usageLimit: usageLimitNum, fashnApiKey });
    const { fashnApiKey: rawFashn, ...rest } = rec;
    void rawFashn;
    return Response.json({ key: rest });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to create key." },
      { status: 400 },
    );
  }
}

