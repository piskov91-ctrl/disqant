export const COOKIE_CONSENT_STORAGE_KEY = "fit-room-cookie-consent";
export const GOOGLE_ANALYTICS_ID = "G-ZNMMF12XRD";

export type CookieConsentChoice = "accepted" | "declined";

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (value === "accepted" || value === "declined") return value;
  return null;
}

export function saveCookieConsent(choice: CookieConsentChoice): void {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
}

export function disableGoogleAnalytics(): void {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.("consent", "update", { analytics_storage: "denied" });
}
