"use client";

import { useState } from "react";
import { AnalyticsInsightsModal } from "@/components/AnalyticsInsightsModal";

export function DashboardAnalyticsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-violet-500/35 bg-violet-950/40 px-6 text-sm font-semibold text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-900/35"
      >
        Analytics
      </button>
      <AnalyticsInsightsModal
        open={open}
        onClose={() => setOpen(false)}
        fetchUrl="/api/retailer/analytics/insights"
        theme="site"
      />
    </>
  );
}
