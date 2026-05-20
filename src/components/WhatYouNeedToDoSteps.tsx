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

/**
 * Heading, intro line, and three setup cards (shared by How It Works and Subscriptions).
 * Parent layouts provide section chrome and width constraints.
 */
export function WhatYouNeedToDoSteps() {
  return (
    <>
      <h2 id="what-you-need-to-do-heading" className="text-lg font-semibold text-[#C6A77D]">
        What you need to do
      </h2>
      <p className="mt-3 text-base leading-relaxed text-zinc-600">
        Nothing complicated. No app to download, no software to install.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Setup steps">
        {setupCards.map(({ Icon, text }) => (
          <li
            key={text}
            className="flex flex-col rounded-2xl border border-surface-border bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b7355] to-[#c6a77d] text-white shadow-accent-glow">
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-sm font-medium leading-relaxed text-zinc-800">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
