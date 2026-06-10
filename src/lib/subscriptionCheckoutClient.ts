import { parseSubscriptionPlanKey, type SubscriptionPlanKey } from "@/lib/subscriptionPlans";

export function registerUrlForSubscriptionCheckout(planKey: SubscriptionPlanKey): string {
  return `/register?next=checkout&plan=${encodeURIComponent(planKey)}`;
}

export function parseCheckoutIntentPlan(params: { get(name: string): string | null }): SubscriptionPlanKey | null {
  if (params.get("next") !== "checkout") return null;
  return parseSubscriptionPlanKey(params.get("plan"));
}

export async function fetchSubscriptionCheckoutUrl(planKey: SubscriptionPlanKey): Promise<
  | { ok: true; url: string }
  | { ok: false; unauthorized: true }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: planKey }),
  });
  if (res.status === 401) return { ok: false, unauthorized: true };
  const data = (await res.json()) as { url?: string; error?: string };
  if (typeof data.url === "string" && data.url.length > 0) return { ok: true, url: data.url };
  return { ok: false, error: data.error || "Could not start checkout." };
}

export async function redirectToSubscriptionCheckout(planKey: SubscriptionPlanKey): Promise<void> {
  const result = await fetchSubscriptionCheckoutUrl(planKey);
  if (result.ok) {
    window.location.assign(result.url);
    return;
  }
  if (result.ok === false && "unauthorized" in result && result.unauthorized) {
    window.location.assign(registerUrlForSubscriptionCheckout(planKey));
    return;
  }
  throw new Error("error" in result ? result.error : "Could not start checkout.");
}
