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
      const greeting = user.firstName?.trim() || "there";
      const text = [
        `Hi ${greeting},`,
        "",
        "Someone asked to reset your Fit Room retailer password. Totally normal if Chrome forgot it for you.",
        "",
        "Use this link within the hour — we keep it sharp on purpose:",
        resetUrl,
        "",
        "If you've never tapped \"forgot password\", ignore everything here. Nothing changes otherwise.",
        "",
        "Warmly,",
        "The Fit Room team",
      ].join("\n");
      const html = wrapFitRoomTransactionalHtml({
        documentTitle: "Reset password",
        preheader: "Link expires in an hour.",
        heading: "Let's reset access",
        innerHtml:
          transactionalParagraph(`Hi ${greeting},`) +
          transactionalParagraph(
            "We spotted a retailer password reset for your inbox. Happens when memory fails or someone hands off the laptop.",
          ) +
          transactionalParagraph("Grab a fresh passphrase while the invitation is alive (one hour):") +
          transactionalCtaHtml(resetUrl, "Choose a new password") +
          transactionalParagraph(
            "Didn't poke that button yourself? Toss this mail in the junk folder — the old password stubbornly refuses to budge.",
          ) +
          transactionalParagraph("Warmly,") +
          transactionalParagraph("The Fit Room team"),
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