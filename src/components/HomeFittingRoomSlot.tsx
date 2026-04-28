"use client";

import dynamic from "next/dynamic";

const FittingRoomHero = dynamic(() => import("./FittingRoomHero"), {
  loading: () => (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-[min(100%,520px)] min-h-[220px] animate-pulse rounded-2xl border border-white/10 bg-zinc-800/25 md:max-w-none sm:min-h-[260px] md:aspect-[5/4]"
      aria-hidden
    />
  ),
});

/** Client-only slot so Three.js loads in a separate chunk (home route). */
export default function HomeFittingRoomSlot() {
  return <FittingRoomHero />;
}
