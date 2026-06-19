import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { restoreClientKey } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type RestoreBody = {
  clientId?: unknown;
};

/** Admin Recovery: re-enable soft-deleted client API key (embed / try-on). Does not restore retailer login. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: RestoreBody;
  try {
    body = (await req.json()) as RestoreBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId) {
    return Response.json({ error: "clientId is required." }, { status: 400 });
  }

  try {
    const rec = await restoreClientKey(clientId);
    const { fashnApiKey: _fashn, ...rest } = rec;
    return Response.json({ ok: true as const, key: rest });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to restore client key." },
      { status: 400 },
    );
  }
}
