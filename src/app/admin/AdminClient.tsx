"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Footer } from "@/components/Footer";
import { AnalyticsInsightsModal } from "@/components/AnalyticsInsightsModal";
import { AdminWearMeClient } from "@/app/admin/AdminWearMeClient";
import { getNextMonthlyResetUtcDateForDisplay } from "@/lib/billingCycle";
import { storedOrDerivedBasePlanLimit, totalTryOnsUsed, clientTryOnFullyBlocked } from "@/lib/clientTryOnBuckets";

type KeyRecord = {
  id: string;
  clientName: string;
  contactEmail?: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  basePlanLimit?: number;
  topUpLimit?: number;
  topUpUsageCount?: number;
  billingAnchorDay?: number;
  lastAutoBillingResetYyyymmdd?: string;
  /** Equals `usageLimit` when the 75% quota warning was sent this cycle */
  usageSeventyFivePctEmailSentForLimit?: number;
  /** Equals `usageLimit` when the 99% quota warning was sent this cycle */
  usageNinetyNinePctEmailSentForLimit?: number;
  createdAt: string;
};

function formatKeyCreatedUtc(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNextResetUtc(k: KeyRecord): string {
  try {
    const next = getNextMonthlyResetUtcDateForDisplay(k, new Date());
    if (!Number.isFinite(next.getTime())) return "—";
    return next.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatIsoDateUtc(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function billingResetReasonLabel(reason: "monthly_billing" | "admin_manual"): string {
  return reason === "monthly_billing" ? "Monthly billing" : "Admin manual";
}

type AdminTopUpPurchaseRow = {
  clientId: string;
  clientName: string;
  storeName: string;
  purchasedAt: string;
  tryOnsAdded: number;
  amountPaidPence: number | null;
  currency: string;
  stripeCheckoutSessionId?: string;
  packId?: string;
};

function formatMinorCurrency(amountPence: number | null, currency: string): string {
  if (amountPence == null || !Number.isFinite(amountPence)) return "—";
  const major = amountPence / 100;
  const c = currency.toLowerCase();
  if (c === "gbp") return `£${major.toFixed(2)}`;
  return `${major.toFixed(2)} ${c.toUpperCase()}`;
}

type ClientAnalyticsRow = {
  kind: "client";
  clientId: string;
  clientName: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

type DemoVisitorAnalyticsRow = {
  kind: "demo";
  label: string;
  sessionId: string | null;
  lastIp: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

type AnalyticsSummary = {
  demoVisitsToday: number;
  demoVisitsThisMonth: number;
  tryOnsTotal: number;
  tryOnsRetailer: number;
  tryOnsVisitor: number;
  clients: ClientAnalyticsRow[];
  demoVisitors: DemoVisitorAnalyticsRow[];
};

type AdminTab = "clients" | "topUps" | "analytics" | "wearMe" | "recovery";

type AdminFashnCredits = {
  total: number | null;
  subscription: number | null;
  onDemand: number | null;
};

type AdminResendUsage = {
  dailyUsed: number | null;
  monthlyUsed: number | null;
  dailyLimit: number;
  monthlyLimit: number;
};

type RecoveryAccountRow = {
  userId: string;
  email: string;
  storeName: string;
  companyName: string;
  clientId: string | null;
  deletedAt: string;
  remainingTryOns: number | null;
  usageLimit: number | null;
  usageCount: number | null;
};

const CREDIT_PLANS = [
  {
    name: "Starter",
    tryOns: 300,
    credits: 600,
    fashnCost: 34,
    price: 149,
    profit: 115,
  },
  {
    name: "Growth",
    tryOns: 600,
    credits: 1200,
    fashnCost: 68,
    price: 299,
    profit: 231,
  },
  {
    name: "Pro",
    tryOns: 1200,
    credits: 2400,
    fashnCost: 136,
    price: 599,
    profit: 463,
  },
] as const;

/** Per-try-on unit economics from Starter (linear Fashn cost). */
const FASHN_GBP_PER_TRYON = 34 / 300;
const RECOMMENDED_GBP_PER_TRYON = 149 / 300;

function formatGbp(n: number) {
  return `£${n.toFixed(2)}`;
}

function isValidContactEmail(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function quotaNoticeSentForCurrentTier(sentForLimit: number | undefined, usageLimit: number): boolean {
  return typeof sentForLimit === "number" && Number.isFinite(sentForLimit) && sentForLimit === usageLimit;
}

const QUOTA_EMAIL_NOTICE_BADGE_BASE =
  "inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums tracking-tight";

/** Small badges for 80% / 100% quota transactional emails sent for the current limit tier (cleared on usage reset). */
function QuotaEmailNoticeBadges({ k }: { k: KeyRecord }) {
  const seventyFive = quotaNoticeSentForCurrentTier(k.usageSeventyFivePctEmailSentForLimit, k.usageLimit);
  const ninetyNine = quotaNoticeSentForCurrentTier(k.usageNinetyNinePctEmailSentForLimit, k.usageLimit);
  const base = QUOTA_EMAIL_NOTICE_BADGE_BASE;

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-1"
      role="group"
      aria-label="Quota email notices for current try-on cycle"
    >
      <span
        className={
          seventyFive
            ? `${base} border-amber-700/70 bg-amber-950/50 text-amber-200 motion-safe:animate-pulse`
            : `${base} border-zinc-700/70 bg-zinc-950/30 text-zinc-500`
        }
        title={
          seventyFive
            ? "75% usage email was sent for this try-on limit tier."
            : "75% email not sent for this tier yet, or the try-on limit changed after it was sent."
        }
      >
        75%
      </span>
      <span
        className={
          ninetyNine
            ? `${base} border-rose-800/70 bg-rose-950/45 text-rose-200`
            : `${base} border-zinc-700/70 bg-zinc-950/30 text-zinc-500`
        }
        title={
          ninetyNine
            ? "99% usage email was sent for this tier (about to hit the limit)."
            : "99% email not sent for this tier yet, or the try-on limit changed after it was sent."
        }
      >
        99%
      </span>
    </div>
  );
}

const ADMIN_QUICK_LINKS = [
  { label: "Vercel Dashboard", href: "https://vercel.com/dashboard" },
  { label: "Stripe Dashboard", href: "https://dashboard.stripe.com" },
  { label: "Hostinger Email", href: "https://hpanel.hostinger.com/emails" },
  { label: "Fashn.ai", href: "https://app.fashn.ai" },
  { label: "Upstash", href: "https://console.upstash.com" },
  { label: "Resend", href: "https://resend.com/emails" },
] as const;

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>("clients");
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KeyRecord | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editFashnApiKey, setEditFashnApiKey] = useState("");
  const [editMonthlyPlanLimit, setEditMonthlyPlanLimit] = useState("");
  const [editTopUpLimit, setEditTopUpLimit] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [clientName, setClientName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fashnApiKey, setFashnApiKey] = useState("");
  const [usageLimit, setUsageLimit] = useState("1000");
  const [creating, setCreating] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [creditCalcOpen, setCreditCalcOpen] = useState(false);
  const [calcTryOnsInput, setCalcTryOnsInput] = useState("");
  /** Which client key powers admin Wear Me (retailer `/api/tryon`, not the public demo). */
  const [wearMeKeyId, setWearMeKeyId] = useState<string | null>(null);
  const [analyticsInsightsOpen, setAnalyticsInsightsOpen] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryAccountRow[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryDeletingUserId, setRecoveryDeletingUserId] = useState<string | null>(null);
  const [fashnCredits, setFashnCredits] = useState<AdminFashnCredits | null>(null);
  const [fashnCreditsLoading, setFashnCreditsLoading] = useState(false);
  const [fashnCreditsError, setFashnCreditsError] = useState<string | null>(null);

  const [resendUsage, setResendUsage] = useState<AdminResendUsage | null>(null);
  const [resendUsageLoading, setResendUsageLoading] = useState(false);
  const [resendUsageError, setResendUsageError] = useState<string | null>(null);

  type ClientBillingHistoryPayload = {
    subscriptionStartedAt: string;
    nextResetAt: string;
    billingAnchorDay: number | null;
    topUps: {
      at: string;
      tryOnsAdded: number;
      amountPaidPence?: number;
      currency?: string;
    }[];
    resets: { at: string; previousTryOns: number; reason: "monthly_billing" | "admin_manual" }[];
  };

  const [expandedHistoryClientId, setExpandedHistoryClientId] = useState<string | null>(null);
  const [billingHistoryByClient, setBillingHistoryByClient] = useState<Record<string, ClientBillingHistoryPayload>>({});
  const [billingHistoryLoadingId, setBillingHistoryLoadingId] = useState<string | null>(null);
  const [billingHistoryErrorId, setBillingHistoryErrorId] = useState<string | null>(null);

  const [topUpsPurchases, setTopUpsPurchases] = useState<AdminTopUpPurchaseRow[]>([]);
  const [topUpsLoading, setTopUpsLoading] = useState(false);
  const [topUpsError, setTopUpsError] = useState<string | null>(null);

  type QuotaEmailPreviewPayload = {
    subject: string;
    body: string;
    html: string;
    from: string;
    upgradeUrl: string;
    sampleUsed: number;
    sampleLimit: number;
    previewStoreLabel: string;
    caption: string;
  };

  const [quotaPreviewOpen, setQuotaPreviewOpen] = useState(false);
  const [quotaPreviewClientId, setQuotaPreviewClientId] = useState("");
  const [quotaPreviewLoading, setQuotaPreviewLoading] = useState(false);
  const [quotaPreviewErr, setQuotaPreviewErr] = useState<string | null>(null);
  const [quotaPreviewData, setQuotaPreviewData] = useState<QuotaEmailPreviewPayload | null>(null);

  const remainingTotal = useMemo(() => {
    const used = keys.reduce((s, k) => s + totalTryOnsUsed(k), 0);
    const limit = keys.reduce((s, k) => s + k.usageLimit, 0);
    return { used, limit };
  }, [keys]);

  const tryOnBreakdownPct = useMemo(() => {
    if (!analytics || analytics.tryOnsTotal <= 0) return { retailer: 0, visitor: 0 };
    return {
      retailer: Math.round((analytics.tryOnsRetailer / analytics.tryOnsTotal) * 100),
      visitor: Math.round((analytics.tryOnsVisitor / analytics.tryOnsTotal) * 100),
    };
  }, [analytics]);

  const calcResult = useMemo(() => {
    const n = Number.parseInt(calcTryOnsInput.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const credits = n * 2;
    const fashnCost = n * FASHN_GBP_PER_TRYON;
    const recommendedPrice = n * RECOMMENDED_GBP_PER_TRYON;
    const profit = recommendedPrice - fashnCost;
    return { tryOns: n, credits, fashnCost, recommendedPrice, profit };
  }, [calcTryOnsInput]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/keys");
      const data = (await res.json()) as { keys?: KeyRecord[]; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to load keys.");
        return;
      }
      setKeys(data.keys || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBillingHistory(clientId: string) {
    setBillingHistoryLoadingId(clientId);
    setBillingHistoryErrorId(null);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(clientId)}/billing-history`);
      const data = (await res.json()) as ClientBillingHistoryPayload & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setBillingHistoryErrorId(clientId);
        return;
      }
      setBillingHistoryByClient((prev) => ({ ...prev, [clientId]: data }));
    } catch {
      setBillingHistoryErrorId(clientId);
    } finally {
      setBillingHistoryLoadingId(null);
    }
  }

  function toggleBillingHistory(clientId: string) {
    if (expandedHistoryClientId === clientId) {
      setExpandedHistoryClientId(null);
      return;
    }
    setExpandedHistoryClientId(clientId);
    if (!billingHistoryByClient[clientId]) {
      void loadBillingHistory(clientId);
    }
  }

  async function loadTopUps() {
    setTopUpsLoading(true);
    setTopUpsError(null);
    try {
      const res = await fetch("/api/admin/top-ups");
      const data = (await res.json()) as { purchases?: AdminTopUpPurchaseRow[]; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setTopUpsError(data.error || "Failed to load top-ups.");
        setTopUpsPurchases([]);
        return;
      }
      setTopUpsPurchases(Array.isArray(data.purchases) ? data.purchases : []);
    } catch (e) {
      setTopUpsError(e instanceof Error ? e.message : "Failed to load top-ups.");
      setTopUpsPurchases([]);
    } finally {
      setTopUpsLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      const data = (await res.json()) as AnalyticsSummary & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setAnalyticsError(data.error || "Failed to load analytics.");
        return;
      }
      setAnalytics({
        demoVisitsToday: data.demoVisitsToday,
        demoVisitsThisMonth: data.demoVisitsThisMonth,
        tryOnsTotal: data.tryOnsTotal,
        tryOnsRetailer: data.tryOnsRetailer,
        tryOnsVisitor: data.tryOnsVisitor,
        clients: Array.isArray(data.clients) ? data.clients : [],
        demoVisitors: Array.isArray(data.demoVisitors) ? data.demoVisitors : [],
      });
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadFashnCredits() {
    setFashnCreditsLoading(true);
    setFashnCreditsError(null);
    try {
      const res = await fetch("/api/admin/fashn-credits");
      const data = (await res.json()) as { credits?: AdminFashnCredits; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setFashnCredits(null);
        setFashnCreditsError(data.error || "Failed to load Fashn credit balance.");
        return;
      }
      if (data.credits) {
        setFashnCredits(data.credits);
      } else {
        setFashnCredits(null);
        setFashnCreditsError("Unexpected response from credits API.");
      }
    } catch (e) {
      setFashnCredits(null);
      setFashnCreditsError(e instanceof Error ? e.message : "Failed to load Fashn credit balance.");
    } finally {
      setFashnCreditsLoading(false);
    }
  }

  async function loadResendUsage() {
    setResendUsageLoading(true);
    setResendUsageError(null);
    try {
      const res = await fetch("/api/admin/resend-usage");
      const data = (await res.json()) as Partial<AdminResendUsage> & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setResendUsageError(data.error || "Failed to load Resend email usage.");
        if (
          typeof data.dailyLimit === "number" &&
          typeof data.monthlyLimit === "number" &&
          Number.isFinite(data.dailyLimit) &&
          Number.isFinite(data.monthlyLimit)
        ) {
          setResendUsage({
            dailyUsed: typeof data.dailyUsed === "number" && Number.isFinite(data.dailyUsed) ? data.dailyUsed : null,
            monthlyUsed:
              typeof data.monthlyUsed === "number" && Number.isFinite(data.monthlyUsed) ? data.monthlyUsed : null,
            dailyLimit: data.dailyLimit,
            monthlyLimit: data.monthlyLimit,
          });
        } else {
          setResendUsage(null);
        }
        return;
      }
      if (
        typeof data.dailyLimit === "number" &&
        typeof data.monthlyLimit === "number" &&
        Number.isFinite(data.dailyLimit) &&
        Number.isFinite(data.monthlyLimit)
      ) {
        setResendUsage({
          dailyUsed: typeof data.dailyUsed === "number" && Number.isFinite(data.dailyUsed) ? data.dailyUsed : null,
          monthlyUsed:
            typeof data.monthlyUsed === "number" && Number.isFinite(data.monthlyUsed) ? data.monthlyUsed : null,
          dailyLimit: data.dailyLimit,
          monthlyLimit: data.monthlyLimit,
        });
      } else {
        setResendUsage(null);
        setResendUsageError("Unexpected response from Resend usage API.");
      }
    } catch (e) {
      setResendUsage(null);
      setResendUsageError(e instanceof Error ? e.message : "Failed to load Resend email usage.");
    } finally {
      setResendUsageLoading(false);
    }
  }

  async function loadRecovery() {
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await fetch("/api/admin/recovery");
      const data = (await res.json()) as { accounts?: RecoveryAccountRow[]; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setRecoveryError(data.error || "Failed to load recovery.");
        return;
      }
      setRecovery(Array.isArray(data.accounts) ? data.accounts : []);
    } catch (e) {
      setRecoveryError(e instanceof Error ? e.message : "Failed to load recovery.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function deleteRecoveryRecord(userId: string, label: string) {
    const ok = window.confirm(
      `Remove the recovery record for "${label}"? This deletes only the Redis snapshot shown in Recovery; it does not restore the retailer account.`,
    );
    if (!ok) return;

    setRecoveryDeletingUserId(userId);
    setRecoveryError(null);
    try {
      const res = await fetch(`/api/admin/recovery?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setRecoveryError(data.error || "Failed to remove recovery record.");
        return;
      }
      setRecovery((prev) => prev.filter((r) => r.userId !== userId));
    } catch (e) {
      setRecoveryError(e instanceof Error ? e.message : "Failed to remove recovery record.");
    } finally {
      setRecoveryDeletingUserId(null);
    }
  }

  async function loadQuotaPreview(forClientId?: string) {
    setQuotaPreviewLoading(true);
    setQuotaPreviewErr(null);
    try {
      const q = forClientId ? `?clientId=${encodeURIComponent(forClientId)}` : "";
      const res = await fetch(`/api/admin/try-on-quota-email-preview${q}`);
      const data = (await res.json()) as QuotaEmailPreviewPayload & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setQuotaPreviewData(null);
        setQuotaPreviewErr(data.error || "Could not load email preview.");
        return;
      }
      setQuotaPreviewData(data);
    } catch (e) {
      setQuotaPreviewData(null);
      setQuotaPreviewErr(e instanceof Error ? e.message : "Could not load email preview.");
    } finally {
      setQuotaPreviewLoading(false);
    }
  }

  function openQuotaEmailPreviewModal() {
    const defaultClientId = keys[0]?.id ?? "";
    setQuotaPreviewClientId(defaultClientId);
    setQuotaPreviewErr(null);
    setQuotaPreviewData(null);
    setQuotaPreviewOpen(true);
    void loadQuotaPreview(defaultClientId ? defaultClientId : undefined);
  }

  useEffect(() => {
    void load();
    void loadFashnCredits();
    void loadResendUsage();
  }, []);

  useEffect(() => {
    if (keys.length === 0) {
      setWearMeKeyId(null);
      return;
    }
    setWearMeKeyId((prev) => (prev && keys.some((k) => k.id === prev) ? prev : keys[0]!.id));
  }, [keys]);

  useEffect(() => {
    if (activeTab === "analytics") void loadAnalytics();
    if (activeTab === "recovery") void loadRecovery();
    if (activeTab === "topUps") void loadTopUps();
  }, [activeTab]);

  useEffect(() => {
    if (!quotaPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuotaPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quotaPreviewOpen]);

  useEffect(() => {
    if (!quotaPreviewOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [quotaPreviewOpen]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          contactEmail,
          fashnApiKey,
          usageLimit: Number(usageLimit),
        }),
      });
      const data = (await res.json()) as { key?: KeyRecord; error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to create key.");
        return;
      }
      if (data.key) {
        setKeys((prev) => [data.key!, ...prev]);
        setClientName("");
        setContactEmail("");
        setFashnApiKey("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key.");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    window.location.reload();
  }

  async function deleteKey(id: string) {
    const ok = window.confirm("Delete this API key? This cannot be undone.");
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to delete key.");
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete key.");
    }
  }

  async function resetKeyUsage(id: string) {
    const ok = window.confirm("Reset try-ons used to 0 for this client?");
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(id)}/reset`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: true; key?: KeyRecord; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to reset try-ons used.");
        return;
      }
      if (data.key && data.key.id === id) {
        setKeys((prev) => prev.map((k) => (k.id === id ? data.key! : k)));
      } else {
        setKeys((prev) =>
          prev.map((k) => {
            if (k.id !== id) return k;
            const next = { ...k, usageCount: 0, topUpUsageCount: 0 };
            delete next.usageSeventyFivePctEmailSentForLimit;
            delete next.usageNinetyNinePctEmailSentForLimit;
            return next;
          }),
        );
      }
      setBillingHistoryByClient((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset try-ons used.");
    }
  }

  async function copyWidgetCode(apiKey: string) {
    const origin = window.location.origin;
    const snippet = `<script async src=\"${origin}/widget.js\" data-fit-room-key=\"${apiKey}\"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  async function copyRawKey(apiKey: string) {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiKey;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function openEditModal(rec: KeyRecord) {
    setError(null);
    setEditing(rec);
    setEditClientName(rec.clientName);
    setEditContactEmail(rec.contactEmail?.trim() ?? "");
    setEditMonthlyPlanLimit(String(storedOrDerivedBasePlanLimit(rec)));
    setEditTopUpLimit(String(rec.topUpLimit ?? 0));
    setEditFashnApiKey("");
  }

  function closeEditModal() {
    setEditing(null);
    setEditClientName("");
    setEditContactEmail("");
    setEditFashnApiKey("");
    setEditMonthlyPlanLimit("");
    setEditTopUpLimit("");
    setSavingEdit(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editClientName,
          contactEmail: editContactEmail.trim(),
          ...(editFashnApiKey.trim() ? { fashnApiKey: editFashnApiKey.trim() } : null),
          monthlyPlanLimit: Number(editMonthlyPlanLimit),
          topUpLimit: Number(editTopUpLimit),
        }),
      });
      const data = (await res.json()) as { key?: KeyRecord; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to update key.");
        return;
      }
      if (data.key) {
        setKeys((prev) => prev.map((k) => (k.id === data.key!.id ? data.key! : k)));
      }
      closeEditModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update key.");
    } finally {
      setSavingEdit(false);
    }
  }

  function refreshCurrentTab() {
    void loadFashnCredits();
    void loadResendUsage();
    if (activeTab === "clients" || activeTab === "wearMe") void load();
    else if (activeTab === "analytics") void loadAnalytics();
    else if (activeTab === "topUps") void loadTopUps();
    else void loadRecovery();
  }

  const tabBusy =
    activeTab === "clients" || activeTab === "wearMe"
      ? loading
      : activeTab === "analytics"
        ? analyticsLoading
        : activeTab === "recovery"
          ? recoveryLoading
          : activeTab === "topUps"
            ? topUpsLoading
            : false;

  const wearMeKeyRecord = useMemo(
    () => keys.find((k) => k.id === wearMeKeyId) ?? null,
    [keys, wearMeKeyId],
  );

  return (
    <div className="min-h-dvh w-full bg-zinc-950 px-8 text-zinc-100">
      {creditCalcOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-calc-title"
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="credit-calc-title" className="text-base font-semibold text-zinc-100">
                  Credit Calculator
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Try-On Max uses 2 Fashn credits per try-on. Figures are illustrative GBP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreditCalcOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 tabular-nums">Try-ons</th>
                    <th className="px-4 py-3 tabular-nums">Credits</th>
                    <th className="px-4 py-3 tabular-nums">Fashn cost</th>
                    <th className="px-4 py-3 tabular-nums">Price</th>
                    <th className="px-4 py-3 tabular-nums">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_PLANS.map((row) => (
                    <tr key={row.name} className="border-b border-zinc-800/80 last:border-0">
                      <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">{row.tryOns}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">{row.credits}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">£{row.fashnCost}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">£{row.price}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-400/90">£{row.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
              <h3 className="text-sm font-semibold text-zinc-100">Custom package</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Recommended price uses the Starter plan rate (£149 ÷ 300 try-ons). Fashn cost scales linearly
                (£34 ÷ 300).
              </p>
              <label className="mt-4 block text-sm font-medium text-zinc-200">Number of try-ons</label>
              <input
                value={calcTryOnsInput}
                onChange={(e) => setCalcTryOnsInput(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 450"
                className="mt-2 block w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              {calcResult ? (
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Credits</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {calcResult.credits.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fashn cost (est.)</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {formatGbp(calcResult.fashnCost)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Recommended price (est.)
                    </dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {formatGbp(calcResult.recommendedPrice)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Profit (est.)</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-emerald-400/90">
                      {formatGbp(calcResult.profit)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Enter a positive whole number of try-ons.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setCreditCalcOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {quotaPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quota-email-preview-title"
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="quota-email-preview-title" className="text-base font-semibold text-zinc-100">
                  75% try-on usage reminder
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  HTML + plain text preview — no email is sent from this screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuotaPreviewOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label htmlFor="quota-preview-client" className="block text-sm font-medium text-zinc-200">
                Preview as
              </label>
              <select
                id="quota-preview-client"
                value={quotaPreviewClientId}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuotaPreviewClientId(v);
                  void loadQuotaPreview(v ? v : undefined);
                }}
                disabled={quotaPreviewLoading}
                className="mt-2 block w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Example store (sample numbers)</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.clientName}
                  </option>
                ))}
              </select>
            </div>

            {quotaPreviewErr ? (
              <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {quotaPreviewErr}
              </div>
            ) : null}

            {quotaPreviewLoading ? (
              <div className="mt-6 text-sm text-zinc-500">Loading preview…</div>
            ) : quotaPreviewData ? (
              <div className="mt-6 space-y-4">
                <p className="text-xs text-zinc-500">{quotaPreviewData.caption}</p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                  <div className="space-y-1 border-b border-zinc-800 pb-3 text-zinc-100">
                    <p>
                      <span className="text-zinc-500">From</span>{" "}
                      <span className="font-medium">{quotaPreviewData.from}</span>
                    </p>
                    <p>
                      <span className="text-zinc-500">Subject</span>{" "}
                      <span className="font-medium">{quotaPreviewData.subject}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Sample counts for this preview: {quotaPreviewData.sampleUsed} / {quotaPreviewData.sampleLimit}{" "}
                      try-ons ({quotaPreviewData.previewStoreLabel})
                    </p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">HTML</p>
                    <iframe
                      title="Quota email HTML preview"
                      className="mt-2 h-[min(420px,50dvh)] w-full rounded-lg border border-zinc-800 bg-white"
                      sandbox=""
                      srcDoc={quotaPreviewData.html}
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Plain text</p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 font-sans text-[13px] leading-relaxed text-zinc-200">
                      {quotaPreviewData.body}
                    </pre>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Upgrade link in this preview:{" "}
                  <span className="break-all font-mono text-zinc-400">{quotaPreviewData.upgradeUrl}</span>
                </p>
              </div>
            ) : !quotaPreviewErr ? (
              <div className="mt-6 text-sm text-zinc-500">No preview loaded.</div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setQuotaPreviewOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <AnalyticsInsightsModal
        open={analyticsInsightsOpen}
        onClose={() => setAnalyticsInsightsOpen(false)}
        fetchUrl="/api/admin/analytics/insights"
        theme="admin"
      />
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
        >
          <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl md:w-[720px]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="edit-title" className="text-base font-semibold text-zinc-100">
                  Edit client
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Update client name, contact email, monthly plan and top-up caps (usage counters are unchanged),
                  and optionally replace the Fashn.ai API key.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200">Client name</label>
                <input
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Contact email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Fashn.ai API key</label>
                <input
                  value={editFashnApiKey}
                  onChange={(e) => setEditFashnApiKey(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  For security, we never display the current key. Enter a new one only if you want to replace it.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Monthly plan try-on limit</label>
                <input
                  value={editMonthlyPlanLimit}
                  onChange={(e) => setEditMonthlyPlanLimit(e.target.value)}
                  inputMode="numeric"
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Top-up try-on limit</label>
                <input
                  value={editTopUpLimit}
                  onChange={(e) => setEditTopUpLimit(e.target.value)}
                  inputMode="numeric"
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Purchased add-on capacity this billing cycle. Total cap = monthly plan + top-up. Try-ons already
                  used in each bucket stay as-is.
                </p>
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={
                  savingEdit ||
                  editClientName.trim().length === 0 ||
                  !isValidContactEmail(editContactEmail) ||
                  Number(editMonthlyPlanLimit) < 1 ||
                  Number(editTopUpLimit) < 0 ||
                  !Number.isFinite(Number(editMonthlyPlanLimit)) ||
                  !Number.isFinite(Number(editTopUpLimit))
                }
                className="btn-accent-gradient flex-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Fit Room
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://app.fashn.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Visit Site
            </a>
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">
              Back to landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full py-8">
        <div className="w-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl">
                Admin
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Manage client keys and view platform analytics.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
              <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/20 px-4 py-3 shadow-sm sm:min-w-[220px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/75">
                  Fashn.ai API credits
                </p>
                {fashnCreditsLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">Loading balance…</p>
                ) : fashnCreditsError ? (
                  <p
                    className="mt-2 text-sm leading-snug text-amber-200/95"
                    title={fashnCreditsError}
                  >
                    {fashnCreditsError}
                  </p>
                ) : fashnCredits ? (
                  <>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-100">
                      {fashnCredits.total != null
                        ? fashnCredits.total.toLocaleString()
                        : "—"}
                      <span className="ml-1.5 text-sm font-medium text-cyan-200/70">total</span>
                    </p>
                    {(fashnCredits.subscription != null || fashnCredits.onDemand != null) && (
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        {fashnCredits.subscription != null ? (
                          <>
                            Subscription:{" "}
                            <span className="tabular-nums text-zinc-300">
                              {fashnCredits.subscription.toLocaleString()}
                            </span>
                          </>
                        ) : null}
                        {fashnCredits.subscription != null && fashnCredits.onDemand != null ? (
                          <span className="text-zinc-600"> · </span>
                        ) : null}
                        {fashnCredits.onDemand != null ? (
                          <>
                            On-demand:{" "}
                            <span className="tabular-nums text-zinc-300">
                              {fashnCredits.onDemand.toLocaleString()}
                            </span>
                          </>
                        ) : null}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No balance data.</p>
                )}
              </div>
              <div className="rounded-xl border border-rose-500/35 bg-rose-950/20 px-4 py-3 shadow-sm sm:min-w-[240px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-200/75">
                  Resend email usage
                </p>
                {resendUsageLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">Loading usage…</p>
                ) : resendUsageError && !resendUsage ? (
                  <p
                    className="mt-2 text-sm leading-snug text-amber-200/95"
                    title={resendUsageError}
                  >
                    {resendUsageError}
                  </p>
                ) : resendUsage ? (
                  <>
                    <p className="mt-2 text-sm leading-snug tabular-nums text-rose-50">
                      Emails sent today:{" "}
                      {resendUsage.dailyUsed != null
                        ? `${resendUsage.dailyUsed}/${resendUsage.dailyLimit}`
                        : `—/${resendUsage.dailyLimit}`}
                    </p>
                    <p className="mt-2 text-sm leading-snug tabular-nums text-rose-50">
                      Emails sent this month:{" "}
                      {resendUsage.monthlyUsed != null
                        ? `${resendUsage.monthlyUsed}/${resendUsage.monthlyLimit}`
                        : `—/${resendUsage.monthlyLimit}`}
                    </p>
                    {resendUsageError ? (
                      <p className="mt-2 text-xs leading-snug text-amber-200/90" title={resendUsageError}>
                        {resendUsageError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No usage data.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAnalyticsInsightsOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-violet-500/40 bg-violet-950/50 px-5 text-sm font-semibold text-violet-100 transition hover:border-violet-400/55 hover:bg-violet-900/40"
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => setCreditCalcOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                Credit Calculator
              </button>
              <button
                type="button"
                onClick={() => openQuotaEmailPreviewModal()}
                className="inline-flex h-11 items-center justify-center rounded-full border border-sky-500/40 bg-sky-950/50 px-5 text-sm font-semibold text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-900/40"
              >
                Preview email
              </button>
              <button
                type="button"
                onClick={refreshCurrentTab}
                disabled={tabBusy}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
            </div>
          </div>

          <section
            className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 md:px-6"
            aria-label="Quick links to external services"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Quick links</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ADMIN_QUICK_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-950/80 px-4 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>

          <div
            className="mt-6 inline-flex rounded-full border border-zinc-800 bg-zinc-900/80 p-1"
            role="tablist"
            aria-label="Admin sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "clients"}
              onClick={() => setActiveTab("clients")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "clients"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Clients
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "topUps"}
              onClick={() => setActiveTab("topUps")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "topUps"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Top Ups
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "analytics"}
              onClick={() => setActiveTab("analytics")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "analytics"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Analytics
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wearMe"}
              onClick={() => setActiveTab("wearMe")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "wearMe"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Wear Me
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "recovery"}
              onClick={() => setActiveTab("recovery")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "recovery"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Recovery
            </button>
          </div>

          {activeTab === "clients" ? (
            <>
              <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
                <h2 className="text-base font-semibold text-zinc-100">Create new client</h2>
                <p className="mt-1 text-sm text-zinc-400">Create a client API key with contact email and try-on limit.</p>

                <form onSubmit={createKey} className="mt-6 grid gap-4 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-zinc-200">Client name</label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Acme Storefront"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-zinc-200">Contact email</label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="billing@example.com"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-zinc-200">Fashn.ai API key</label>
                    <input
                      value={fashnApiKey}
                      onChange={(e) => setFashnApiKey(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="fa-…"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-200">Try-on limit</label>
                    <input
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      inputMode="numeric"
                      placeholder="1000"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-12">
                    <button
                      type="submit"
                      disabled={
                        creating ||
                        clientName.trim().length === 0 ||
                        !isValidContactEmail(contactEmail) ||
                        fashnApiKey.trim().length === 0 ||
                        Number(usageLimit) <= 0
                      }
                      className="btn-accent-gradient w-full disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    >
                      {creating ? "Creating…" : "Create API key"}
                    </button>
                  </div>
                </form>

                {error ? (
                  <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
              </section>

              <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-zinc-800 px-6 py-5 md:flex-row md:items-end md:justify-between md:px-8">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Clients</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {keys.length} clients · Try-ons used {remainingTotal.used} / {remainingTotal.limit} try-on limit
                      (summed across clients).
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">Loading…</div>
                ) : keys.length === 0 ? (
                  <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">No clients yet.</div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <div className="grid min-w-[72rem] w-full grid-cols-[minmax(0,1.2fr)_minmax(0,0.62fr)_minmax(0,0.72fr)_minmax(0,0.72fr)_minmax(0,1.35fr)_minmax(0,0.58fr)_minmax(0,0.52fr)_minmax(0,0.62fr)_minmax(0,0.5fr)_minmax(0,0.52fr)_minmax(0,0.62fr)] gap-2 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 md:px-6">
                      <div>Client Name</div>
                      <div>API Key</div>
                      <div title="Key record created (UTC)">Created</div>
                      <div title="Next scheduled monthly usage reset (UTC)">Next Reset</div>
                      <div title="Subscription plan vs purchased top-up usage">Plan / Top Up</div>
                      <div>Status</div>
                      <div className="text-center">EDIT</div>
                      <div className="text-center">COPY</div>
                      <div className="text-center">COPY KEY</div>
                      <div className="text-center">RESET</div>
                      <div className="text-center">DELETE</div>
                    </div>

                    {keys.map((k) => {
                      const basePlanLimit = storedOrDerivedBasePlanLimit(k);
                      const planUsed = k.usageCount;
                      const topLim = k.topUpLimit ?? 0;
                      const topUsed = k.topUpUsageCount ?? 0;
                      const planPct =
                        basePlanLimit > 0 ? Math.min(100, Math.round((planUsed / basePlanLimit) * 100)) : 0;
                      const topPct =
                        topLim > 0 ? Math.min(100, Math.round((topUsed / topLim) * 100)) : 0;
                      const blocked = k.usageLimit > 0 && clientTryOnFullyBlocked(k);
                      const historyOpen = expandedHistoryClientId === k.id;
                      const bh = billingHistoryByClient[k.id];

                      return (
                        <div key={k.id}>
                          <div className="grid min-w-[72rem] w-full grid-cols-[minmax(0,1.2fr)_minmax(0,0.62fr)_minmax(0,0.72fr)_minmax(0,0.72fr)_minmax(0,1.35fr)_minmax(0,0.58fr)_minmax(0,0.52fr)_minmax(0,0.62fr)_minmax(0,0.5fr)_minmax(0,0.52fr)_minmax(0,0.62fr)] items-center gap-2 border-b border-zinc-800 px-4 py-4 text-base md:px-6">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-semibold text-zinc-100">{k.clientName}</div>
                                  {k.contactEmail ? (
                                    <div
                                      className="mt-0.5 truncate text-sm text-sky-400/90"
                                      title={k.contactEmail}
                                    >
                                      {k.contactEmail}
                                    </div>
                                  ) : null}
                                </div>
                                <QuotaEmailNoticeBadges k={k} />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleBillingHistory(k.id)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/90 bg-zinc-950/60 px-2.5 py-1 text-xs font-semibold text-[#d4bc94] transition hover:border-[#c6a77d]/50 hover:bg-zinc-900 hover:text-[#e8dcc8]"
                                aria-expanded={historyOpen}
                              >
                                <ChevronDown
                                  className={`h-3.5 w-3.5 shrink-0 transition ${historyOpen ? "rotate-180" : ""}`}
                                  aria-hidden
                                />
                                Billing history
                              </button>
                            </div>
                            <div>
                              <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-300">
                                {(k.key || "").slice(0, 8)}…
                              </span>
                            </div>
                            <div
                              className="text-sm tabular-nums text-zinc-300"
                              title={
                                Number.isFinite(Date.parse(k.createdAt)) ? `${k.createdAt} (UTC date shown)` : undefined
                              }
                            >
                              {formatKeyCreatedUtc(k.createdAt)}
                            </div>
                            <div className="text-sm tabular-nums text-zinc-300" title="Monthly auto reset schedule (UTC)">
                              {formatNextResetUtc(k)}
                            </div>
                            <div className="flex min-w-0 flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <div className="h-2 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]"
                                    style={{ width: `${planPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold tabular-nums text-zinc-500">{planPct}%</span>
                                <span className="text-sm font-semibold tabular-nums text-zinc-300">
                                  Plan: {planUsed}/{basePlanLimit}
                                </span>
                              </div>
                              {topLim > 0 ? (
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <div className="h-2 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#ec4899]"
                                      style={{ width: `${topPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold tabular-nums text-zinc-500">{topPct}%</span>
                                  <span className="text-sm font-semibold tabular-nums text-zinc-400">
                                    Top Up: {topUsed}/{topLim}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${
                                  blocked
                                    ? "border-amber-800/80 bg-amber-950/50 text-amber-200"
                                    : "border-emerald-800/80 bg-emerald-950/50 text-emerald-200"
                                }`}
                              >
                                {blocked ? "Blocked" : "Active"}
                              </span>
                            </div>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => openEditModal(k)}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                                aria-label="Edit"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => void copyWidgetCode(k.key)}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                                aria-label="Copy code"
                              >
                                Copy
                              </button>
                            </div>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => void copyRawKey(k.key)}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                                aria-label="Copy key"
                              >
                                Copy Key
                              </button>
                            </div>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => void resetKeyUsage(k.id)}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                                aria-label="Reset try-ons used"
                              >
                                Reset
                              </button>
                            </div>
                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => void deleteKey(k.id)}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40 px-3 text-sm font-semibold text-red-200 transition hover:border-red-800 hover:bg-red-950/70"
                                aria-label="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {historyOpen ? (
                            <div className="min-w-[72rem] w-full border-b border-zinc-800 bg-zinc-950/55 px-4 py-5 md:px-6">
                              {billingHistoryLoadingId === k.id ? (
                                <p className="text-sm text-zinc-400">Loading billing history…</p>
                              ) : billingHistoryErrorId === k.id ? (
                                <p className="text-sm text-red-300">Could not load billing history.</p>
                              ) : bh ? (
                                <div className="grid gap-8 lg:grid-cols-3">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                      Subscription &amp; billing cycle
                                    </h4>
                                    <dl className="mt-3 space-y-2 text-sm text-zinc-200">
                                      <div>
                                        <dt className="text-zinc-500">Subscription started (UTC)</dt>
                                        <dd className="mt-0.5 tabular-nums">{formatIsoDateUtc(bh.subscriptionStartedAt)}</dd>
                                      </div>
                                      <div>
                                        <dt className="text-zinc-500">Next usage reset (UTC)</dt>
                                        <dd className="mt-0.5 tabular-nums">{formatIsoDateUtc(bh.nextResetAt)}</dd>
                                      </div>
                                      {typeof bh.billingAnchorDay === "number" ? (
                                        <div>
                                          <dt className="text-zinc-500">Billing anchor day</dt>
                                          <dd className="mt-0.5 tabular-nums">{bh.billingAnchorDay}</dd>
                                        </div>
                                      ) : null}
                                    </dl>
                                  </div>
                                  <div className="lg:col-span-1">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                      Top-up purchases
                                    </h4>
                                    {bh.topUps.length === 0 ? (
                                      <p className="mt-3 text-sm text-zinc-500">No top-ups recorded yet.</p>
                                    ) : (
                                      <ul className="mt-3 max-h-52 list-none space-y-2 overflow-y-auto text-sm">
                                        {bh.topUps.map((row, idx) => (
                                          <li
                                            key={`${row.at}-${idx}`}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
                                          >
                                            <span className="tabular-nums text-zinc-400">{formatIsoDateUtc(row.at)}</span>
                                            <span className="font-semibold tabular-nums text-emerald-200/95">
                                              +{row.tryOnsAdded} try-ons
                                            </span>
                                            <span className="w-full text-xs text-zinc-500 sm:w-auto sm:text-right">
                                              {formatMinorCurrency(
                                                typeof row.amountPaidPence === "number" ? row.amountPaidPence : null,
                                                row.currency ?? "gbp",
                                              )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <div className="lg:col-span-1">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                      Past usage resets
                                    </h4>
                                    <p className="mt-1 text-xs text-zinc-600">
                                      Monthly resets zero try-ons used; admin resets clear usage without changing the
                                      limit.
                                    </p>
                                    {bh.resets.length === 0 ? (
                                      <p className="mt-3 text-sm text-zinc-500">No resets recorded yet.</p>
                                    ) : (
                                      <ul className="mt-3 max-h-52 list-none space-y-2 overflow-y-auto text-sm">
                                        {bh.resets.map((row, idx) => (
                                          <li
                                            key={`${row.at}-${row.reason}-${idx}`}
                                            className="flex flex-col gap-0.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
                                          >
                                            <div className="flex justify-between gap-2">
                                              <span className="tabular-nums text-zinc-400">{formatIsoDateUtc(row.at)}</span>
                                              <span className="shrink-0 text-xs font-medium text-zinc-500">
                                                {billingResetReasonLabel(row.reason)}
                                              </span>
                                            </div>
                                            <span className="text-xs text-zinc-300">
                                              Try-ons cleared:{" "}
                                              <strong className="font-semibold tabular-nums text-zinc-100">
                                                {row.previousTryOns}
                                              </strong>
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-500">Loading…</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-4 border-t border-zinc-800 px-6 py-5 md:px-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Quota email badges
                    </p>
                    <ul className="mt-3 list-none space-y-2.5 text-xs leading-relaxed text-zinc-400">
                      <li className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${QUOTA_EMAIL_NOTICE_BADGE_BASE} border-amber-700/70 bg-amber-950/50 text-amber-200`}
                          aria-hidden
                        >
                          75%
                        </span>
                        <span>
                          Yellow <strong className="font-medium text-zinc-300">75%</strong> badge: the first usage
                          warning email was sent when they crossed 75% of their limit.
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${QUOTA_EMAIL_NOTICE_BADGE_BASE} border-rose-800/70 bg-rose-950/45 text-rose-200`}
                          aria-hidden
                        >
                          99%
                        </span>
                        <span>
                          Red <strong className="font-medium text-zinc-300">99%</strong> badge: the near-limit warning
                          email was sent when they reached 99% of their limit.
                        </span>
                      </li>
                      <li className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1" aria-hidden>
                          <span
                            className={`${QUOTA_EMAIL_NOTICE_BADGE_BASE} border-zinc-700/70 bg-zinc-950/30 text-zinc-500`}
                          >
                            75%
                          </span>
                          <span
                            className={`${QUOTA_EMAIL_NOTICE_BADGE_BASE} border-zinc-700/70 bg-zinc-950/30 text-zinc-500`}
                          >
                            99%
                          </span>
                        </span>
                        <span>
                          Dim grey badges: that notice has{' '}
                          <strong className="font-medium text-zinc-300">not</strong> been sent yet for the current
                          cycle (or the try-on limit changed after a send). Resetting try-ons used clears both email
                          flags for a fresh cycle.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Stored in Redis under <span className="font-mono text-zinc-400">fit-room:clientKeys:*</span>.
                  </p>
                </div>
              </section>
            </>
          ) : activeTab === "topUps" ? (
            <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
              <h2 className="text-base font-semibold text-zinc-100">Top-up purchases</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Stripe checkouts that added try-ons. Monthly billing reset clears purchased add-ons for clients with a
                stored plan baseline; combined usage (
                <span className="font-medium text-zinc-300">usageCount</span> vs{" "}
                <span className="font-medium text-zinc-300">usageLimit</span>) blocks try-ons at the cap.
              </p>
              {topUpsError ? (
                <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {topUpsError}
                </div>
              ) : null}
              {topUpsLoading ? (
                <div className="mt-8 text-sm text-zinc-500">Loading top-ups…</div>
              ) : topUpsPurchases.length === 0 ? (
                <div className="mt-8 text-sm text-zinc-500">No top-up purchases recorded yet.</div>
              ) : (
                <div className="mt-6 w-full overflow-x-auto">
                  <div className="min-w-[56rem]">
                    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_minmax(0,0.65fr)] gap-3 border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <div>Store</div>
                      <div>Client name</div>
                      <div>Purchased (UTC)</div>
                      <div className="tabular-nums">Try-ons</div>
                      <div className="tabular-nums">Paid</div>
                    </div>
                    {topUpsPurchases.map((row, idx) => (
                      <div
                        key={`${row.clientId}-${row.stripeCheckoutSessionId ?? row.purchasedAt}-${idx}`}
                        className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_minmax(0,0.65fr)] items-center gap-3 border-b border-zinc-800 px-3 py-3 text-sm text-zinc-200"
                      >
                        <div className="min-w-0 font-medium text-zinc-100">{row.storeName}</div>
                        <div className="min-w-0 truncate text-zinc-400" title={row.clientName}>
                          {row.clientName}
                        </div>
                        <div className="tabular-nums text-zinc-400">
                          {Number.isFinite(Date.parse(row.purchasedAt))
                            ? new Date(row.purchasedAt).toLocaleString("en-GB", {
                                timeZone: "UTC",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </div>
                        <div className="font-semibold tabular-nums text-emerald-200/90">+{row.tryOnsAdded}</div>
                        <div className="tabular-nums text-zinc-300">
                          {formatMinorCurrency(row.amountPaidPence, row.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : activeTab === "wearMe" ? (
            <section className="mt-8 w-full overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
              <h2 className="text-base font-semibold text-zinc-100">Wear Me</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Quick try-on test using the selected client&apos;s API key (counts against their quota).
              </p>

              {loading ? (
                <div className="mt-8 text-sm text-zinc-500">Loading clients…</div>
              ) : keys.length === 0 ? (
                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
                  Create a client API key on the Clients tab first, then return here to test try-on against that
                  key.
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="max-w-xl">
                    <label htmlFor="admin-wearme-key" className="block text-sm font-medium text-zinc-200">
                      Client for this session
                    </label>
                    <select
                      id="admin-wearme-key"
                      value={wearMeKeyId ?? ""}
                      onChange={(e) => setWearMeKeyId(e.target.value || null)}
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                    >
                      {keys.map((k) => {
                        const basePlanLimit = storedOrDerivedBasePlanLimit(k);
                        const tl = k.topUpLimit ?? 0;
                        const tu = k.topUpUsageCount ?? 0;
                        const label =
                          tl > 0
                            ? `${k.clientName} · Plan ${k.usageCount}/${basePlanLimit}, Top Up ${tu}/${tl}`
                            : `${k.clientName} · Plan ${k.usageCount}/${basePlanLimit}`;
                        return (
                          <option key={k.id} value={k.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {wearMeKeyRecord ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Requests use header{" "}
                        <span className="font-mono text-zinc-400">x-api-key</span> for this client&apos;s
                        Fit Room key (prefix{" "}
                        <span className="font-mono text-zinc-400">
                          {(wearMeKeyRecord.key || "").slice(0, 8)}…
                        </span>
                        ).
                      </p>
                    ) : null}
                  </div>
                  {wearMeKeyRecord ? (
                    <AdminWearMeClient key={wearMeKeyRecord.id} apiKey={wearMeKeyRecord.key} />
                  ) : null}
                </div>
              )}
            </section>
          ) : activeTab === "recovery" ? (
            <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
              <h2 className="text-base font-semibold text-zinc-100">Recovery</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Soft-deleted retailer accounts. Use this list to inspect remaining try-ons and when the deletion happened.
              </p>

              {recoveryError ? (
                <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {recoveryError}
                </div>
              ) : null}

              {recoveryLoading ? (
                <div className="mt-8 text-sm text-zinc-500">Loading…</div>
              ) : recovery.length === 0 ? (
                <div className="mt-8 text-sm text-zinc-500">No deleted accounts.</div>
              ) : (
                <div className="mt-6 w-full overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-3 border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <div>Account</div>
                      <div>Try-ons remaining</div>
                      <div>Client id</div>
                      <div>Deleted</div>
                      <div className="text-right">Actions</div>
                    </div>
                    {recovery.map((r) => {
                      const remainingLabel =
                        typeof r.remainingTryOns === "number" && typeof r.usageLimit === "number" && typeof r.usageCount === "number"
                          ? `${r.remainingTryOns} (${r.usageCount}/${r.usageLimit} used)`
                          : "—";
                      const rowLabel = r.storeName || r.companyName || r.email || r.userId;
                      const rowBusy = recoveryDeletingUserId === r.userId;
                      return (
                        <div
                          key={r.userId}
                          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] items-center gap-3 border-b border-zinc-800 px-3 py-3 text-sm text-zinc-200"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-zinc-100">{r.storeName || r.companyName || "—"}</div>
                            <div className="truncate text-xs text-zinc-500">{r.email}</div>
                          </div>
                          <div className="text-sm text-zinc-200">{remainingLabel}</div>
                          <div className="font-mono text-xs text-zinc-400">{r.clientId ?? "—"}</div>
                          <div className="text-xs text-zinc-500">{new Date(r.deletedAt).toLocaleString()}</div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={rowBusy || recoveryDeletingUserId !== null}
                              onClick={() => void deleteRecoveryRecord(r.userId, rowLabel)}
                              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40 px-3 text-sm font-semibold text-red-200 transition hover:border-red-800 hover:bg-red-950/70 disabled:pointer-events-none disabled:opacity-50"
                              aria-label={`Remove recovery record for ${rowLabel}`}
                            >
                              {rowBusy ? "…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="mt-8 w-full space-y-6">
              {analyticsError ? (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {analyticsError}
                </div>
              ) : null}

              {analyticsLoading && !analytics ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-sm text-zinc-500">
                  Loading analytics…
                </div>
              ) : analytics ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Demo visits (today)
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.demoVisitsToday.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">UTC day · /demo page loads</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Demo visits (this month)
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.demoVisitsThisMonth.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">UTC calendar month</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Try-ons completed
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.tryOnsTotal.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Successful Fashn runs (all time)</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
                    <h2 className="text-base font-semibold text-zinc-100">Retailer vs demo / visitor</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Split by whether the request included a client API key (embedded widget) or used the demo
                      fallback path.
                    </p>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-300">Retailer (API key in request)</span>
                          <span className="tabular-nums text-sm text-zinc-500">
                            {analytics.tryOnsRetailer.toLocaleString()} ({tryOnBreakdownPct.retailer}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                            style={{
                              width:
                                analytics.tryOnsTotal > 0
                                  ? `${(analytics.tryOnsRetailer / analytics.tryOnsTotal) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-300">Demo / visitor (no key)</span>
                          <span className="tabular-nums text-sm text-zinc-500">
                            {analytics.tryOnsVisitor.toLocaleString()} ({tryOnBreakdownPct.visitor}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                            style={{
                              width:
                                analytics.tryOnsTotal > 0
                                  ? `${(analytics.tryOnsVisitor / analytics.tryOnsTotal) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 overflow-hidden">
                    <div className="border-b border-zinc-800 px-6 py-5 md:px-8">
                      <h2 className="text-base font-semibold text-zinc-100">Clients (widget + API key)</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        Visits = widget load beacons; try-ons = completed Fashn runs with this client&apos;s key in
                        the request. Names are from your client list.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            <th className="px-6 py-3 md:px-8">Client</th>
                            <th className="px-4 py-3 tabular-nums">Visits</th>
                            <th className="px-4 py-3 tabular-nums">Try-ons</th>
                            <th className="px-6 py-3 md:px-8">Last active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.clients.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-zinc-500 md:px-8">
                                No clients in the database.
                              </td>
                            </tr>
                          ) : (
                            analytics.clients.map((row) => (
                              <tr key={row.clientId} className="border-b border-zinc-800/80 last:border-0">
                                <td className="px-6 py-4 font-medium text-zinc-100 md:px-8">{row.clientName}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.visits.toLocaleString()}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.tryOns.toLocaleString()}</td>
                                <td className="px-6 py-4 text-zinc-400 md:px-8">
                                  {row.lastActive
                                    ? new Date(row.lastActive).toLocaleString(undefined, {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 overflow-hidden">
                    <div className="border-b border-zinc-800 px-6 py-5 md:px-8">
                      <h2 className="text-base font-semibold text-zinc-100">Demo visitors</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        /demo page loads and try-ons without a client API key. Session cookie when available; otherwise
                        IP only. Up to 250 most recently active rows.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            <th className="px-6 py-3 md:px-8">Visitor</th>
                            <th className="px-4 py-3">Session / IP</th>
                            <th className="px-4 py-3 tabular-nums">Visits</th>
                            <th className="px-4 py-3 tabular-nums">Try-ons</th>
                            <th className="px-6 py-3 md:px-8">Last active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.demoVisitors.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-zinc-500 md:px-8">
                                No demo visitor activity recorded yet.
                              </td>
                            </tr>
                          ) : (
                            analytics.demoVisitors.map((row, i) => (
                              <tr
                                key={`${row.label}-${row.lastIp}-${i}`}
                                className="border-b border-zinc-800/80 last:border-0"
                              >
                                <td className="max-w-[220px] px-6 py-4 text-zinc-200 md:px-8">
                                  <span className="line-clamp-2" title={row.label}>
                                    {row.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                                  {row.sessionId ? (
                                    <span title={row.sessionId}>{row.sessionId.slice(0, 12)}…</span>
                                  ) : (
                                    <span title={row.lastIp}>{row.lastIp}</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.visits.toLocaleString()}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.tryOns.toLocaleString()}</td>
                                <td className="px-6 py-4 text-zinc-400 md:px-8">
                                  {row.lastActive
                                    ? new Date(row.lastActive).toLocaleString(undefined, {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
