type GuideSection = {
  id: string;
  title: string;
  intro?: string;
  steps: readonly string[];
  note?: string;
};

const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    id: "stripe",
    title: "Stripe плащания",
    intro: "Как да създадеш Payment Link за Enterprise клиент",
    steps: [
      "Влез в Stripe Dashboard → Payment Links → Create.",
      "Добави продукт с месечна цена.",
      "Намери Metadata и добави: Key: retailer_user_id, Value: (копирай от Retailers таб → Copy ID).",
      "Създай линка и го прати на клиента.",
      "След плащане: ако ключът не се е създал автоматично, цъкни Resend в webhook (Workbench → Webhooks → fit-room-webhook).",
    ],
  },
  {
    id: "email",
    title: "Имейл работа",
    steps: [
      "Нови запитвания идват в Admin → Contact и Enterprise табовете.",
      "Отговаряй от Admin панела — имейлът е брандиран Fit Room.",
      "Отговорите на клиентите идват в support@fit-room.com (Hostinger webmail на hpanel.hostinger.com).",
      "Провери Hostinger за отговори, след това отговори пак от Admin панела.",
    ],
  },
] as const;

function GuideStepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="mt-5 space-y-3.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-200">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2c241f] text-[11px] font-bold text-[#C6A77D]">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AdminPersonalGuide() {
  return (
    <section className="mt-8 w-full space-y-6 pb-16" aria-labelledby="personal-guide-heading">
      <header className="rounded-2xl border border-[#C6A77D]/25 bg-gradient-to-br from-[#1a1612] via-[#141210] to-zinc-950 p-6 shadow-lg shadow-black/40 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b896]">Лични бележки</p>
        <h2 id="personal-guide-heading" className="mt-2 text-2xl font-semibold tracking-tight text-[#F5EDE4] md:text-3xl">
          Guide
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Кратък справочник за ежедневна работа — Stripe плащания и имейл комуникация.
        </p>
      </header>

      {GUIDE_SECTIONS.map((section) => (
        <article
          key={section.id}
          className="rounded-2xl border border-[#C6A77D]/20 bg-[#141210]/95 p-6 shadow-inner shadow-black/30 ring-1 ring-white/[0.04] backdrop-blur-sm md:p-8"
          aria-labelledby={`guide-section-${section.id}`}
        >
          <h3
            id={`guide-section-${section.id}`}
            className="font-serif text-xl font-semibold tracking-tight text-[#C6A77D] md:text-2xl"
          >
            {section.title}
          </h3>
          {section.intro ? (
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#e8d4bc]/90">{section.intro}</p>
          ) : null}
          <GuideStepList steps={section.steps} />
          {section.note ? (
            <p className="mt-5 rounded-xl border border-zinc-800/90 bg-black/30 px-4 py-3 text-sm leading-relaxed text-zinc-400">
              {section.note}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
