import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { EnterpriseQuoteButton } from "@/components/EnterpriseQuoteModal";
import { StripeSubscribeButton } from "@/components/StripeSubscribeButton";

type Plan = {
  name: string;
  /** Marketing line under tier name — subscriptions page copy. */
  description: string;
  price: string | null;
  period: string | null;
  features: readonly string[];
  highlighted: boolean;
  contactOnly?: boolean;
  /** Shown instead of price for contact tier (e.g. "Contact us"). */
  subtitle?: string;
  /** Only for Enterprise — self-serve plans use Stripe checkout or Contact. */
  href?: string;
  /** When set, the CTA starts a Stripe Subscription Checkout for this tier. */
  stripePlan?: SubscriptionPlanKey;
};

const plans: Plan[] = [
  {
    name: "Starter",
    description: "The fastest way to add virtual try-ons to a boutique-sized catalogue",
    price: "£50",
    period: "/month",
    features: [
      "100 try-ons included each billing month",
      "Up to 10 top-up purchases per billing cycle (then unlocks next cycle)",
      "Wear Me on every product page, automatically",
      "Email support",
      "Live on your store in under 10 minutes",
    ],
    highlighted: false,
    stripePlan: "starter",
  },
  {
    name: "Boutique",
    description: "Perfect for independent boutiques and small online stores",
    price: "£149",
    period: "/month",
    features: [
      "300 try-ons included each billing month",
      "Up to 10 top-up purchases per billing cycle",
      "Wear Me on every product page, automatically",
      "See which items your shoppers try on most",
      "Live on your store in under 10 minutes",
    ],
    highlighted: false,
    stripePlan: "boutique",
  },
  {
    name: "Studio",
    description: "Ideal for growing fashion brands ready to scale",
    price: "£299",
    period: "/month",
    features: [
      "600 try-ons included each billing month",
      "Up to 20 top-up purchases per billing cycle",
      "Wear Me on every product page, automatically",
      "Wear Me Stats — hourly and daily patterns",
      "Priority support",
      "Live on your store in under 10 minutes",
    ],
    highlighted: true,
    stripePlan: "studio",
  },
  {
    name: "Premium",
    description: "Built for established retailers with a high-volume catalogue",
    price: "£599",
    period: "/month",
    features: [
      "1200 try-ons included each billing month",
      "Unlimited top-up purchases — buy extra try-ons whenever you need",
      "Wear Me on every product page, automatically",
      "Wear Me Stats and product breakdowns",
      "Dedicated support",
      "Custom integration help if needed",
      "Live on your store in under 10 minutes",
    ],
    highlighted: false,
    stripePlan: "premium",
  },
  {
    name: "Enterprise",
    description: "For large retailers, chains and platforms. Custom setup and dedicated support included",
    price: null,
    period: null,
    features: [
      "Unlimited try-ons — no cap, no worries",
      "Everything in Premium",
      "Custom pricing and contract",
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
      className="scroll-mt-28 border-t border-[#C6A77D]/15 bg-transparent py-20 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#C6A77D]">
          Subscriptions
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
          Plans for every stage
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-[#F5EDE4]/70 md:text-base">
          All plans include core try-on and integration support. Upgrade as your store grows.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {plans.map((plan) => {
            const isContact = Boolean(plan.contactOnly);
            const ctaLabel = plan.stripePlan ? "Subscribe" : "Get Started";

            return (
              <article
                key={plan.name}
                className={`relative flex min-h-0 flex-col rounded-2xl border p-7 md:p-8 ${
                  plan.highlighted
                    ? "border-[#C6A77D]/55 bg-[#231e1a] shadow-lg shadow-black/30 ring-1 ring-[#C6A77D]/35"
                    : "border-[#C6A77D]/20 bg-[#1f1b17]/90"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-3 py-0.5 text-xs font-semibold text-[#2C241F]">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-[#F5EDE4]">{plan.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#F5EDE4]/70">{plan.description}</p>

                {isContact ? (
                  <p className="mt-6 min-h-[3.5rem] text-2xl font-semibold tracking-tight text-[#F5EDE4]">
                    {plan.subtitle ?? "Contact us"}
                  </p>
                ) : (
                  <div className="mt-6 flex min-h-[3.5rem] items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight text-[#F5EDE4]">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[#F5EDE4]/55">{plan.period}</span>
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm text-[#F5EDE4]/85">
                  {plan.features.map((f, i) => (
                    <li key={`${plan.name}-${i}`} className="flex gap-2">
                      <span className="shrink-0 text-[#C6A77D]" aria-hidden>
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isContact ? (
                  <EnterpriseQuoteButton className="btn-accent-gradient mt-8 w-full" />
                ) : plan.stripePlan ? (
                  <StripeSubscribeButton
                    planKey={plan.stripePlan}
                    className="wear-me-btn mt-8 w-full disabled:cursor-wait disabled:opacity-70"
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
