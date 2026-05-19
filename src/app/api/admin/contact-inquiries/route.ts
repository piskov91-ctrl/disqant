import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  getUnreadContactInquiryCount,
  listContactInquiries,
  markAllContactInquiriesRead,
  markContactInquiryRead,
} from "@/lib/contactInquiriesStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("badge") === "1") {
      const unreadCount = await getUnreadContactInquiryCount();
      return Response.json({ unreadCount });
    }

    const [unreadCount, inquiries] = await Promise.all([
      getUnreadContactInquiryCount(),
      listContactInquiries(200),
    ]);
    return Response.json({ unreadCount, inquiries });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not read contact inquiries from Redis (check KV_REST_API_URL / KV_REST_API_TOKEN).",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const markAllRead =
    typeof body === "object" &&
    body !== null &&
    (body as { markAllRead?: unknown }).markAllRead === true;

  if (markAllRead) {
    try {
      await markAllContactInquiriesRead();
      const [unreadCount, inquiries] = await Promise.all([
        getUnreadContactInquiryCount(),
        listContactInquiries(200),
      ]);
      return Response.json({ ok: true, unreadCount, inquiries });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not mark inquiries as read." },
        { status: 503 },
      );
    }
  }

  const id =
    typeof body === "object" && body !== null && "id" in body && typeof (body as { id: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";

  if (!id) {
    return Response.json({ error: "Missing inquiry id." }, { status: 400 });
  }

  try {
    const ok = await markContactInquiryRead(id);
    if (!ok) return Response.json({ error: "Inquiry not found." }, { status: 404 });
    const unreadCount = await getUnreadContactInquiryCount();
    return Response.json({ ok: true, unreadCount });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not update inquiry." },
      { status: 503 },
    );
  }
}
