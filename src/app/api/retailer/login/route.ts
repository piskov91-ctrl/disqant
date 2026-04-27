import {
  createRetailerSessionToken,
  findRetailerByEmail,
  normalizeRetailerEmail,
  setRetailerSessionCookie,
  toPublicRetailer,
  verifyRetailerPassword,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!normalizeRetailerEmail(email) || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await findRetailerByEmail(email);
  if (!user || !verifyRetailerPassword(password, user.passwordSalt, user.passwordHash)) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  try {
    const token = await createRetailerSessionToken(user.id);
    await setRetailerSessionCookie(token);
    return Response.json({ ok: true, user: toPublicRetailer(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
