import { cookies } from "next/headers";
import {
  RETAILER_SESSION_COOKIE,
  clearRetailerSessionCookie,
  destroyRetailerSessionToken,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(RETAILER_SESSION_COOKIE)?.value;
  if (token) await destroyRetailerSessionToken(token);
  await clearRetailerSessionCookie();
  return Response.json({ ok: true });
}
