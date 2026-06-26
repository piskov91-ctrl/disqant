import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { runAdminSystemStatusChecks } from "@/lib/adminSystemStatus";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const status = await runAdminSystemStatusChecks(request);
    return Response.json(status);
  } catch (e) {
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Could not run system status checks.",
      },
      { status: 503 },
    );
  }
}
