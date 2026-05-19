import {
  createRetailerPasswordResetToken,
  findRetailerByEmail,
  normalizeRetailerEmail,
} from "@/lib/retailerAuth";
import { checkoutSiteOrigin } from "@/lib/stripeServer";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";

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
      await sendFitRoomMail({
        to: user.email,
        subject: "Reset your Fit Room password",
        text: [
          `Hi ${greeting},`,
          "",
          "We received a request to reset the password for your Fit Room retailer account.",
          "",
          `Open this link (valid for 1 hour):`,
          resetUrl,
          "",
          "If you did not request this, you can ignore this email. Your password will stay the same.",
          "",
          "— The Fit Room Team",
        ].join("\n"),
        html: `
<p>Hi ${escapeHtml(greeting)},</p>
<p>We received a request to reset the password for your Fit Room retailer account.</p>
<p><a href="${escapeHtml(resetUrl)}">Choose a new password</a> <span style="color:#666">(link valid for 1 hour)</span></p>
<p style="font-size:13px;color:#666">If you did not request this, you can ignore this email.</p>
<p>— The Fit Room Team</p>
`.trim(),
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
