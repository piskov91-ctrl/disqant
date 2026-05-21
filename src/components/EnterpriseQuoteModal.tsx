"use client";

import { useCallback, useEffect, useId, useState } from "react";

const MONTHLY_VISITORS = [
  { value: "under-10k", label: "Under 10k" },
  { value: "10k-50k", label: "10k–50k" },
  { value: "50k-100k", label: "50k–100k" },
  { value: "100k-500k", label: "100k–500k" },
  { value: "500k-plus", label: "500k+" },
] as const;

const PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "wordpress", label: "WordPress" },
  { value: "wix", label: "Wix" },
  { value: "squarespace", label: "Squarespace" },
  { value: "other", label: "Other" },
] as const;

type EnterpriseQuoteModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EnterpriseQuoteModal({ open, onClose }: EnterpriseQuoteModalProps) {
  const titleId = useId();
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [monthlyVisitors, setMonthlyVisitors] = useState<(typeof MONTHLY_VISITORS)[number]["value"]>("under-10k");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["value"]>("shopify");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStoreName("");
    setEmail("");
    setWebsiteUrl("");
    setMonthlyVisitors("under-10k");
    setPlatform("shopify");
    setSubmitting(false);
    setError(null);
    setSuccessMessage(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, reset]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/enterprise-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          email: email.trim(),
          websiteUrl: websiteUrl.trim(),
          monthlyVisitors,
          platform,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccessMessage(
        data.message ??
          "Thanks — we will be in touch within 24 hours with a tailored quote for your store.",
      );
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-[101] w-full max-w-md rounded-2xl border border-[#C6A77D]/25 bg-[#1f1b17] p-6 shadow-2xl shadow-black/50 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600/80 bg-zinc-900/80 text-[#F5EDE4] transition hover:border-[#C6A77D]/40 hover:bg-zinc-800"
          aria-label="Close dialog"
        >
          ✕
        </button>

        {successMessage ? (
          <div className="pr-8 pt-1">
            <p
              id={titleId}
              className="text-lg font-semibold leading-snug text-[#F5EDE4]"
              role="status"
            >
              {successMessage}
            </p>
            <button
              type="button"
              className="btn-accent-gradient mt-8 w-full"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 id={titleId} className="pr-8 text-xl font-semibold tracking-tight text-[#F5EDE4]">
              Enterprise quote
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#F5EDE4]/65">
              Tell us about your store — we’ll put together pricing that fits.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="eq-store" className="block text-sm font-medium text-[#F5EDE4]/85">
                  Store name
                </label>
                <input
                  id="eq-store"
                  name="storeName"
                  required
                  autoComplete="organization"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#C6A77D]/20 bg-[#14110e] px-4 py-3 text-sm text-[#F5EDE4] outline-none ring-0 transition placeholder:text-zinc-600 focus:border-[#C6A77D]/50"
                  placeholder="Your store name"
                />
              </div>

              <div>
                <label htmlFor="eq-email" className="block text-sm font-medium text-[#F5EDE4]/85">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="eq-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#C6A77D]/20 bg-[#14110e] px-4 py-3 text-sm text-[#F5EDE4] outline-none transition placeholder:text-zinc-600 focus:border-[#C6A77D]/50"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label htmlFor="eq-url" className="block text-sm font-medium text-[#F5EDE4]/85">
                  Website URL
                </label>
                <input
                  id="eq-url"
                  name="websiteUrl"
                  required
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#C6A77D]/20 bg-[#14110e] px-4 py-3 text-sm text-[#F5EDE4] outline-none transition placeholder:text-zinc-600 focus:border-[#C6A77D]/50"
                  placeholder="https://yourstore.com"
                />
              </div>

              <div>
                <label htmlFor="eq-visitors" className="block text-sm font-medium text-[#F5EDE4]/85">
                  Monthly website visitors
                </label>
                <select
                  id="eq-visitors"
                  name="monthlyVisitors"
                  required
                  value={monthlyVisitors}
                  onChange={(e) =>
                    setMonthlyVisitors(e.target.value as (typeof MONTHLY_VISITORS)[number]["value"])
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#C6A77D]/20 bg-[#14110e] px-4 py-3 text-sm text-[#F5EDE4] outline-none focus:border-[#C6A77D]/50"
                >
                  {MONTHLY_VISITORS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#14110e]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="eq-platform" className="block text-sm font-medium text-[#F5EDE4]/85">
                  What platform is your store on?
                </label>
                <select
                  id="eq-platform"
                  name="platform"
                  required
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number]["value"])}
                  className="mt-1.5 w-full rounded-xl border border-[#C6A77D]/20 bg-[#14110e] px-4 py-3 text-sm text-[#F5EDE4] outline-none focus:border-[#C6A77D]/50"
                >
                  {PLATFORMS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#14110e]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="btn-accent-gradient w-full disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? "Sending…" : "Request my quote"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function EnterpriseQuoteButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Request a quote
      </button>
      <EnterpriseQuoteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
