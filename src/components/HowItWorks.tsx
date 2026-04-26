import { CheckCircle2, ClipboardPaste, Code2 } from "lucide-react";

const setupCards = [
  {
    Icon: Code2,
    text: "We give you one line of code",
  },
  {
    Icon: ClipboardPaste,
    text: "You paste it into your website",
  },
  {
    Icon: CheckCircle2,
    text: "It works straight away. No app, no install, no tech knowledge needed",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-y border-surface-border bg-surface-muted/40 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl space-y-14">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">What is it</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Wear Me is a virtual try-on tool that lets your customers see how clothes look on them before
              they buy. No changing rooms, no guessing, no returns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">How customers use it</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-base leading-relaxed text-zinc-600">
              <li>They see a &lsquo;Wear me&rsquo; button on your product page.</li>
              <li>They take a photo or upload one from their phone.</li>
              <li>In seconds they see themselves wearing the item.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">What you need to do</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Nothing complicated. No app to download, no software to install.
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Setup steps">
              {setupCards.map(({ Icon, text }) => (
                <li
                  key={text}
                  className="flex flex-col rounded-2xl border border-surface-border bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-accent-glow">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-zinc-800">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Why it works</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              People buy more when they can see how something looks on them. And they return less because
              they already know it fits.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
