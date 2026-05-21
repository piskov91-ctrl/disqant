import { NextResponse } from "next/server";
import {
  applyRetailerSessionToNextResponse,
  createRetailerSessionToken,
  registerRetailer,
  toPublicRetailer,
} from "@/lib/retailerAuth";
import { isFitRoomEmailConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomEmail";
import { transactionalParagraph, wrapFitRoomTransactionalHtml } from "@/lib/fitRoomTransactionalEmailHtml";

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
      const text = [
        `Hi ${greeting},`,
        "",
        "Welcome to Fit Room — we're glad you're inside.",
        "",
        `We've spun up retailer access for ${store}. Flip on a subscription when you're ready so try-on quota and your embed key go live.`,
        "",
        "If anything in checkout feels fiddly, reply here — we'd rather unblock you than leave you prowling FAQs.",
        "",
        "Warmly,",
        "The Fit Room team",
      ].join("\n");
      const html = wrapFitRoomTransactionalHtml({
        documentTitle: "Welcome to Fit Room",
        preheader: `Retail access for ${store} is waiting on you.`,
        heading: "You're in — welcome aboard",
        innerHtml:
          transactionalParagraph(`Hi ${greeting},`) +
          transactionalParagraph(
            `Welcome aboard. Having ${store} in Fit Room already makes our week better — genuinely.`,
          ) +
          transactionalParagraph(
            "Your cupboard is unpacked: pick whichever subscription suits you next so shopper try-ons activate and your embed snippet unlocks quietly in the dashboard.",
          ) +
          transactionalParagraph(
            "Need a sounding board during setup? Send a note straight to this address and one of us will answer without the corporate script.",
          ) +
          transactionalParagraph("Warmly,") +
          transactionalParagraph("The Fit Room team"),
      });
      void sendFitRoomPlainTextMail({
        to: user.email,
        subject: "Welcome to Fit Room",
        text,
        html,
      }).catch(() => {});
    }

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
