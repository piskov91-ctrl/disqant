import { NextResponse } from "next/server";
import { clearPendingSubscriptionPlanOnClient } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { listSubscriptionClientRecordsForRetailerDashboard } from "@/lib/retailerSubscriptionClients";

export const runtime = "nodejs";

type Body = {
  action?: unknown;
  clientId?: unknown;
};

/**
 * Clears queued subscription tier on a client key the retailer is allowed to manage.
 */
export async function POST(req: Request) {
  const user = await getRetailerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.action !== "clear") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const explicitId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const fallbackLinked = user.clientId?.trim() ?? "";
  const targetId = explicitId || fallbackLinked;
  if (!targetId) {
    return NextResponse.json({ error: "No client key on this account." }, { status: 400 });
  }

  const allowed = await listSubscriptionClientRecordsForRetailerDashboard(user);
  if (!allowed.some((r) => r.id === targetId)) {
    return NextResponse.json({ error: "Not allowed to manage this key." }, { status: 403 });
  }

  try {
    const { cleared } = await clearPendingSubscriptionPlanOnClient(targetId);
    return NextResponse.json({ ok: true as const, cleared });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not update subscription queue." },
      { status: 400 },
    );
  }
}
