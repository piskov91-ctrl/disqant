const items = [
  {
    title: "Retail-grade quality",
    body: "Outputs tuned for PDPs and ads—sharp edges, believable fabric, and skin tones that stay natural.",
  },
  {
    title: "Built for scale",
    body: "Queue thousands of SKUs, prioritize VIP shoppers, and burst through seasonal spikes without re-architecting.",
  },
  {
    title: "Your brand, your UX",
    body: "White-label widgets or headless API. Own the journey from upload to shareable lookbook links.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-28 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
          Why Disquant
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Everything you need to sell with confidence online
        </p>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-surface-border bg-surface-raised/40 p-8 transition hover:border-zinc-700 hover:bg-surface-raised/60"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
