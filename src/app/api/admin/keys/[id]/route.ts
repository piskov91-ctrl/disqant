import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { deleteClientKey, updateClientKey } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type PatchBody = { clientName?: unknown; usageLimit?: unknown };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientName = typeof body.clientName === "string" ? body.clientName : "";
  const usageLimitNum =
    typeof body.usageLimit === "number"
      ? body.usageLimit
      : typeof body.usageLimit === "string"
        ? Number(body.usageLimit)
        : NaN;

  try {
    const rec = await updateClientKey({ id, clientName, usageLimit: usageLimitNum });
    const { fashnApiKey: rawFashn, ...rest } = rec;
    void rawFashn;
    return Response.json({ key: rest });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to update key." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await deleteClientKey(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete key." },
      { status: 400 },
    );
  }
}

