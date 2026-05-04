import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { findRetailerByEmail, normalizeRetailerEmail } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

/** Look up retailer signup fields by email — used to prefill API client name from registration. */
export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rawEmail = new URL(req.url).searchParams.get("email") ?? "";
  const email = normalizeRetailerEmail(rawEmail);
  if (!email) {
    return Response.json({ error: "Enter a retailer email." }, { status: 400 });
  }

  const retailer = await findRetailerByEmail(email);
  if (!retailer) {
    return Response.json({ error: "No retailer account with this email." }, { status: 404 });
  }

  return Response.json({
    email: retailer.email,
    storeName: retailer.storeName.trim(),
    firstName: retailer.firstName ?? "",
    lastName: retailer.lastName ?? "",
  });
}
