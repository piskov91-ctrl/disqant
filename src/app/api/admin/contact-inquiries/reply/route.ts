import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getContactInquiryById } from "@/lib/contactInquiriesStore";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  transactionalFormattedLetterBody,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export const runtime = "nodejs";

const MAX_REPLY_CHARS = 20_000;

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

function greetingFirstName(name: string): string {
  const t = name.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isFitRoomEmailConfigured()) {
    return Response.json({ error: "Email is not configured. Set RESEND_API_KEY." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id.trim() : "";
  const replyRaw = typeof b.message === "string" ? b.message : "";

  if (!id) return Response.json({ error: "Missing inquiry id." }, { status: 400 });

  const message = replyRaw.trim();
  if (!message.length) return Response.json({ error: "Reply message is empty." }, { status: 400 });
  if (message.length > MAX_REPLY_CHARS) {
    return Response.json(
      { error: `Reply is too long (max ${MAX_REPLY_CHARS.toLocaleString()} characters).` },
      { status: 400 },
    );
  }

  let inquiry;
  try {
    inquiry = await getContactInquiryById(id);
  } catch (e) {
    console.error("[fit-room][admin-contact-reply] redis read failed", e);
    return Response.json({ error: "Could not load submission." }, { status: 503 });
  }

  if (!inquiry) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  const first = greetingFirstName(inquiry.name);
  const preheaderSlice = message.length > 100 ? `${message.slice(0, 97)}…` : message;
  const text = [`Hi ${first},`, "", message, "", "Warmly,", "The Fit Room team"].join("\n");

  const htmlInner =
    transactionalParagraph(`Hi ${first},`) +
    transactionalFormattedLetterBody(message) +
    transactionalParagraph("Warmly,") +
    transactionalParagraph("The Fit Room team");

  try {
    await sendFitRoomMail({
      to: inquiry.email,
      subject: `Re: Your Fit Room enquiry — ${inquiry.company}`,
      text,
      html: wrapFitRoomTransactionalHtml({
        documentTitle: "Message from Fit Room",
        preheader: preheaderSlice,
        heading: "A note from Fit Room support",
        innerHtml: htmlInner,
      }),
    });
  } catch (e) {
    console.error("[fit-room][admin-contact-reply] sendFitRoomMail failed", {
      inquiryId: inquiry.id,
      to: inquiry.email,
      message: e instanceof Error ? e.message : String(e),
    });
    return Response.json(
      { error: "Could not send email. Check Resend configuration and logs." },
      { status: 502 },
    );
  }

  console.log("[fit-room][admin-contact-reply] sent reply", {
    inquiryId: inquiry.id,
    to: inquiry.email,
    subjectPrefix: inquiry.company.slice(0, 40),
  });

  return Response.json({ ok: true });
}
