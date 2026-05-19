import type { CSSProperties } from "react";

/**
 * Horizontal gradient for try-on usage fills: green (0–50%) → yellow (75%) → orange (99%) → red (100%).
 * Paired with {@link tryOnUsageFillStyle} so the visible slice matches usage % along the full bar semantics.
 */
export const TRY_ON_USAGE_BAR_GRADIENT =
  "linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(34, 197, 94) 50%, rgb(234, 179, 8) 75%, rgb(249, 115, 22) 99%, rgb(220, 38, 38) 100%)";

/**
 * Styles for the inner “fill” div inside a fixed track: `width` = usage %, background scaled so
 * gradient 0–100% aligns with the full track (not just the fill width).
 */
export function tryOnUsageFillStyle(pct: number): CSSProperties {
  const p = Math.min(100, Math.max(0, Number.isFinite(pct) ? pct : 0));
  if (p <= 0) {
    return { width: "0%" };
  }
  const scalePct = Math.max(p, 0.001);
  return {
    width: `${p}%`,
    backgroundImage: TRY_ON_USAGE_BAR_GRADIENT,
    backgroundSize: `${(100 / scalePct) * 100}% 100%`,
    backgroundPosition: "left center",
    backgroundRepeat: "no-repeat",
  };
}
