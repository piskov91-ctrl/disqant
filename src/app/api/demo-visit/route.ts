import {
  buildDemoSessionSetCookie,
  getRequestClientIp,
  newDemoSessionId,
  readDemoSessionFromCookieHeader,
  recordDemoPageLoad,
} from "@/lib/platformAnalytics";

export const runtime = "nodejs";

/** Beacon from the public /demo page (one increment per page load + per-visitor stats). */
export async function POST(req: Request) {
  const ip = getRequestClientIp(req);
  const existing = readDemoSessionFromCookieHeader(req.headers.get("cookie"));
  const sessionId = existing ?? newDemoSessionId();
  const setCookie = !existing;

  await recordDemoPageLoad({ visitorSessionId: sessionId, ip });

  const headers = new Headers({ "Content-Type": "application/json" });
  if (setCookie) {
    headers.append("Set-Cookie", buildDemoSessionSetCookie(sessionId));
  }
  return new Response(JSON.stringify({ ok: true as const }), { headers });
}
