import {
  createRetailerPasswordResetToken,
  findRetailerByEmail,
  normalizeRetailerEmail,
} from "@/lib/retailerAuth";
import { checkoutSiteOrigin } from "@/lib/stripeServer";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  transactionalCtaHtml,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  if (!emailRaw) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const emailNorm = normalizeRetailerEmail(emailRaw);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await findRetailerByEmail(emailNorm);
  const canReset =
    user &&
    !user.deletedAt &&
    Boolean(user.passwordSalt?.trim()) &&
    Boolean(user.passwordHash?.trim());

  if (canReset && isFitRoomEmailConfigured()) {
    try {
      const token = await createRetailerPasswordResetToken(user.id);
      const origin = checkoutSiteOrigin(req);
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      const text = [
        "Hi,",
        "",
        "We got a request to reset your Fit Room password.",
        "",
        "If that was you, click the button below and you will be taken straight to a page where you can set a new one.",
        resetUrl,
        "",
        "If you did not ask for this, you can ignore this email — your password will stay the same.",
        "",
        "The reset link is valid for 24 hours.",
        "",
        "Kind regards,",
        "The Fit Room Team",
      ].join("\n");
      const html = wrapFitRoomTransactionalHtml({
        documentTitle: "Reset password",
        preheader: "Reset your Fit Room password.",
        heading: "Reset your password",
        innerHtml:
          transactionalParagraph("Hi,") +
          transactionalParagraph("We got a request to reset your Fit Room password.") +
          transactionalParagraph(
            "If that was you, click the button below and you will be taken straight to a page where you can set a new one.",
          ) +
          transactionalCtaHtml(resetUrl, "Reset my password") +
          transactionalParagraph(
            "If you did not ask for this, you can ignore this email — your password will stay the same.",
          ) +
          transactionalParagraph("The reset link is valid for 24 hours.") +
          transactionalParagraph("Kind regards,") +
          transactionalParagraph("The Fit Room Team"),
      });
      await sendFitRoomMail({
        to: user.email,
        subject: "Reset your Fit Room password",
        text,
        html,
      });
    } catch (e) {
      console.error("[retailer] forgot-password email failed", e);
    }
  }

  return Response.json({
    ok: true,
    message:
      "If an account exists for that email, we sent a password reset link. Check your inbox (and spam) shortly.",
  });
}