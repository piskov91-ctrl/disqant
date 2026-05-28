import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  buildRetailerPlanActivationEmailContent,
  normalizeRetailerPaymentLinkUrl,
} from "@/lib/retailerWelcomeEmail";
import { getRetailerById } from "@/lib/retailerAuth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type Body = {
  retailerUserId?: unknown;
  paymentLinkUrl?: unknown;
};

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isFitRoomEmailConfigured()) {
    return Response.json({ error: "Email is not configured. Set RESEND_API_KEY." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const retailerUserId = typeof body.retailerUserId === "string" ? body.retailerUserId.trim() : "";
  const paymentLinkRaw = typeof body.paymentLinkUrl === "string" ? body.paymentLinkUrl : "";
  const paymentLinkUrl = normalizeRetailerPaymentLinkUrl(paymentLinkRaw);

  if (!retailerUserId) {
    return Response.json({ error: "Retailer user id is required." }, { status: 400 });
  }
  if (!paymentLinkUrl) {
    return Response.json(
      { error: "Paste a valid HTTPS Stripe payment link before sending." },
      { status: 400 },
    );
  }

  const user = await getRetailerById(retailerUserId);
  if (!user) {
    return Response.json({ error: "Retailer account not found." }, { status: 404 });
  }

  const email = user.email.trim();
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: "Retailer has no valid email on file." }, { status: 400 });
  }

  const storeName = user.storeName.trim() || user.companyName.trim() || "there";

  let subject: string;
  let text: string;
  let html: string;
  try {
    ({ subject, text, html } = buildRetailerPlanActivationEmailContent({
      storeName,
      paymentLinkUrl,
    }));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid payment link." },
      { status: 400 },
    );
  }

  try {
    await sendFitRoomMail({ to: email, subject, text, html });
  } catch (e) {
    console.error("[fit-room][admin-retailer-plan-email] send failed", {
      retailerUserId,
      email,
      message: e instanceof Error ? e.message : String(e),
    });
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not send email." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, to: email, storeName });
}
