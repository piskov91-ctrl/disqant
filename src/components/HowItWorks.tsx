const steps = [
  {
    n: "1",
    title: "Pick a product",
    body: "Choose something from your catalogue—the PDP image is enough to get started.",
  },
  {
    n: "2",
    title: "Upload your photo",
    body: "Your shopper adds a normal full-length picture from their camera roll. No studio, no awkward posing.",
  },
  {
    n: "3",
    title: "See yourself wearing it",
    body: "They get a believable preview in seconds. If it doesn’t feel right, they move on before you’ve paid for shipping.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-y border-surface-border bg-surface-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Three steps your customers already understand
        </p>
        <p className="mx-auto mt-4 max-w-xl text-center text-zinc-600">
          No app download, no account wall—just the product they’re looking at and a photo they already have.
        </p>

        <ol className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((s) => (
            <li key={s.title} className="flex flex-col rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-lg font-bold text-white shadow-accent-glow">
                {s.n}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
