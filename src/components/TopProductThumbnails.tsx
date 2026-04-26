"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { LOCAL_OR_UNKNOWN_PRODUCT } from "@/lib/tryOnConstants";

export type TopProductRow = {
  productImageUrl: string;
  tryOnCount: number;
};

function ThumbnailOrPlaceholder({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const canLoad =
    url !== LOCAL_OR_UNKNOWN_PRODUCT &&
    (url.startsWith("http://") || url.startsWith("https://")) &&
    !failed;

  if (!canLoad) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-zinc-500"
        title="No product image URL or failed to load"
      >
        <ImageOff className="h-7 w-7 shrink-0 opacity-55" aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-wide">No preview</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote product URLs from client analytics
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function TopProductThumbnails({ items }: { items: TopProductRow[] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
      {items.map((row, i) => (
        <li
          key={`${row.productImageUrl}-${i}`}
          className="flex min-w-0 flex-col items-center"
        >
          <div className="relative w-full max-w-[132px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 aspect-square">
            <ThumbnailOrPlaceholder url={row.productImageUrl} />
            <span
              className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-xs font-semibold text-zinc-100 backdrop-blur-sm"
              aria-hidden
            >
              {i + 1}
            </span>
          </div>
          <p className="mt-2.5 text-center text-sm text-zinc-400">
            {row.tryOnCount} Wear Me
          </p>
        </li>
      ))}
    </ul>
  );
}
