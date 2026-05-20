import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:subscriptionsFeedback:";
const INDEX_KEY = "fit-room:subscriptionsFeedback:index";
export const SUBSCRIPTIONS_FEEDBACK_INDEX_MAX = 300;

export type SubscriptionsFeedbackRecord = {
  id: string;
  createdAt: string;
  /** 1–5 */
  rating: number;
  message: string;
};

function recordKey(id: string) {
  return `${RECORD_PREFIX}${id}`;
}

export async function recordSubscriptionsFeedback(fields: {
  rating: number;
  message: string;
}): Promise<string> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: SubscriptionsFeedbackRecord = {
    id,
    createdAt: new Date().toISOString(),
    rating: fields.rating,
    message: fields.message,
  };
  await redis.set(recordKey(id), JSON.stringify(row));
  await redis.lpush(INDEX_KEY, id);
  await redis.ltrim(INDEX_KEY, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1);
  return id;
}
