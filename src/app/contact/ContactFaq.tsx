"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

const FAQ_ITEMS: readonly { question: string; answer: ReactNode }[] = [
  {
    question: "How does Wear Me work?",
    answer:
      "Your shoppers tap the Wear Me button on a product page, take a quick photo or upload one from their phone, and in about 20-30 seconds they see themselves wearing the item. No app to download, no account needed.",
  },
  {
    question: "How do I add it to my store?",
    answer:
      "We give you one line of code. You paste it into your website once and the button appears on every product page automatically.",
  },
  {
    question: "Do my customers need to create an account?",
    answer: "No. They just take a photo and get their result. That is it.",
  },
  {
    question: "What happens when I use all my try-ons?",
    answer:
      "You will get an email heads-up before you run out. When the limit is reached the button stops showing until your plan renews or you top up.",
  },
  {
    question: "Can I try it before I buy?",
    answer: (
      <>
        Yes — head to our{" "}
        <Link
          href="/demo"
          className="font-semibold text-[#d4bc94] underline decoration-[#c6a77d]/50 underline-offset-2 hover:text-[#e8dcc8] hover:decoration-[#c6a77d]"
        >
          demo page
        </Link>{" "}
        and try it yourself right now. No signup needed.
      </>
    ),
  },
];

export function ContactFaq() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="scroll-mt-[calc(var(--site-header-height)+1rem)] rounded-2xl border border-[#c6a77d]/35 bg-black/20 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8"
      aria-labelledby={`${baseId}-faq-heading`}
    >
      <h2 id={`${baseId}-faq-heading`} className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">
        Frequently asked questions
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Quick answers before you reach out — happy to go deeper on the form below.
      </p>

      <div className="mt-6 divide-y divide-[#c6a77d]/20 rounded-xl border border-[#c6a77d]/25 bg-black/15 backdrop-blur-sm">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          const panelId = `${baseId}-faq-panel-${index}`;
          const triggerId = `${baseId}-faq-trigger-${index}`;
          return (
            <div key={item.question} className="first:rounded-t-xl last:rounded-b-xl">
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-[#c6a77d]/[0.06] md:px-5 md:py-4"
              >
                <span className="text-sm font-semibold leading-snug text-zinc-100 md:text-[15px]">{item.question}</span>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 text-[#c6a77d] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                className={isOpen ? "border-t border-[#c6a77d]/15 px-4 pb-4 pt-1 md:px-5 md:pb-5" : undefined}
              >
                {isOpen ? (
                  <div className="text-sm leading-relaxed text-zinc-400 md:text-[15px]">{item.answer}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
