"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronDown, Code, CreditCard, LineChart, Rocket } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

type FaqEntry = { question: string; answer: ReactNode };

type FaqCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: readonly FaqEntry[];
};

const FAQ_CATEGORIES: readonly FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    items: [
      {
        question: "How does Wear Me work?",
        answer:
          "Your shoppers tap the Wear Me button on a product page, take a quick photo or upload one from their phone, and in about 20-30 seconds they see themselves wearing the item. No app to download, no account needed.",
      },
      {
        question: "Do shoppers need an account, how fast is setup, and can I try it first?",
        answer: (
          <>
            Customers don&apos;t create an account—they take a photo and get their result. Most stores are live in under ten minutes: paste one line of code, save, and you&apos;re done. Want to feel it yourself first? Visit our{" "}
            <Link
              href="/demo"
              className="font-semibold text-[#d4bc94] underline decoration-[#c6a77d]/50 underline-offset-2 hover:text-[#e8dcc8] hover:decoration-[#c6a77d]"
            >
              demo page
            </Link>{" "}
            anytime—no signup required.
          </>
        ),
      },
      {
        question: "Will my customers actually use it?",
        answer:
          "Yes—especially on mobile. Shoppers already expect to “try things on”; Wear Me brings that online. The button shows when it helps and stays out of the way when it doesn’t.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical",
    icon: Code,
    items: [
      {
        question: "How do I add it to my store?",
        answer:
          "We give you one line of code. You paste it into your website once and the button appears on every product page automatically.",
      },
      {
        question: "Does it work on mobile?",
        answer:
          "Yes. Shoppers can use their phone camera or upload a photo from their gallery. It works on any modern phone or tablet.",
      },
      {
        question: "Is my customer data safe?",
        answer:
          "Photos are processed to generate the result and are not stored on our servers. We don't build profiles on your customers or share their data with anyone.",
      },
    ],
  },
  {
    id: "for-your-business",
    title: "For Your Business",
    icon: LineChart,
    items: [
      {
        question: "Is Wear Me worth it—and will it lift sales?",
        answer:
          "If even a modest share of shoppers uses it and buys something they otherwise wouldn’t, it tends to pay for itself—especially alongside fewer returns and abandoned carts. Seeing the item on themselves builds confidence before checkout, which is where conversion usually moves.",
      },
      {
        question: "What kinds of stores use Wear Me, including smaller shops?",
        answer:
          "Any store selling apparel, footwear, accessories—anything worn—gets value when shoppers aren’t sure how it’ll look on them. Small teams benefit too: one line of code, no dedicated developer required, and each incremental sale often matters more.",
      },
      {
        question: "How does this cut returns compared to great product photos?",
        answer:
          "Great photos show the product on a model; Wear Me shows it on your customer. Many returns come from “looked different on me than on the site.” Letting people preview on themselves removes that surprise—they know what they’re ordering.",
      },
    ],
  },
  {
    id: "pricing-plans",
    title: "Pricing & Plans",
    icon: CreditCard,
    items: [
      {
        question: "What happens when I hit my try-on limit—or a shopper wants another shot?",
        answer:
          "We email you before you run out; once the limit is reached the button hides until renewal or a top-up. Shoppers can retry with a new photo or another product—there’s no cap on attempts from their side, only on generated results under your plan.",
      },
      {
        question: "What if I need more try-ons mid-month?",
        answer:
          "Top up anytime from your dashboard without switching plans. Extra try-ons unlock immediately after payment.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes. There are no long contracts—cancel whenever you like from your account settings.",
      },
    ],
  },
];

function faqKey(categoryId: string, question: string) {
  return `${categoryId}::${question}`;
}

export function ContactFaq() {
  const baseId = useId();
  const [openKey, setOpenKey] = useState<string | null>(null);

  function toggle(categoryId: string, question: string) {
    const k = faqKey(categoryId, question);
    setOpenKey((prev) => (prev === k ? null : k));
  }

  return (
    <section
      id="faq"
      className="scroll-mt-[calc(var(--site-header-height)+1rem)] rounded-2xl border border-[#c6a77d]/35 bg-black/15 p-6 shadow-lg shadow-black/20 backdrop-blur-md md:p-8"
      aria-labelledby={`${baseId}-faq-heading`}
    >
      <h2 id={`${baseId}-faq-heading`} className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">
        Frequently asked questions
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Quick answers before you reach out — happy to go deeper on the form below.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {FAQ_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <section
              key={category.id}
              className="rounded-2xl border border-[#c6a77d]/40 bg-black/30 p-5 shadow-inner shadow-black/20 backdrop-blur-sm md:p-6"
              aria-labelledby={`${baseId}-cat-${category.id}`}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#c6a77d]/35 bg-[#c6a77d]/[0.12] text-[#d4bc94] md:h-12 md:w-12"
                  aria-hidden
                >
                  <Icon className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id={`${baseId}-cat-${category.id}`}
                    className="text-base font-semibold tracking-tight text-zinc-50 md:text-lg"
                  >
                    {category.title}
                  </h3>
                  <ul className="mt-4 divide-y divide-[#c6a77d]/18 rounded-xl border border-[#c6a77d]/22 bg-black/25">
                    {category.items.map((item, itemIndex) => {
                      const k = faqKey(category.id, item.question);
                      const isOpen = openKey === k;
                      const stableSuffix = `${category.id}-${itemIndex}`;
                      const panelId = `${baseId}-panel-${stableSuffix}`;
                      const triggerId = `${baseId}-trigger-${stableSuffix}`;

                      return (
                        <li key={item.question} className="first:rounded-t-[11px] last:rounded-b-[11px]">
                          <button
                            id={triggerId}
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => toggle(category.id, item.question)}
                            className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#c6a77d]/[0.07] md:px-4 md:py-4"
                          >
                            <span className="text-sm font-semibold leading-snug text-zinc-100 md:text-[15px]">
                              {item.question}
                            </span>
                            <ChevronDown
                              className={`mt-0.5 h-5 w-5 shrink-0 text-[#c6a77d] transition-transform duration-300 ease-out motion-reduce:transition-none ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              aria-hidden
                            />
                          </button>
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId}
                            className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                            style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div className="border-t border-[#c6a77d]/18 px-4 pb-4 pt-2 text-sm leading-relaxed text-zinc-400 md:px-4 md:text-[15px]">
                                {item.answer}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
