"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type PricingGetStartedCtaProps = {
  className: string;
  children: React.ReactNode;
};

export function PricingGetStartedCta({ className, children }: PricingGetStartedCtaProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    void (async () => {
      setPending(true);
      try {
        const res = await fetch("/api/retailer/me", { credentials: "include" });
        router.push(res.ok ? "/dashboard" : "/register");
      } finally {
        setPending(false);
      }
    })();
  }, [router]);

  return (
    <button type="button" className={className} disabled={pending} onClick={onClick}>
      {pending ? "Loading…" : children}
    </button>
  );
}
