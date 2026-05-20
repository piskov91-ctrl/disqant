"use client";

import { useEffect, useState } from "react";

/** Generic snippet for illustration only (not the user’s real key). */
const DEMO_SNIPPET =
  '<script async src="/widget.js" data-fit-room-key="YOUR_KEY"></script>';

const CHAR_MS = 42;
const BEFORE_BUTTON_MS = 400;
const HOLD_MS = 3200;

export function DashboardInstallPreviewAnimation() {
  const [len, setLen] = useState(0);
  const [showBtn, setShowBtn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduceMotion(mq.matches);
      if (mq.matches) {
        setLen(DEMO_SNIPPET.length);
        setShowBtn(true);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    const clearAll = () => {
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
    };

    const runCycle = () => {
      clearAll();
      setLen(0);
      setShowBtn(false);
      let n = 0;
      const tick = () => {
        n += 1;
        setLen(n);
        if (n < DEMO_SNIPPET.length) {
          timers.push(setTimeout(tick, CHAR_MS));
        } else {
          timers.push(
            setTimeout(() => {
              setShowBtn(true);
              timers.push(
                setTimeout(() => {
                  runCycle();
                }, HOLD_MS),
              );
            }, BEFORE_BUTTON_MS),
          );
        }
      };
      timers.push(setTimeout(tick, CHAR_MS));
    };

    runCycle();
    return () => clearAll();
  }, [reduceMotion]);

  const visible = DEMO_SNIPPET.slice(0, len);
  const typing = !reduceMotion && len < DEMO_SNIPPET.length;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] md:p-6"
      aria-label="Animated preview: embed code and store button"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">How the widget shows up</h3>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {reduceMotion ? "Static preview" : "Loops automatically"}
        </p>
      </div>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
        After you paste the snippet into your site, a try-on control can appear on your product pages—similar to this
        simplified example.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Code typing panel */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-zinc-950/70">
          <div className="border-b border-white/10 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Code added to your site</span>
          </div>
          <div className="min-h-[7.5rem] p-3 font-mono text-[11px] leading-relaxed text-zinc-300 md:min-h-[8rem] md:text-xs">
            <span className="text-emerald-400/90">{visible}</span>
            {typing ? (
              <span
                className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-[#c6a77d] motion-safe:animate-pulse"
                aria-hidden
              />
            ) : null}
          </div>
        </div>

        {/* Store mockup */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/60 px-2 py-2">
            <div className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-red-500/65" />
              <span className="h-2 w-2 rounded-full bg-amber-400/65" />
              <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
            </div>
            <div className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-zinc-900/90 px-2 py-1 text-[10px] text-zinc-500">
              yourshop.com / summer-linen-dress
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-3">
              <div
                className="h-24 w-20 shrink-0 rounded-lg border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900"
                aria-hidden
              />
              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-sm font-semibold text-zinc-100">Linen midi dress</p>
                <p className="mt-1 text-xs text-zinc-500">Soft natural fibre · In stock</p>
                <p className="mt-2 text-sm font-medium tabular-nums text-[#c6a77d]">£49</p>
              </div>
            </div>
            <div className="mt-5 flex min-h-[2.75rem] items-center">
              <div
                className={`origin-left transition-all duration-700 ease-out motion-reduce:transition-none ${
                  showBtn
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-2 scale-95 opacity-0"
                }`}
              >
                <span className="inline-flex rounded-full bg-gradient-to-r from-[#a68958] to-[#e8d4bc] p-px shadow-lg shadow-black/35">
                  <span className="inline-flex h-9 items-center rounded-full bg-zinc-950/90 px-5 text-xs font-semibold text-zinc-100">
                    Try it on
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
