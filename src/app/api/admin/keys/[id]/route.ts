import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { deleteClientKey, updateClientKey } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type PatchBody = {
  clientName?: unknown;
  contactEmail?: unknown;
  monthlyPlanLimit?: unknown;
  topUpLimit?: unknown;
  fashnApiKey?: unknown;
};

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

  const monthlyPlanLimitNum =
    typeof body.monthlyPlanLimit === "number"
      ? body.monthlyPlanLimit
      : typeof body.monthlyPlanLimit === "string"
        ? Number(body.monthlyPlanLimit)
        : NaN;
  const topUpLimitNum =
    typeof body.topUpLimit === "number"
      ? body.topUpLimit
      : typeof body.topUpLimit === "string"
        ? Number(body.topUpLimit)
        : NaN;

  const patch: Parameters<typeof updateClientKey>[0] = {
    id,
    clientName,
    monthlyPlanLimit: monthlyPlanLimitNum,
    topUpLimit: Number.isFinite(topUpLimitNum) ? Math.floor(topUpLimitNum) : NaN,
  };
  if (typeof body.fashnApiKey === "string" && body.fashnApiKey.trim()) {
    patch.fashnApiKey = body.fashnApiKey.trim();
  }
  if (typeof body.contactEmail === "string") {
    patch.contactEmail = body.contactEmail;
  }

  try {
    const rec = await updateClientKey(patch);
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
