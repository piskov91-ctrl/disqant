"use client";

import { useCallback, useState } from "react";
import {
  fetchSubscriptionCheckoutUrl,
  registerUrlForSubscriptionCheckout,
} from "@/lib/subscriptionCheckoutClient";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";

type StripeSubscribeButtonProps = {
  planKey: SubscriptionPlanKey;
  className: string;
  children: React.ReactNode;
};

export function StripeSubscribeButton({ planKey, className, children }: StripeSubscribeButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(() => {
    void (async () => {
      setPending(true);
      setError(null);
      try {
        const result = await fetchSubscriptionCheckoutUrl(planKey);
        if (!result.ok && "unauthorized" in result && result.unauthorized) {
          window.location.assign(registerUrlForSubscriptionCheckout(planKey));
          return;
        }
        if (result.ok) window.location.assign(result.url);
        else setError("error" in result ? result.error : "Could not start checkout");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setPending(false);
      }
    })();
  }, [planKey]);

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
