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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(() => {
    void (async () => {
      setPending(true);
      setError(null);
      try {
        // Hard redirect so the browser follows Stripe's hosted checkout immediately.
        window.location.assign(`/api/stripe/checkout?plan=${encodeURIComponent(planKey)}`);
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
