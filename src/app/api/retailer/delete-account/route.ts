import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearRetailerSessionOnNextResponse,
  deleteRetailerAccount,
  getRetailerSessionUser,
  normalizeRetailerEmail,
  retailerSessionTokenFromCookieStore,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = {
  email?: unknown;
};

export async function POST(req: Request) {
  const sessionUser = await getRetailerSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  if (!email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (normalizeRetailerEmail(email) !== normalizeRetailerEmail(sessionUser.email)) {
    return NextResponse.json({ error: "Email does not match your account." }, { status: 400 });
  }

  const jar = await cookies();
  const token = retailerSessionTokenFromCookieStore(jar);

  try {
    await deleteRetailerAccount({ userId: sessionUser.id, sessionToken: token });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete account." },
      { status: 400 },
    );
  }

  const res = NextResponse.json({ ok: true });
  clearRetailerSessionOnNextResponse(res);
  return res;
}

