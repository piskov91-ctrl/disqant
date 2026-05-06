"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";

type StripeSubscribeButtonProps = {
  planKey: SubscriptionPlanKey;
  className: string;
  children: React.ReactNode;
};

export function StripeSubscribeButton({ planKey, className, children }: StripeSubscribeButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(() => {
    void (async () => {
      setPending(true);
      setError(null);
      try {
        const meRes = await fetch("/api/retailer/me", { credentials: "include" });
        if (!meRes.ok) {
          router.push("/login?next=/subscriptions");
          return;
        }
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });
        const data = (await checkoutRes.json()) as { url?: string; error?: string };
        if (!checkoutRes.ok) {
          if (data.error === "Unauthorized.") {
            router.push("/login?next=/subscriptions");
            return;
          }
          setError(data.error || "Could not start checkout.");
          return;
        }
        if (!data.url) {
          setError("Checkout URL missing. Please try again.");
          return;
        }
        window.location.assign(data.url);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setPending(false);
      }
    })();
  }, [planKey, router]);

  return (
    <div className="flex w-full flex-col gap-2">
      <button type="button" className={className} disabled={pending} onClick={onClick}>
        {pending ? "Loading…" : children}
      </button>
      {error ? (
        <p className="text-xs text-red-300/95" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
