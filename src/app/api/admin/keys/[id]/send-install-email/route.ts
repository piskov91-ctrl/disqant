import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AdminClientInstallPlatform } from "@/lib/adminClientInstallEmail";
import {
  ADMIN_CLIENT_INSTALL_EMAIL_PLATFORMS,
  buildAdminClientInstallEmailHtml,
  buildAdminClientInstallEmailSubject,
  buildAdminClientInstallPlainEmailBody,
} from "@/lib/adminClientInstallEmail";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import { readWearMeGuidePdfFile, wearMeGuidePdfFilename } from "@/lib/wearMeGuidePdf";

export const runtime = "nodejs";

const PLATFORM_IDS = new Set<AdminClientInstallPlatform>(
  ADMIN_CLIENT_INSTALL_EMAIL_PLATFORMS.map((p) => p.id),
);

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

function parsePlatform(raw: unknown): AdminClientInstallPlatform | null {
  return typeof raw === "string" && PLATFORM_IDS.has(raw as AdminClientInstallPlatform)
    ? (raw as AdminClientInstallPlatform)
    : null;
}

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type Body = { platform?: unknown };

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isFitRoomEmailConfigured()) {
    return NextResponse.json({ error: "Email is not configured. Set RESEND_API_KEY." }, { status: 503 });
  }

  const { id: clientId } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const platform = parsePlatform(body.platform);
  if (!platform) {
    return NextResponse.json({ error: "Select a platform (Shopify, WordPress, …)." }, { status: 400 });
  }

  const client = await getClientKeyRecordById(clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const sentTo = client.contactEmail?.trim() ?? "";
  if (!isValidEmail(sentTo)) {
    return NextResponse.json(
      {
        error: "This client has no valid contact email. Add one via Edit.",
      },
      { status: 400 },
    );
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
  const storeName = client.clientName?.trim() || "there";
  const subject = buildAdminClientInstallEmailSubject(platform, storeName);
  const text = buildAdminClientInstallPlainEmailBody({
    platform,
    storeName,
    widgetSnippet: snippet,
  });
  const html = buildAdminClientInstallEmailHtml({
    platform,
    storeName,
    widgetSnippet: snippet,
    emailSubjectLine: subject,
  });

  let attachment: { filename: string; buffer: Buffer };
  try {
    attachment = await readWearMeGuidePdfFile(platform);
  } catch (e) {
    const hintFilename = wearMeGuidePdfFilename(platform);
    console.error(
      `[fit-room][admin] missing Wear Me PDF for platform="${platform}" (expected public/guides/${hintFilename}).`,
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json(
      {
        error:
          "Integration guide PDF is missing on this server (see public/guides). Ask an engineer to add the Wear Me guides.",
      },
      { status: 503 },
    );
  }

  try {
    await sendFitRoomMail({
      to: sentTo,
      subject,
      text,
      html,
      attachments: [{ filename: attachment.filename, content: attachment.buffer }],
    });
  } catch (e) {
    console.error("[admin] send-install-email failed", {
      clientId,
      platform,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not send email." }, { status: 502 });
  }

  return NextResponse.json({ ok: true as const, sentTo });
}
