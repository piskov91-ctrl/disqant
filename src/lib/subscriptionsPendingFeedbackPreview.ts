import type { TestimonialSlide } from "@/components/TestimonialsSlideshow";

/** How long a just-submitted review appears in the carousel (before admin approval), including across refresh (5 minutes). */
export const SUBSCRIPTIONS_PENDING_FEEDBACK_PREVIEW_MS = 300_000;

export const SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY = "fit-room:subscriptions:pendingFeedbackPreviews";

/** Same-tab listeners (e.g. merge into carousel) after append. */
export const SUBSCRIPTIONS_PENDING_FEEDBACK_EVENT = "fit-room-subscriptions-pending-feedback";

export type StoredPendingFeedbackPreview = {
  redisId: string;
  submittedAt: number;
  rating: number;
  quote: string;
  attribution: string;
};

/** Matches curated testimonials (e.g. "— L**** Store"): first letter + **** + remaining words. */
export function maskStoreNameForPendingFeedbackCarousel(storeName: string): string {
  const t = storeName.trim();
  if (!t.length) return "— ****";

  const words = t.split(/\s+/).filter(Boolean);
  const firstWord = words[0]!;
  const letterMatch = firstWord.match(/\p{L}/u);
  const letter = letterMatch ? letterMatch[0]!.toUpperCase() : firstWord.charAt(0).toUpperCase();
  const restWords = words.slice(1).join(" ");
  const maskedCore = restWords.length > 0 ? `${letter}**** ${restWords}` : `${letter}****`;
  return `— ${maskedCore}`;
}

/** Normalize attribution from localStorage (handles legacy rows saved before masking). */
function normalizeStoredPendingAttribution(attribution: string): string {
  const body = attribution.replace(/^\u2014\s*/, "").replace(/^-\s*/, "").trim();
  if (!body) return "— ****";
  if (/\*{2,}/.test(body)) {
    return attribution.replace(/^\s+/, "").startsWith("\u2014") ? attribution.trim() : `— ${body}`;
  }
  return maskStoreNameForPendingFeedbackCarousel(body);
}

function parseStored(raw: string | null): StoredPendingFeedbackPreview[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is StoredPendingFeedbackPreview =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as StoredPendingFeedbackPreview).redisId === "string" &&
        typeof (x as StoredPendingFeedbackPreview).submittedAt === "number" &&
        typeof (x as StoredPendingFeedbackPreview).rating === "number" &&
        typeof (x as StoredPendingFeedbackPreview).quote === "string" &&
        typeof (x as StoredPendingFeedbackPreview).attribution === "string",
    );
  } catch {
    return [];
  }
}

export function pruneStoredPendingFeedbackPreviews(now = Date.now()): StoredPendingFeedbackPreview[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY);
  const rows = parseStored(raw);
  const cutoff = now - SUBSCRIPTIONS_PENDING_FEEDBACK_PREVIEW_MS;
  const valid = rows.filter((r) => r.submittedAt >= cutoff);
  if (valid.length !== rows.length) {
    window.localStorage.setItem(SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY, JSON.stringify(valid));
  }
  return valid;
}

export function pendingFeedbackPreviewsToSlides(rows: StoredPendingFeedbackPreview[]): TestimonialSlide[] {
  return [...rows]
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .map((r) => ({
      id: r.redisId,
      rating: r.rating,
      quote: r.quote,
      attribution: normalizeStoredPendingAttribution(r.attribution),
    }));
}

/** Prunes expired entries in localStorage and returns slides (newest first). */
export function readPendingFeedbackPreviewSlides(): TestimonialSlide[] {
  return pendingFeedbackPreviewsToSlides(pruneStoredPendingFeedbackPreviews());
}

export function appendPendingFeedbackPreview(fields: {
  redisId: string;
  storeName: string;
  rating: number;
  message: string;
}): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const rows = pruneStoredPendingFeedbackPreviews(now);
  const entry: StoredPendingFeedbackPreview = {
    redisId: fields.redisId,
    submittedAt: now,
    rating: fields.rating,
    quote: fields.message,
    attribution: maskStoreNameForPendingFeedbackCarousel(fields.storeName),
  };
  const next = rows.filter((r) => r.redisId !== fields.redisId);
  next.push(entry);
  window.localStorage.setItem(SUBSCRIPTIONS_PENDING_FEEDBACK_STORAGE_KEY, JSON.stringify(next));
}
