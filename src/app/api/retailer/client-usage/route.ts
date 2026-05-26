import { NextResponse } from "next/server";
import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { getClientByApiKey } from "@/lib/apiKeyStore";
import {
  buildRetailerSubscriptionClientUsagePayload,
  listSubscriptionClientRecordsForRetailerDashboard,
} from "@/lib/retailerSubscriptionClients";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const runtime = "nodejs";

function singleClientUsageFlatten(client: ClientApiKeyRecord, linkedId: string | null) {
  return buildRetailerSubscriptionClientUsagePayload(client, linkedId?.trim() ?? null);
}

/**
 * All subscription-related client rows (linked storefront key plus other keys billed to this email).
 */
export async function GET() {
  const user = await getRetailerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const linkedTrim = user.clientId?.trim() ?? "";

  try {
    const records = await listSubscriptionClientRecordsForRetailerDashboard(user);
    if (records.length === 0 && !linkedTrim) {
      return NextResponse.json({ error: "No linked API key." }, { status: 404 });
    }

    const keys = records.map((r) => buildRetailerSubscriptionClientUsagePayload(r, linkedTrim || null));

    const linkedRecord = linkedTrim ? records.find((r) => r.id === linkedTrim) : undefined;
    const primaryFlatten =
      linkedRecord != null
        ? singleClientUsageFlatten(linkedRecord, linkedTrim || null)
        : records.length > 0 && records[0]
          ? singleClientUsageFlatten(records[0], linkedTrim || null)
          : null;

    if (!primaryFlatten) {
      return NextResponse.json({ error: "No client usage available." }, { status: 404 });
    }

    return NextResponse.json({
      linkedClientId: linkedTrim || null,
      keys,
      /** @deprecated Prefer `keys` array; flattened fields mirror the linked client when present */
      ...primaryFlatten,
    });
  } catch {
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}

/**
 * Validates an embed API key belongs to this account; returns flattened usage plus full `keys` list.
 */
export async function POST(req: Request) {
  const user = await getRetailerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as { apiKey?: unknown }).apiKey : undefined;
  const apiKey = typeof raw === "string" ? raw.trim() : "";
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  const client = await getClientByApiKey(apiKey);
  if (!client) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 404 });
  }

  const linkedId = user.clientId?.trim() ?? "";
  if (!linkedId || linkedId !== client.id) {
    return NextResponse.json(
      { error: "This API key is not linked to your account." },
      { status: 403 },
    );
  }

  try {
    const records = await listSubscriptionClientRecordsForRetailerDashboard(user);
    const keys = records.map((r) => buildRetailerSubscriptionClientUsagePayload(r, linkedId || null));
    return NextResponse.json({
      linkedClientId: linkedId || null,
      keys,
      ...singleClientUsageFlatten(client, linkedId || null),
    });
  } catch {
    return NextResponse.json({ error: "Could not load usage." }, { status: 500 });
  }
}
