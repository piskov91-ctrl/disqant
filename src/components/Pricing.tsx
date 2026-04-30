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
      className="scroll-mt-28 border-t border-[#C6A77D]/15 bg-transparent py-20 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-[#C6A77D]">
          Subscriptions
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
          Plans for every stage
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-[#F5EDE4]/70 md:text-base">
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
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="shrink-0 text-[#C6A77D]" aria-hidden>
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
                  <PricingGetStartedCta className="wear-me-btn mt-8 w-full disabled:cursor-wait disabled:opacity-70">
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
