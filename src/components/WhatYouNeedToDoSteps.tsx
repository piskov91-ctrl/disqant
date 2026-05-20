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
        className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#C6A77D] md:text-left"
      >
        What you need to do
      </h2>
      <p className="mt-1.5 text-center text-xs leading-relaxed text-[#F5EDE4]/72 md:mx-0 md:text-left">
        Nothing complicated. No app to download, no software to install.
      </p>
      <ul
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2"
        aria-label="Setup steps"
      >
        {setupCards.map(({ Icon, text }) => (
          <li
            key={text}
            className="flex flex-col rounded-lg border border-white/20 bg-white/95 p-2.5 shadow-sm shadow-black/20 backdrop-blur-[2px]"
          >
            <div className="mb-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b7355] to-[#c6a77d] text-white shadow-sm">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </div>
            <p className="text-[11px] font-medium leading-tight text-zinc-800">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
