"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const labelClass = "block text-sm font-medium text-zinc-100";
const fieldClass =
  "mt-2 block w-full rounded-xl border border-white/15 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-accent/60 disabled:opacity-60";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const bodyPayload = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; inquiryId?: string; id?: string | null };
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
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
        className="rounded-2xl border border-emerald-500/25 bg-emerald-950/50 px-6 py-8 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-emerald-100">Message sent</p>
        <p className="mt-2 text-sm text-emerald-200/90">
          Thanks — we&apos;ll get back to you as soon as we can.
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-emerald-200 underline decoration-emerald-500/50 underline-offset-2 hover:decoration-emerald-400"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Name <span className="text-red-400">*</span>
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
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className={labelClass}>
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
            className={`${fieldClass} resize-y`}
            placeholder="Tell us what you’re looking for — general questions, support, partnerships, anything else…"
          />
        </div>

        {error && (
          <div
            className="rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
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
    </div>
  );
}
