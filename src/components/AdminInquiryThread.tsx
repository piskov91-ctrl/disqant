export type InquiryThreadMessageRow = {
  id: string;
  at: string;
  direction: "inbound" | "outbound";
  authorLabel: string;
  body: string;
};

function formatThreadWhen(createdAt: string): string {
  if (!Number.isFinite(Date.parse(createdAt))) return "—";
  return new Date(createdAt).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminInquiryThread({ thread }: { thread: InquiryThreadMessageRow[] }) {
  if (!thread.length) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Conversation</p>
      <ul className="space-y-2">
        {thread.map((msg) => {
          const outbound = msg.direction === "outbound";
          return (
            <li
              key={msg.id}
              className={`rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
                outbound
                  ? "border-sky-900/55 bg-sky-950/35 text-sky-50"
                  : "border-zinc-800 bg-zinc-900/70 text-zinc-100"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className={`font-semibold ${outbound ? "text-sky-200" : "text-zinc-300"}`}>
                  {msg.authorLabel}
                  <span className="ml-1.5 font-normal text-zinc-500">
                    {outbound ? "· Fit Room" : "· Client"}
                  </span>
                </span>
                <time className="tabular-nums text-zinc-500" dateTime={msg.at}>
                  {formatThreadWhen(msg.at)} UTC
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{msg.body}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
