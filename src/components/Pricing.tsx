import Link from "next/link";
import { PricingGetStartedCta } from "@/components/PricingGetStartedCta";

type Plan = {
  name: string;
  price: string | null;
  period: string | null;
  features: readonly string[];
  highlighted: boolean;
  contactOnly?: boolean;
  /** Shown instead of price for contact tier (e.g. "Contact us"). */
  subtitle?: string;
  /** Only for Enterprise — self-serve plans use {@link PricingGetStartedCta}. */
  href?: string;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "£149",
    period: "/month",
    features: [
      "300 try-ons",
      "For small stores",
      "Email support",
      "Easy integration",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "£299",
    period: "/month",
    features: ["600 try-ons", "For growing stores", "Priority support"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "£599",
    period: "/month",
    features: ["1,200 try-ons", "For large stores", "Dedicated support"],
    highlighted: false,
  },
  {
    name: "Enterprise",
    price: null,
    period: null,
    features: ["Unlimited try-ons", "Custom integration"],
    highlighted: false,
    href: "/contact",
    contactOnly: true,
    subtitle: "Contact us",
  },
];

type PricingProps = {
  /** Omit or set empty to avoid a duplicate `id` when this block is already the page subject (e.g. `/subscriptions`). */
  sectionId?: string;
};

export function Pricing({ sectionId = "subscriptions" }: PricingProps) {
  return (
    <section
      id={sectionId || undefined}
      className="scroll-mt-28 border-t border-white/10 bg-zinc-950/40 py-20 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
          Subscriptions
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
          Plans for every stage
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-zinc-400 md:text-base">
          All plans include core try-on and integration support. Upgrade as your store grows.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isContact = Boolean(plan.contactOnly);
            const ctaLabel = isContact ? "Contact us" : "Get Started";

            return (
              <article
                key={plan.name}
                className={`relative flex min-h-0 flex-col rounded-2xl border p-7 md:p-8 ${
                  plan.highlighted
                    ? "border-accent/50 bg-zinc-900/80 shadow-lg shadow-black/20 ring-1 ring-accent/30"
                    : "border-white/10 bg-zinc-900/40"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-zinc-50">{plan.name}</h3>

                {isContact ? (
                  <p className="mt-6 min-h-[3.5rem] text-2xl font-semibold tracking-tight text-zinc-50">
                    {plan.subtitle ?? "Contact us"}
                  </p>
                ) : (
                  <div className="mt-6 flex min-h-[3.5rem] items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-zinc-50">
                      {plan.price}
                    </span>
                    <span className="text-sm text-zinc-500">{plan.period}</span>
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="shrink-0 text-accent" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isContact ? (
                  <Link href={plan.href ?? "/contact"} className="btn-accent-gradient mt-8 w-full">
                    {ctaLabel}
                  </Link>
                ) : (
                  <PricingGetStartedCta className="btn-accent-gradient mt-8 w-full disabled:cursor-wait disabled:opacity-70">
                    {ctaLabel}
                  </PricingGetStartedCta>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
