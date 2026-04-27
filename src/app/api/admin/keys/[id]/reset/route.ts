import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { resetUsage } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const rec = await resetUsage(id);
    return Response.json({ ok: true, usageCount: rec.usageCount });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to reset try-ons used." },
      { status: 400 },
    );
  }
}

