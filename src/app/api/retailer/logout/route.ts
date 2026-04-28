import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearRetailerSessionOnNextResponse,
  destroyRetailerSessionToken,
  retailerSessionTokenFromCookieStore,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  const token = retailerSessionTokenFromCookieStore(jar);
  if (token) await destroyRetailerSessionToken(token);
  const res = NextResponse.json({ ok: true });
  clearRetailerSessionOnNextResponse(res);
  return res;
}
