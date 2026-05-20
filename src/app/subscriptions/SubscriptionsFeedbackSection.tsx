"use client";

import { Star } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { Stars } from "@/components/TestimonialsSlideshow";

const GOLD = "#c6a77d";

const SUCCESS_PREVIEW_MS = 60_000;

type SubmissionPreview = {
  storeName: string;
  rating: number;
  message: string;
};

export function SubscriptionsFeedbackSection() {
  const formId = useId();
  const [storeName, setStoreName] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionPreview, setSubmissionPreview] = useState<SubmissionPreview | null>(null);

  useEffect(() => {
    if (!submissionPreview) return;
    const id = window.setTimeout(() => {
      setSubmissionPreview(null);
      setStatus("idle");
    }, SUCCESS_PREVIEW_MS);
    return () => window.clearTimeout(id);
  }, [submissionPreview]);

  const submit = useCallback(async () => {
    const storeTrim = storeName.trim();
    if (storeTrim.length < 2) {
      setErrorMsg("Please enter your store name.");
      setStatus("error");
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMsg("Tap a star to rate from 1 to 5.");
      setStatus("error");
      return;
    }
    const trimmed = message.trim();
    if (!trimmed.length) {
      setErrorMsg("Please add a few words about your experience.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/subscriptions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: storeTrim, rating, message: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setSubmissionPreview({
        storeName: storeTrim,
        rating,
        message: trimmed,
      });
      setStatus("success");
      setMessage("");
      setRating(0);
      setStoreName("");
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }, [storeName, rating, message]);

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className="border-t border-[#c6a77d]/20 bg-black/55 py-14 backdrop-blur-sm md:py-20"
    >
      <div className="mx-auto max-w-3xl px-6">
        <h2
          id={`${formId}-heading`}
          className="text-center text-xl font-semibold tracking-tight text-[#f5efe6] md:text-2xl"
        >
          How was your experience?
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-500">
          Quick rating and a short note helps us improve Subscriptions and Wear Me for your store.
        </p>

        <div className="mt-10 rounded-2xl border border-[#c6a77d]/28 bg-[#0f0f10]/95 p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] md:p-8">
          <div>
            <label
              htmlFor={`${formId}-store`}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/90"
            >
              Store name
            </label>
            <input
              id={`${formId}-store`}
              name="storeName"
              type="text"
              autoComplete="organization"
              value={storeName}
              disabled={status === "sending"}
              placeholder="Your shop name as it should appear on reviews"
              className="mt-2 block w-full rounded-xl border border-[#c6a77d]/25 bg-black/55 px-4 py-3 text-sm text-[#f0ebe3] placeholder:text-zinc-600 focus:border-[#c6a77d]/55 focus:outline-none focus:ring-1 focus:ring-[#c6a77d]/35 disabled:opacity-55"
              onChange={(e) => {
                setStoreName(e.target.value);
                if (status === "error") setStatus("idle");
              }}
            />
          </div>

          <fieldset className="border-0 p-0">
            <legend className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/90">
              Your rating
            </legend>
            <div className="flex flex-col items-center gap-3">
              <p className="sr-only" aria-live="polite">
                {rating > 0 ? `Rating ${rating} out of 5 stars.` : ""}
              </p>
              <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => {
                const filled = rating >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Rate ${value} out of 5 stars`}
                    onClick={() => {
                      setRating(value);
                      if (status === "error") setStatus("idle");
                      setErrorMsg(null);
                    }}
                    className="rounded-lg p-1 transition hover:scale-110 hover:bg-[#c6a77d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
                  >
                    <Star
                      className="h-9 w-9 md:h-10 md:w-10"
                      strokeWidth={1.4}
                      style={{ color: GOLD }}
                      fill={filled ? GOLD : "transparent"}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
            </div>
          </fieldset>

          <div className="mt-8">
            <label htmlFor={`${formId}-message`} className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/90">
              Tell us about your experience
            </label>
            <textarea
              id={`${formId}-message`}
              name="message"
              rows={4}
              value={message}
              disabled={status === "sending"}
              placeholder={"What\u2019s working well—or what we\u2019d make better\u2026"}
              className="mt-2 block w-full resize-y rounded-xl border border-[#c6a77d]/25 bg-black/55 px-4 py-3 text-sm leading-relaxed text-[#f0ebe3] placeholder:text-zinc-600 focus:border-[#c6a77d]/55 focus:outline-none focus:ring-1 focus:ring-[#c6a77d]/35 disabled:opacity-55"
              onChange={(e) => {
                setMessage(e.target.value);
                if (status === "error") setStatus("idle");
              }}
            />
          </div>

          {status === "error" && errorMsg ? (
            <p className="mt-4 text-sm text-red-300/95" role="alert">
              {errorMsg}
            </p>
          ) : null}
          {status === "success" && submissionPreview ? (
            <div className="mt-8 space-y-6" role="status" aria-live="polite">
              <p className="text-center text-lg font-semibold tracking-tight text-[#F5EDE4] sm:text-xl">
                Thank you for your feedback!
              </p>
              <article className="mx-auto min-h-[220px] max-w-3xl rounded-2xl border border-[#C6A77D]/20 bg-black/35 px-8 py-8 shadow-sm backdrop-blur-sm sm:min-h-[200px] sm:px-10 sm:py-10">
                  <Stars rating={submissionPreview.rating} filledClass="text-amber-400" emptyClass="text-[#F5EDE4]/25" />
                  <blockquote className="mt-5 text-pretty text-base leading-relaxed text-[#F5EDE4]/90 sm:text-lg">
                    <p className="whitespace-pre-wrap">&ldquo;{submissionPreview.message}&rdquo;</p>
                    <footer className="mt-6 text-sm font-medium not-italic text-[#F5EDE4]/60">
                      — {submissionPreview.storeName}
                    </footer>
                  </blockquote>
                </article>
            </div>
          ) : null}

          <button
            type="button"
            disabled={status === "sending"}
            onClick={() => void submit()}
            className="mt-6 w-full rounded-full border border-[#c6a77d]/45 bg-[#c6a77d]/15 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#f5efe6] shadow-[inset_0_1px_0_0_rgba(255,236,210,0.12)] transition hover:border-[#d4bc94]/60 hover:bg-[#c6a77d]/25 disabled:opacity-45"
          >
            {status === "sending" ? "Sending…" : "Submit feedback"}
          </button>
        </div>
      </div>
    </section>
  );
}
