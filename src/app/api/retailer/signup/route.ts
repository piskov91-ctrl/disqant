import { NextResponse } from "next/server";
import {
  applyRetailerSessionToNextResponse,
  createRetailerSessionToken,
  registerRetailer,
  toPublicRetailer,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = {
  firstName?: unknown;
  lastName?: unknown;
  companyName?: unknown;
  email?: unknown;
  websiteUrl?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  agreeTerms?: unknown;
  agreePrivacy?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName : "";
  const lastName = typeof body.lastName === "string" ? body.lastName : "";
  const companyName = typeof body.companyName === "string" ? body.companyName : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const agreeTerms = body.agreeTerms === true;
  const agreePrivacy = body.agreePrivacy === true;

  try {
    const user = await registerRetailer({
      firstName,
      lastName,
      companyName,
      email,
      websiteUrl,
      password,
      confirmPassword,
      agreeTerms,
      agreePrivacy,
    });
    const token = await createRetailerSessionToken(user.id);
    const res = NextResponse.json({ ok: true, user: toPublicRetailer(user) });
    applyRetailerSessionToNextResponse(res, token);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
