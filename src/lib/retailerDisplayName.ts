/** Shared retailer session display strings (safe for client + server; no auth imports). */

export type RetailerDisplayUser = {
  firstName?: string;
  lastName?: string;
  email: string;
};

/** Full name if present, otherwise email — for header / account label. */
export function retailerSessionLabel(user: RetailerDisplayUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return user.email;
}

/** First name, else email local-part, else a neutral fallback — for “Welcome back, …!”. */
export function retailerWelcomeGreetingName(user: RetailerDisplayUser): string {
  const first = user.firstName?.trim();
  if (first) return first;
  const local = user.email.split("@")[0]?.trim();
  if (local) return local;
  return "there";
}
