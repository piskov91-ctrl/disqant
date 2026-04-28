import { NextResponse } from "next/server";
import { getRetailerSessionUser, toPublicRetailer, updateRetailerProfile } from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  companyName?: unknown;
  websiteUrl?: unknown;
};

export async function PATCH(req: Request) {
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

  const firstName = typeof body.firstName === "string" ? body.firstName : "";
  const lastName = typeof body.lastName === "string" ? body.lastName : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const companyName = typeof body.companyName === "string" ? body.companyName : "";
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl : "";

  try {
    const updated = await updateRetailerProfile({
      userId: sessionUser.id,
      firstName,
      lastName,
      email,
      companyName,
      websiteUrl,
    });
    return NextResponse.json({ ok: true, user: toPublicRetailer(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update profile.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
