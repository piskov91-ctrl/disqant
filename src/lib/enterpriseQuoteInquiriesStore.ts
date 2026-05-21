import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:enterpriseQuote:";
const INDEX_KEY = "fit-room:enterpriseQuotes:index";
export const ENTERPRISE_QUOTE_INDEX_MAX = 500;

export type EnterpriseQuoteRecord = {
  id: string;
  createdAt: string;
  storeName: string;
  /** Canonical https URL display */
  websiteUrl: string;
  monthlyVisitors: string;
  monthlyVisitorsLabel: string;
  platform: string;
  platformLabel: string;
};

function recordKey(id: string) {
  return `${RECORD_PREFIX}${id}`;
}

export type EnterpriseQuoteInput = Omit<EnterpriseQuoteRecord, "id" | "createdAt">;

export async function recordEnterpriseQuote(fields: EnterpriseQuoteInput): Promise<string> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: EnterpriseQuoteRecord = {
    id,
    createdAt: new Date().toISOString(),
    ...fields,
  };
  await redis.set(recordKey(id), JSON.stringify(row));
  await redis.lpush(INDEX_KEY, id);
  await redis.ltrim(INDEX_KEY, 0, ENTERPRISE_QUOTE_INDEX_MAX - 1);
  return id;
}
