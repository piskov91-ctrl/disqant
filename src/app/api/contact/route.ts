import { Resend } from "resend";

const TO_EMAIL = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();

/**
 * Outbound sender for the contact form — must not be the same mailbox as {@link TO_EMAIL}.
 * Sending From support@ → To support@ often never reaches external forwarding (Hostinger → Gmail);
 * Resend still accepts the API call, so it looks "logged" only.
 */
const CONTACT_FORM_FROM_DEFAULT = "Fit Room <website@fit-room.com>";

function extractBareEmail(fromHeaderStyle: string): string {
  const t = fromHeaderStyle.trim();
  const m = t.match(/<([^>]+)>/);
  return (m ? m[1] : t).trim().toLowerCase();
}

function resolveContactFormFrom(): string {
  const explicit = process.env.CONTACT_FORM_FROM?.trim();
  if (explicit) return explicit;
  const fallback = CONTACT_FORM_FROM_DEFAULT;
  if (extractBareEmail(fallback) === extractBareEmail(TO_EMAIL)) {
    return "Fit Room <noreply@fit-room.com>";
  }
  return fallback;
}

const VISITOR_OPTIONS = new Set(["under-10k", "10k-50k", "50k-100k", "100k-plus"]);

const VISITOR_LABEL: Record<string, string> = {
  "under-10k": "Under 10k",
  "10k-50k": "10k – 50k",
  "50k-100k": "50k – 100k",
  "100k-plus": "100k+",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeWebsiteInput(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Email is not configured. Set RESEND_API_KEY for this environment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = isNonEmptyString(b.name) ? b.name.trim() : null;
  const emailRaw = isNonEmptyString(b.email) ? b.email.trim() : "";
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : null;
  const company = isNonEmptyString(b.company) ? b.company.trim() : null;
  const message = isNonEmptyString(b.message) ? b.message.trim() : null;
  const websiteUrlRaw = typeof b.websiteUrl === "string" ? b.websiteUrl : "";
  const monthlyVisitors = typeof b.monthlyVisitors === "string" ? b.monthlyVisitors : "";

  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!email) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (!company) return Response.json({ error: "Store name is required." }, { status: 400 });
  if (!message) return Response.json({ error: "Message is required." }, { status: 400 });
  if (!VISITOR_OPTIONS.has(monthlyVisitors)) {
    return Response.json({ error: "Please select monthly visitors." }, { status: 400 });
  }

  let websiteLine = "—";
  if (websiteUrlRaw.trim()) {
    try {
      const u = new URL(normalizeWebsiteInput(websiteUrlRaw));
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
      websiteLine = u.toString();
    } catch {
      return Response.json({ error: "Please enter a valid website URL, or leave it empty." }, { status: 400 });
    }
  }

  const visitorsLabel = VISITOR_LABEL[monthlyVisitors] ?? monthlyVisitors;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Store name: ${company}`,
    `Website: ${websiteLine}`,
    `Monthly visitors: ${visitorsLabel}`,
    "",
    message,
  ].join("\n");

  const html = `
  <h2>Contact form — Fit Room</h2>
  <p><strong>Name</strong><br/>${escapeHtml(name)}</p>
  <p><strong>Email</strong><br/><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
  <p><strong>Store name</strong><br/>${escapeHtml(company)}</p>
  <p><strong>Website</strong><br/>${escapeHtml(websiteLine)}</p>
  <p><strong>Monthly visitors</strong><br/>${escapeHtml(visitorsLabel)}</p>
  <p><strong>Message</strong></p>
  <pre style="font-family:system-ui,Segoe UI,sans-serif;white-space:pre-wrap;">${escapeHtml(
    message,
  )}</pre>
  `;

  let from = resolveContactFormFrom();
  if (extractBareEmail(from) === extractBareEmail(TO_EMAIL)) {
    from = CONTACT_FORM_FROM_DEFAULT;
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    replyTo: email,
    subject: `Contact: ${name} — ${company}`,
    text,
    html,
  });

  if (error) {
    return Response.json(
      { error: "Could not send your message. Please try again or email us directly." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, id: data?.id ?? null });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
