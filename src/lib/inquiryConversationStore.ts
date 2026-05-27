import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";
import {
  getContactInquiryById,
  listContactInquiries,
  type ContactInquiryRecord,
} from "@/lib/contactInquiriesStore";
import {
  getEnterpriseQuoteById,
  listEnterpriseQuotes,
  type EnterpriseQuoteRecord,
} from "@/lib/enterpriseQuoteInquiriesStore";

export type InquiryConversationKind = "contact" | "enterprise";

export type InquiryThreadMessage = {
  id: string;
  at: string;
  direction: "inbound" | "outbound";
  authorLabel: string;
  body: string;
  subject?: string;
  resendEmailId?: string;
  resendInboundId?: string;
};

const THREAD_PREFIX = "fit-room:inquiryThread:";
const INBOUND_PROCESSED_PREFIX = "fit-room:resendInboundProcessed:";

export const FIT_ROOM_THREAD_HEADER = "X-FitRoom-Thread";

function threadKey(kind: InquiryConversationKind, inquiryId: string) {
  return `${THREAD_PREFIX}${kind}:${inquiryId.trim()}`;
}

function parseThreadMessages(raw: unknown): InquiryThreadMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: InquiryThreadMessage[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const m = item as Partial<InquiryThreadMessage>;
    const id = typeof m.id === "string" ? m.id.trim() : "";
    const at = typeof m.at === "string" ? m.at : "";
    const direction = m.direction === "inbound" || m.direction === "outbound" ? m.direction : null;
    const authorLabel = typeof m.authorLabel === "string" ? m.authorLabel : "";
    const body = typeof m.body === "string" ? m.body : "";
    if (!id || !at || !direction || !body.trim()) continue;
    out.push({
      id,
      at,
      direction,
      authorLabel: authorLabel || (direction === "inbound" ? "Client" : "Fit Room"),
      body,
      subject: typeof m.subject === "string" ? m.subject : undefined,
      resendEmailId: typeof m.resendEmailId === "string" ? m.resendEmailId : undefined,
      resendInboundId: typeof m.resendInboundId === "string" ? m.resendInboundId : undefined,
    });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export function fitRoomThreadHeaderValue(kind: InquiryConversationKind, inquiryId: string): string {
  return `${kind}:${inquiryId.trim()}`;
}

export function fitRoomThreadSubjectToken(kind: InquiryConversationKind, inquiryId: string): string {
  return `[FR:${kind}:${inquiryId.trim()}]`;
}

/** Parse `X-FitRoom-Thread` or subject token `[FR:contact:uuid]`. */
export function parseFitRoomThreadRef(raw: string | null | undefined): {
  kind: InquiryConversationKind;
  inquiryId: string;
} | null {
  const t = (raw ?? "").trim();
  if (!t) return null;

  const headerMatch = /^(contact|enterprise):([0-9a-f-]{36})$/i.exec(t);
  if (headerMatch) {
    return {
      kind: headerMatch[1]!.toLowerCase() as InquiryConversationKind,
      inquiryId: headerMatch[2]!,
    };
  }

  const subjectMatch = /\[FR:(contact|enterprise):([0-9a-f-]{36})\]/i.exec(t);
  if (subjectMatch) {
    return {
      kind: subjectMatch[1]!.toLowerCase() as InquiryConversationKind,
      inquiryId: subjectMatch[2]!,
    };
  }

  return null;
}

export function normalizeResendEmailHeaders(headers: unknown): Record<string, unknown> {
  if (headers == null) return {};
  if (Array.isArray(headers)) {
    const out: Record<string, unknown> = {};
    for (const entry of headers) {
      if (entry == null || typeof entry !== "object") continue;
      const name = (entry as { name?: unknown }).name;
      const value = (entry as { value?: unknown }).value;
      if (typeof name === "string" && name.trim()) {
        out[name.trim()] = value;
      }
    }
    return out;
  }
  if (typeof headers === "object") return headers as Record<string, unknown>;
  return {};
}

export function extractThreadRefFromEmailHeaders(
  headers: Record<string, unknown> | null | undefined,
): { kind: InquiryConversationKind; inquiryId: string } | null {
  const map = headers ?? {};
  for (const [key, value] of Object.entries(map)) {
    if (key.toLowerCase() !== FIT_ROOM_THREAD_HEADER.toLowerCase()) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === "string") {
      const parsed = parseFitRoomThreadRef(v);
      if (parsed) return parsed;
    }
  }
  return null;
}

export async function getInquiryThreadMessages(
  kind: InquiryConversationKind,
  inquiryId: string,
): Promise<InquiryThreadMessage[]> {
  const id = inquiryId.trim();
  if (!id) return [];
  const redis = getRedis();
  const raw = await redis.get(threadKey(kind, id));
  if (Array.isArray(raw)) return parseThreadMessages(raw);
  if (typeof raw === "string") {
    try {
      return parseThreadMessages(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  return parseThreadMessages(raw);
}

export async function appendInquiryThreadMessage(
  kind: InquiryConversationKind,
  inquiryId: string,
  message: Omit<InquiryThreadMessage, "id" | "at"> & { id?: string; at?: string },
): Promise<InquiryThreadMessage> {
  const id = inquiryId.trim();
  if (!id) throw new Error("Missing inquiry id.");

  const row: InquiryThreadMessage = {
    id: message.id?.trim() || crypto.randomUUID(),
    at: message.at || new Date().toISOString(),
    direction: message.direction,
    authorLabel: message.authorLabel,
    body: message.body.trim(),
    subject: message.subject?.trim() || undefined,
    resendEmailId: message.resendEmailId,
    resendInboundId: message.resendInboundId,
  };

  const redis = getRedis();
  const key = threadKey(kind, id);
  const existing = await getInquiryThreadMessages(kind, id);
  const next = [...existing, row];
  await redis.set(key, next);
  return row;
}

export async function seedContactInquiryThread(inquiry: ContactInquiryRecord): Promise<void> {
  const existing = await getInquiryThreadMessages("contact", inquiry.id);
  if (existing.length > 0) return;
  await appendInquiryThreadMessage("contact", inquiry.id, {
    direction: "inbound",
    authorLabel: inquiry.name || inquiry.email,
    body: inquiry.message,
    at: inquiry.createdAt,
  });
}

export async function seedEnterpriseQuoteThread(quote: EnterpriseQuoteRecord): Promise<void> {
  const existing = await getInquiryThreadMessages("enterprise", quote.id);
  if (existing.length > 0) return;
  const body = [
    "Enterprise quote request submitted.",
    "",
    `Platform: ${quote.platformLabel}`,
    `Monthly visitors: ${quote.monthlyVisitorsLabel}`,
    `Website: ${quote.websiteUrl}`,
  ].join("\n");
  await appendInquiryThreadMessage("enterprise", quote.id, {
    direction: "inbound",
    authorLabel: quote.storeName || quote.email,
    body,
    at: quote.createdAt,
  });
}

export async function hydrateContactInquiryThread(
  inquiry: ContactInquiryRecord,
): Promise<ContactInquiryRecord & { thread: InquiryThreadMessage[] }> {
  await seedContactInquiryThread(inquiry);
  const thread = await getInquiryThreadMessages("contact", inquiry.id);
  return { ...inquiry, thread };
}

export async function hydrateEnterpriseQuoteThread(
  quote: EnterpriseQuoteRecord,
): Promise<EnterpriseQuoteRecord & { thread: InquiryThreadMessage[] }> {
  await seedEnterpriseQuoteThread(quote);
  const thread = await getInquiryThreadMessages("enterprise", quote.id);
  return { ...quote, thread };
}

async function markContactUnreadInternal(id: string): Promise<void> {
  const row = await getContactInquiryById(id);
  if (!row || !row.read) return;
  const redis = getRedis();
  await redis.set(`fit-room:contactInquiry:${id}`, { ...row, read: false });
  await getUnreadContactInquiryCount();
}

async function markEnterpriseUnreadInternal(id: string): Promise<void> {
  const quote = await getEnterpriseQuoteById(id);
  if (!quote || !quote.read) return;
  const redis = getRedis();
  await redis.set(`fit-room:enterpriseQuote:${id}`, { ...quote, read: false });
  await getUnreadEnterpriseQuoteCount();
}

async function getUnreadContactInquiryCount(): Promise<number> {
  const mod = await import("@/lib/contactInquiriesStore");
  return mod.getUnreadContactInquiryCount();
}

async function getUnreadEnterpriseQuoteCount(): Promise<number> {
  const mod = await import("@/lib/enterpriseQuoteInquiriesStore");
  return mod.getUnreadEnterpriseQuoteCount();
}

export async function markInquiryUnread(kind: InquiryConversationKind, inquiryId: string): Promise<void> {
  if (kind === "contact") await markContactUnreadInternal(inquiryId);
  else await markEnterpriseUnreadInternal(inquiryId);
}

export async function wasResendInboundProcessed(emailId: string): Promise<boolean> {
  const id = emailId.trim();
  if (!id) return false;
  const redis = getRedis();
  const v = await redis.get(`${INBOUND_PROCESSED_PREFIX}${id}`);
  return v === "1" || v === 1 || v === true;
}

export async function markResendInboundProcessed(emailId: string): Promise<void> {
  const id = emailId.trim();
  if (!id) return;
  const redis = getRedis();
  await redis.set(`${INBOUND_PROCESSED_PREFIX}${id}`, "1");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEmailAddress(raw: string): string {
  const t = raw.trim();
  const angle = /<([^>]+)>/.exec(t);
  if (angle?.[1]) return normalizeEmail(angle[1]);
  return normalizeEmail(t);
}

export async function resolveInquiryFromInboundEmail(params: {
  from: string;
  subject: string;
  headers: Record<string, unknown> | null | undefined;
}): Promise<{ kind: InquiryConversationKind; inquiryId: string } | null> {
  const headerRef = extractThreadRefFromEmailHeaders(params.headers);
  if (headerRef) return headerRef;

  const subjectRef = parseFitRoomThreadRef(params.subject);
  if (subjectRef) return subjectRef;

  const sender = parseEmailAddress(params.from);
  if (!sender.includes("@")) return null;

  const contacts = await listContactInquiries(80);
  for (const c of contacts) {
    if (normalizeEmail(c.email) === sender) return { kind: "contact", inquiryId: c.id };
  }

  const quotes = await listEnterpriseQuotes(80);
  for (const q of quotes) {
    if (normalizeEmail(q.email) === sender) return { kind: "enterprise", inquiryId: q.id };
  }

  return null;
}

export function stripQuotedEmailReply(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^on .+ wrote:$/i.test(t)) break;
    if (/^>{1,}\s?/.test(line)) continue;
    if (/^From:\s/i.test(line)) break;
    if (/^Sent:\s/i.test(line)) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

export async function deleteInquiryThread(kind: InquiryConversationKind, inquiryId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(threadKey(kind, inquiryId.trim()));
}
