import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { setRetailerInternalDemo } from "@/lib/retailerInternalDemo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type PostBody = {
  userId?: unknown;
  enabled?: unknown;
};

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const enabled = body.enabled === true;
  if (!userId) {
    return Response.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    await setRetailerInternalDemo(userId, enabled);
    return Response.json({ ok: true, userId, enabled });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to update internal/demo flag." },
      { status: 400 },
    );
  }
}
