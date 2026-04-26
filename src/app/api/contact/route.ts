import { Resend } from "resend";

const TO_EMAIL = process.env.CONTACT_TO ?? "hello@disqant.com";
/** Verifiable sender; default works with Resend test API until you set a domain. */
const FROM_EMAIL = process.env.RESEND_FROM ?? "Disqant <onboarding@resend.dev>";

const VISITOR_OPTIONS = new Set(["under-10k", "10k-50k", "50k-100k", "100k-plus"]);

const VISITOR_LABEL: Record<string, string> = {
  "under-10k": "Under 10k",
  "10k-50k": "10k – 50k",
  "50k-100k": "50k – 100k",
  "100k-plus": "100k+",
};

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
  const company = isNonEmptyString(b.company) ? b.company.trim() : null;
  const message = isNonEmptyString(b.message) ? b.message.trim() : null;
  const websiteUrlRaw = typeof b.websiteUrl === "string" ? b.websiteUrl : "";
  const monthlyVisitors = typeof b.monthlyVisitors === "string" ? b.monthlyVisitors : "";

  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!company) return Response.json({ error: "Company name is required." }, { status: 400 });
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
    `Company: ${company}`,
    `Website: ${websiteLine}`,
    `Monthly visitors: ${visitorsLabel}`,
    "",
    message,
  ].join("\n");

  const html = `
  <h2>Contact form — Disqant</h2>
  <p><strong>Name</strong><br/>${escapeHtml(name)}</p>
  <p><strong>Company</strong><br/>${escapeHtml(company)}</p>
  <p><strong>Website</strong><br/>${escapeHtml(websiteLine)}</p>
  <p><strong>Monthly visitors</strong><br/>${escapeHtml(visitorsLabel)}</p>
  <p><strong>Message</strong></p>
  <pre style="font-family:system-ui,Segoe UI,sans-serif;white-space:pre-wrap;">${escapeHtml(
    message,
  )}</pre>
  `;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [TO_EMAIL],
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
