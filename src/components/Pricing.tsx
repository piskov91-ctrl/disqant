import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { EnterpriseQuoteButton } from "@/components/EnterpriseQuoteModal";
import { StripeSubscribeButton } from "@/components/StripeSubscribeButton";

type Plan = {
  name: string;
  /** Short line under tier name — kept tight for compact cards. */
  description: string;
  price: string | null;
  period: string | null;
  features: readonly string[];
  highlighted: boolean;
  contactOnly?: boolean;
  /** Shown instead of price for contact tier (e.g. "Contact us"). */
  subtitle?: string;
  /** When set, the CTA starts a Stripe Subscription Checkout for this tier. */
  stripePlan?: SubscriptionPlanKey;
};

const plans: Plan[] = [
  {
    name: "Starter",
    description: "Get started fast",
    price: "£50",
    period: "/month",
    features: [
      "100 try-ons per month",
      "Wear Me on all your products",
      "Basic stats",
      "Email support",
      "Discounted top-ups available",
    ],
    highlighted: false,
    stripePlan: "starter",
  },
  {
    name: "Boutique",
    description: "For busy independents",
    price: "£149",
    period: "/month",
    features: [
      "500 try-ons per month",
      "Wear Me on all your products",
      "See what gets tried on most",
      "Email support",
      "Discounted top-ups available",
    ],
    highlighted: false,
    stripePlan: "boutique",
  },
  {
    name: "Studio",
    description: "Growing brands",
    price: "£299",
    period: "/month",
    features: [
      "1000 try-ons per month",
      "Wear Me on all your products",
      "Full stats and insights",
      "Priority support",
      "Discounted top-ups available",
    ],
    highlighted: true,
    stripePlan: "studio",
  },
  {
    name: "Premium",
    description: "High throughput",
    price: "£599",
    period: "/month",
    features: [
      "2000 try-ons per month",
      "Wear Me on all your products",
      "Advanced analytics",
      "Dedicated support",
      "Unlimited discounted top-ups",
    ],
    highlighted: false,
    stripePlan: "premium",
  },
  {
    name: "Enterprise",
    description: "Scale without limits",
    price: null,
    period: null,
    features: [
      "Unlimited try-ons",
      "Everything in Premium",
      "Custom pricing",
      "Dedicated account manager",
    ],
    highlighted: false,
    contactOnly: true,
    subtitle: "Custom quote",
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
      className="scroll-mt-28 border-t border-[#C6A77D]/15 bg-transparent py-14 md:py-16"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-[#C6A77D] sm:text-sm">
          Subscriptions
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-2xl font-semibold tracking-tight text-[#F5EDE4] md:text-3xl">
          Plans for every stage
        </p>
        <p className="mx-auto mt-3 max-w-xl text-center text-xs leading-relaxed text-[#F5EDE4]/70 sm:text-sm">
          All plans include core try-on and integration support. Upgrade as your store grows.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 lg:gap-3">
          {plans.map((plan) => {
            const isContact = Boolean(plan.contactOnly);
            const ctaLabel = plan.stripePlan ? "Subscribe" : "Get Started";

            return (
              <article
                key={plan.name}
                className={`relative flex min-h-0 min-w-0 flex-col rounded-xl border p-4 sm:p-4 ${
                  plan.highlighted
                    ? "border-[#C6A77D]/55 bg-[#231e1a] shadow-md shadow-black/25 ring-1 ring-[#C6A77D]/30"
                    : "border-[#C6A77D]/18 bg-[#1f1b17]/92"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-2 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-[#2C241F]">
                    Most popular
                  </span>
                )}

                <h3 className="text-base font-semibold leading-tight text-[#F5EDE4]">{plan.name}</h3>
                <p className="mt-1 text-[11px] leading-snug text-[#F5EDE4]/58 sm:text-xs">{plan.description}</p>

                {isContact ? (
                  <p className="mt-3 min-h-[2.75rem] text-xl font-semibold tracking-tight text-[#F5EDE4] sm:text-2xl">
                    {plan.subtitle ?? "Contact us"}
                  </p>
                ) : (
                  <div className="mt-3 flex min-h-[2.75rem] items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight text-[#F5EDE4] sm:text-3xl">{plan.price}</span>
                    <span className="text-[11px] text-[#F5EDE4]/50 sm:text-xs">{plan.period}</span>
                  </div>
                )}

                <ul className="mt-3 flex-1 space-y-1.5 text-[11px] leading-snug text-[#F5EDE4]/82 sm:text-xs sm:leading-snug">
                  {plan.features.map((f, i) => (
                    <li key={`${plan.name}-${i}`} className="flex gap-1.5">
                      <span className="mt-px shrink-0 text-[10px] text-[#C6A77D] sm:text-[11px]" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isContact ? (
                  <EnterpriseQuoteButton className="btn-accent-gradient mt-4 w-full py-2.5 text-sm" />
                ) : plan.stripePlan ? (
                  <StripeSubscribeButton
                    planKey={plan.stripePlan}
                    className="wear-me-btn mt-4 w-full py-2.5 text-sm disabled:cursor-wait disabled:opacity-70"
                  >
                    {ctaLabel}
                  </StripeSubscribeButton>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
