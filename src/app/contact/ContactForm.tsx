"use client";

import { useState } from "react";

const VISITORS = [
  { value: "", label: "Select range…" },
  { value: "under-10k", label: "Under 10k" },
  { value: "10k-50k", label: "10k – 50k" },
  { value: "50k-100k", label: "50k – 100k" },
  { value: "100k-plus", label: "100k+" },
] as const;

type Status = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [monthlyVisitors, setMonthlyVisitors] = useState<string>("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          websiteUrl: websiteUrl.trim(),
          monthlyVisitors,
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setName("");
      setCompany("");
      setWebsiteUrl("");
      setMonthlyVisitors("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setStatus("error");
    }
  }

  const disabled = status === "loading";

  if (status === "success") {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-emerald-900">Message sent</p>
        <p className="mt-2 text-sm text-emerald-800">
          Thanks — we&apos;ll get back to you as soon as we can.
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-emerald-900 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-500"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-zinc-900">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium text-zinc-900">
          Company name <span className="text-red-600">*</span>
        </label>
        <input
          id="contact-company"
          name="company"
          type="text"
          autoComplete="organization"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
        />
      </div>

      <div>
        <label htmlFor="contact-website" className="block text-sm font-medium text-zinc-900">
          Website URL
        </label>
        <input
          id="contact-website"
          name="websiteUrl"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://yoursite.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-accent/60"
        />
        <p className="mt-1.5 text-xs text-zinc-500">Optional — helps us understand your store.</p>
      </div>

      <div>
        <label htmlFor="contact-visitors" className="block text-sm font-medium text-zinc-900">
          Monthly visitors <span className="text-red-600">*</span>
        </label>
        <select
          id="contact-visitors"
          name="monthlyVisitors"
          required
          value={monthlyVisitors}
          onChange={(e) => setMonthlyVisitors(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full appearance-none rounded-xl border border-surface-border bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-3 pr-10 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
        >
          {VISITORS.map((opt) => (
            <option key={opt.value || "empty"} value={opt.value} disabled={opt.value === ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-900">
          Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          className="mt-2 block w-full resize-y rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
          placeholder="Tell us what you’re looking to achieve…"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={disabled}
          className="btn-accent-gradient w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {disabled ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
