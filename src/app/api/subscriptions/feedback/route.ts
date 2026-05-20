import { recordPendingSubscriptionsFeedback } from "@/lib/subscriptionsFeedbackStore";

const MAX_MESSAGE = 6000;
const MIN_STORE_LEN = 2;
const MAX_STORE_LEN = 200;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const storeNameRaw = typeof b.storeName === "string" ? b.storeName.trim() : "";
  if (storeNameRaw.length < MIN_STORE_LEN) {
    return Response.json({ error: "Please enter your store name." }, { status: 400 });
  }
  if (storeNameRaw.length > MAX_STORE_LEN) {
    return Response.json({ error: `Store name must be ${MAX_STORE_LEN} characters or fewer.` }, { status: 400 });
  }

  const ratingRaw = b.rating;
  const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Please choose a star rating from 1 to 5." }, { status: 400 });
  }

  const messageRaw = typeof b.message === "string" ? b.message.trim() : "";
  if (!messageRaw.length) {
    return Response.json({ error: "Please tell us about your experience." }, { status: 400 });
  }
  if (messageRaw.length > MAX_MESSAGE) {
    return Response.json({ error: `Keep your feedback under ${MAX_MESSAGE} characters.` }, { status: 400 });
  }

  try {
    const redisId = await recordPendingSubscriptionsFeedback({
      storeName: storeNameRaw,
      rating,
      message: messageRaw,
    });
    return Response.json({ ok: true, redisId });
  } catch (storeErr: unknown) {
    console.error("[fit-room][subscriptions-feedback] Redis record failed", {
      message: storeErr instanceof Error ? storeErr.message : String(storeErr),
    });
    return Response.json({ error: "Could not save your feedback. Please try again shortly." }, { status: 503 });
  }
}
