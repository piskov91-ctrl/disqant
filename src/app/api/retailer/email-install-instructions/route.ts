import { NextResponse } from "next/server";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { buildDeveloperInstallEmail } from "@/lib/retailerDeveloperInstallEmail";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const runtime = "nodejs";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function resolvePublicOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) throw new Error("Cannot resolve public site URL. Set NEXT_PUBLIC_SITE_URL.");
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]!.trim();
  return `${proto}://${host}`;
}

type Body = {
  email?: unknown;
};

export async function POST(req: Request) {
  const user = await getRetailerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedId = user.clientId?.trim() ?? "";
  if (!linkedId) {
    return NextResponse.json({ error: "No linked API key." }, { status: 403 });
  }

  const client = await getClientKeyRecordById(linkedId);
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  if (!isFitRoomEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured on this server. Contact support@fit-room.com." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  let origin: string;
  try {
    origin = resolvePublicOrigin(req);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not build site URL." },
      { status: 500 },
    );
  }

  const snippet = `<script async src="${origin}/widget.js" data-fit-room-key="${client.key}"></script>`;
  const dashboardUrl = `${origin}/dashboard`;
  const storeLabel = client.clientName?.trim() || "Store";

  const { subject, text, html } = buildDeveloperInstallEmail({
    snippet,
    dashboardUrl,
    storeLabel,
  });

  try {
    await sendFitRoomMail({ to: email, subject, text, html });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not send email." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
