import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE } from "@/lib/demoAuth";

function extractCode(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  if (!("code" in body)) return null;
  const value = (body as Record<string, unknown>).code;
  return typeof value === "string" ? value : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const code = extractCode(body) ?? "";
  if (code !== "ivan91") {
    return Response.json({ error: "Invalid access code." }, { status: 401 });
  }

  const jar = await cookies();
  jar.set({
    name: DEMO_AUTH_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set({
    name: DEMO_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true });
}

