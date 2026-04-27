import {
  createRetailerSessionToken,
  registerRetailer,
  setRetailerSessionCookie,
  toPublicRetailer,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

type Body = {
  companyName?: unknown;
  email?: unknown;
  password?: unknown;
  websiteUrl?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const companyName = typeof body.companyName === "string" ? body.companyName : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const websiteUrl = typeof body.websiteUrl === "string" ? body.websiteUrl : "";

  try {
    const user = await registerRetailer({ companyName, email, password, websiteUrl });
    const token = await createRetailerSessionToken(user.id);
    await setRetailerSessionCookie(token);
    return Response.json({ ok: true, user: toPublicRetailer(user) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
