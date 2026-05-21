import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

/** Single friendly label for greetings (never empty). */
function sanitizeWearMeStoreLabel(name: string): string {
  const t = name.trim();
  return t.length > 0 ? t : "there";
}

/** Plain multipart body shared by admin Send Email and retailer “email developer” flow. */
export function buildWearMeIntegrationPlainEmailBody(storeLabel: string, snippet: string): string {
  const who = sanitizeWearMeStoreLabel(storeLabel);
  return [
    `Hi ${who},`,
    "",
    "Don't worry — this is much simpler than it sounds. I have attached a short guide that walks you through it step by step. Most people have it done in under 5 minutes. No coding knowledge needed — just copy and paste.",
    "",
    "Your unique Wear Me code is:",
    "",
    snippet,
    "",
    "Once it is added to your site, open any product page and the Wear Me button will appear on your product images automatically.",
    "",
    "If anything does not look right or you get stuck, please reach out to your website support team or simply reply to this email and we will help you personally.",
    "",
    "Kind regards,",
    "The Fit Room Team",
  ].join("\n");
}

/** Branded multipart HTML counterpart. */
export function buildWearMeIntegrationEmailHtml(opts: {
  emailSubjectLine: string;
  storeLabel: string;
  snippet: string;
  heading?: string | null;
}): string {
  const who = sanitizeWearMeStoreLabel(opts.storeLabel);
  const innerHtml =
    transactionalParagraph(`Hi ${who},`) +
    transactionalParagraph(
      "Don't worry — this is much simpler than it sounds. I have attached a short guide that walks you through it step by step. Most people have it done in under 5 minutes. No coding knowledge needed — just copy and paste.",
    ) +
    transactionalParagraph("Your unique Wear Me code is:") +
    transactionalSnippetBlock(opts.snippet.trim()) +
    transactionalParagraph(
      "Once it is added to your site, open any product page and the Wear Me button will appear on your product images automatically.",
    ) +
    transactionalParagraph(
      "If anything does not look right or you get stuck, please reach out to your website support team or simply reply to this email and we will help you personally.",
    ) +
    transactionalParagraph("Kind regards,") +
    transactionalParagraph("The Fit Room Team");

  const preheader = "Wear Me setup guide attached — paste one line, done in minutes.";

  return wrapFitRoomTransactionalHtml({
    documentTitle: opts.emailSubjectLine.slice(0, 72),
    preheader,
    heading: opts.heading?.trim() || "Your Wear Me integration",
    innerHtml,
  });
}
