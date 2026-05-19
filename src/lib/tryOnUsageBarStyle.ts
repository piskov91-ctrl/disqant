import type { CSSProperties } from "react";

/**
 * Horizontal gradient for try-on usage fills: green → yellow → red across the bar (usage % maps to visible slice).
 * Paired with {@link tryOnUsageFillStyle} so the visible slice matches usage % along the full bar semantics.
 */
/** Green → yellow → red along usage intensity (smooth stops for dashboard bars). */
export const TRY_ON_USAGE_BAR_GRADIENT =
  "linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(74, 222, 128) 38%, rgb(234, 179, 8) 62%, rgb(251, 191, 36) 78%, rgb(239, 68, 68) 92%, rgb(185, 28, 28) 100%)";

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
