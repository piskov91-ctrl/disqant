import { resetRetailerPasswordWithToken } from "@/lib/retailerAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; password?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token.trim()) {
    return Response.json({ error: "Reset link is missing or invalid." }, { status: 400 });
  }
  if (!password) {
    return Response.json({ error: "Password is required." }, { status: 400 });
  }

  try {
    await resetRetailerPasswordWithToken(token, password);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not reset password.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
