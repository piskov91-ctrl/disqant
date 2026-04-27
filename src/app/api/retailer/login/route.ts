import { NextResponse } from "next/server";
import {
  applyRetailerSessionToNextResponse,
  createRetailerSessionToken,
  findRetailerByEmail,
  normalizeRetailerEmail,
  toPublicRetailer,
  verifyRetailerPassword,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!normalizeRetailerEmail(email) || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await findRetailerByEmail(email);
  if (!user || !verifyRetailerPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  try {
    const token = await createRetailerSessionToken(user.id);
    const res = NextResponse.json({ ok: true, user: toPublicRetailer(user) });
    applyRetailerSessionToNextResponse(res, token);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
