const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For indie brands validating try-on.",
    features: ["2,000 renders / mo", "Email support", "REST API", "Basic analytics"],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$199",
    period: "/mo",
    description: "For scaling catalogs and campaigns.",
    features: [
      "25,000 renders / mo",
      "Priority support",
      "Webhooks & SSO",
      "Custom watermarks off",
    ],
    cta: "Try it now",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For global retailers and platforms.",
    features: ["Unlimited regions", "Dedicated success", "VPC / on-prem options", "SLA & DPA"],
    cta: "Talk to sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-28 border-t border-surface-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
          Pricing
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Plans that grow with your traffic
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-zinc-400">
          Transparent usage. Overage bundles available. Annual billing saves two months.
        </p>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-accent/50 bg-surface-raised shadow-[0_0_60px_-20px_rgba(124,92,255,0.45)]"
                  : "border-surface-border bg-surface-raised/30"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                )}
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-zinc-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.highlighted ? "/demo" : "#"}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-accent text-white hover:bg-accent-muted"
                    : "border border-surface-border bg-transparent text-white hover:border-zinc-600 hover:bg-surface-raised"
                }`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
