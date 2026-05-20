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
 * Compact intro strip for Subscriptions: small cards, tight spacing (brief lead-in to pricing).
 */
export function WhatYouNeedToDoSteps() {
  return (
    <>
      <h2
        id="what-you-need-to-do-heading"
        className="text-center text-sm font-semibold uppercase tracking-widest text-[#C6A77D] md:text-left"
      >
        What you need to do
      </h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-zinc-600 md:mx-0 md:text-left">
        Nothing complicated. No app to download, no software to install.
      </p>
      <ul
        className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3"
        aria-label="Setup steps"
      >
        {setupCards.map(({ Icon, text }) => (
          <li
            key={text}
            className="flex flex-col rounded-xl border border-surface-border bg-white p-3.5 shadow-sm"
          >
            <div className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b7355] to-[#c6a77d] text-white shadow-sm">
              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <p className="text-xs font-medium leading-snug text-zinc-800">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
