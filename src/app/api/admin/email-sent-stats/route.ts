import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getFitRoomEmailSentCounts } from "@/lib/fitRoomEmailSentCounters";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { emailsSentToday, emailsSentThisMonth } = await getFitRoomEmailSentCounts();
    return Response.json({ emailsSentToday, emailsSentThisMonth });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not read email counters from Redis (check KV_REST_API_URL / KV_REST_API_TOKEN).",
      },
      { status: 503 },
    );
  }
}
