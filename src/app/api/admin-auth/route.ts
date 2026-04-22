import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE } from "@/lib/adminAuth";

function extractPassword(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  if (!("password" in body)) return null;
  const value = (body as Record<string, unknown>).password;
  return typeof value === "string" ? value : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = extractPassword(body) ?? "";
  if (password !== "ivan91") {
    return Response.json({ error: "Invalid password." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set({
    name: ADMIN_AUTH_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Session cookie only (no long-lived remember).
    // /admin also clears this cookie on every page load.
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set({
    name: ADMIN_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true });
}

