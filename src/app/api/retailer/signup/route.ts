import { NextResponse } from "next/server";
import {
  applyRetailerSessionToNextResponse,
  createRetailerSessionToken,
  registerRetailer,
  toPublicRetailer,
} from "@/lib/retailerAuth";
import { isFitRoomEmailConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomEmail";

export const runtime = "nodejs";

type Body = {
  firstName?: unknown;
  lastName?: unknown;
  storeName?: unknown;
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
  const storeName = typeof body.storeName === "string" ? body.storeName : "";
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
      storeName,
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

    if (isFitRoomEmailConfigured()) {
      const greeting = user.firstName?.trim() || "there";
      const store = user.storeName?.trim() || user.companyName?.trim() || "your store";
      void sendFitRoomPlainTextMail({
        to: user.email,
        subject: "Welcome to Fit Room",
        text: [
          `Hi ${greeting},`,
          "",
          "Welcome to Fit Room — we’re excited to have you.",
          "",
          `Your account for ${store} is ready. Next, choose a subscription to activate your try-on quota and get your embed API key.`,
          "",
          "If you need a hand getting set up, just reply to this email — we’re happy to help.",
          "",
          "Warm regards,",
          "The Fit Room Team",
        ].join("\n"),
      }).catch(() => {});
    }

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
