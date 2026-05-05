import { NextResponse } from "next/server";
import { getClientByApiKey } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const runtime = "nodejs";

/**
 * Returns try-on usage for an API key when it matches the logged-in retailer's linked client.
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

  return NextResponse.json({
    clientName: client.clientName,
    usageCount: client.usageCount,
    usageLimit: client.usageLimit,
  });
}
