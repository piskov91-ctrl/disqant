const quotes = [
  {
    quote:
      "Returns on knitwear were doing our head in. Since we added try-on on the PDP, the ‘wrong fit’ notes in customer service have dropped noticeably—and people actually mention it in reviews.",
    name: "Tom Reeves",
    role: "E-commerce director",
    company: "North & Thread Co. (Manchester)",
  },
  {
    quote:
      "We’re not a massive team. I didn’t want another six-month build. Disquant sat behind our existing stack and we had something shippable in a couple of sprints.",
    name: "Priya Shah",
    role: "Head of digital",
    company: "Linden Outdoor (Yorkshire)",
  },
  {
    quote:
      "Our shoppers are picky about colour in natural light. Being able to preview a coat on themselves—rather than squinting at a model shot—just feels fairer. Conversion on those lines crept up without us slashing prices.",
    name: "James Holloway",
    role: "Trading & CX lead",
    company: "Barker Row (London)",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-28 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
          What retailers say
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Honest feedback from teams we’ve spoken to
        </p>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm text-zinc-500">
          Names and companies are illustrative examples for the website.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {quotes.map((q) => (
            <blockquote
              key={q.name}
              className="flex h-full flex-col rounded-2xl border border-surface-border bg-white p-8 shadow-sm"
            >
              <p className="flex-1 text-sm leading-relaxed text-zinc-700">&ldquo;{q.quote}&rdquo;</p>
              <footer className="mt-8 border-t border-surface-border pt-6">
                <p className="text-sm font-semibold text-zinc-900">{q.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {q.role}, {q.company}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
