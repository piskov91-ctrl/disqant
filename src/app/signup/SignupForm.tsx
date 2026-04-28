"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  RETAILER_PASSWORD_MAX,
  RETAILER_PASSWORD_RULES_SUMMARY,
  validateRetailerPasswordStrength,
} from "@/lib/retailerPasswordPolicy";

const inputClass =
  "mt-2 block w-full rounded-xl border border-zinc-600/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30";

function validateWebsiteIfPresent(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "Website must be a valid http(s) URL, or leave the field blank.";
    }
    return null;
  } catch {
    return "Website must be a valid URL (e.g. https://yourstore.com), or leave blank.";
  }
}

export function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = useCallback((): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (firstName.trim().length > 100) return "First name must be at most 100 characters.";
    if (!lastName.trim()) return "Last name is required.";
    if (lastName.trim().length > 100) return "Last name must be at most 100 characters.";
    if (companyName.trim().length > 200) return "Company name must be at most 200 characters.";
    const em = email.trim();
    if (!em) return "Email is required.";
    if (em.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return "Enter a valid email address.";
    }
    const webErr = validateWebsiteIfPresent(websiteUrl);
    if (webErr) return webErr;
    const pwdErr = validateRetailerPasswordStrength(password);
    if (pwdErr) return pwdErr;
    if (password !== confirmPassword) return "Password and confirmation do not match.";
    if (!agreeTerms) return "You must agree to the Terms & Conditions.";
    if (!agreePrivacy) return "You must agree to the Privacy Policy.";
    return null;
  }, [
    firstName,
    lastName,
    companyName,
    email,
    websiteUrl,
    password,
    confirmPassword,
    agreeTerms,
    agreePrivacy,
  ]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void (async () => {
      setError(null);
      const err = validate();
      if (err) {
        setError(err);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/retailer/signup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            companyName: companyName.trim(),
            email: email.trim(),
            websiteUrl: websiteUrl.trim(),
            password,
            confirmPassword,
            agreeTerms: true,
            agreePrivacy: true,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not create account.");
          return;
        }
        window.location.assign("/dashboard");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <div className="mt-8 rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-6 shadow-xl shadow-black/40 backdrop-blur-sm md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="su-first" className="block text-sm font-medium text-zinc-200">
              First name <span className="text-red-400">*</span>
            </label>
            <input
              id="su-first"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="Jane"
            />
          </div>
          <div>
            <label htmlFor="su-last" className="block text-sm font-medium text-zinc-200">
              Last name <span className="text-red-400">*</span>
            </label>
            <input
              id="su-last"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="su-company" className="block text-sm font-medium text-zinc-200">
            Company name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="su-company"
            name="companyName"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={200}
            className={inputClass}
            placeholder="Your store or brand"
          />
        </div>

        <div>
          <label htmlFor="su-email" className="block text-sm font-medium text-zinc-200">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="su-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="su-web" className="block text-sm font-medium text-zinc-200">
            Website URL <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="su-web"
            name="websiteUrl"
            type="text"
            inputMode="url"
            autoComplete="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={inputClass}
            placeholder="https://yourstore.com"
          />
        </div>

        <div>
          <label htmlFor="su-password" className="block text-sm font-medium text-zinc-200">
            Password <span className="text-red-400">*</span>
          </label>
          <input
            id="su-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={RETAILER_PASSWORD_MAX}
            className={inputClass}
            placeholder="Create a strong password"
          />
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-zinc-500">
            {RETAILER_PASSWORD_RULES_SUMMARY.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="su-confirm" className="block text-sm font-medium text-zinc-200">
            Confirm password <span className="text-red-400">*</span>
          </label>
          <input
            id="su-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            maxLength={RETAILER_PASSWORD_MAX}
            className={inputClass}
            placeholder="Re-enter password"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-500 bg-zinc-900 text-violet-500 focus:ring-violet-500/40"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-violet-300 underline-offset-2 hover:underline"
              >
                Terms &amp; Conditions
              </Link>
              .
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-500 bg-zinc-900 text-violet-500 focus:ring-violet-500/40"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-violet-300 underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        {error ? (
          <div
            className="rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn-accent-gradient h-12 w-full text-sm font-semibold shadow-lg shadow-violet-900/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
