import Link from "next/link";
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
 * Lead-in for Subscriptions: quick setup steps (sits where the page hero was).
 */
export function WhatYouNeedToDoSteps() {
  return (
    <>
      <h1
        id="what-you-need-to-do-heading"
        className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#C6A77D] md:text-left md:text-base"
      >
        What you need to do
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-[#F5EDE4]/75 md:mx-0 md:text-left">
        Nothing complicated. No app to download, no software to install.
      </p>
      <ul
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3"
        aria-label="Setup steps"
      >
        {setupCards.map(({ Icon, text }) => (
          <li
            key={text}
            className="flex flex-col rounded-xl border border-white/20 bg-white/95 p-3 shadow-sm shadow-black/20 backdrop-blur-[2px]"
          >
            <div className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b7355] to-[#c6a77d] text-white shadow-sm">
              <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </div>
            <p className="text-xs font-medium leading-snug text-zinc-800">{text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs leading-relaxed text-[#F5EDE4]/65 md:text-left">
        Want to learn more about how it works?{" "}
        <Link
          href="/about"
          className="font-medium text-[#C6A77D] underline decoration-[#C6A77D]/60 underline-offset-[3px] transition hover:text-[#d4b896] hover:decoration-[#d4b896]"
        >
          Visit our About Us page
        </Link>
      </p>
    </>
  );
}
