"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const inputClass =
  "mt-2 block w-full rounded-xl border border-zinc-600/80 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30";

export type ProfileInitialUser = {
  firstName?: string;
  lastName?: string;
  email: string;
  companyName: string;
  websiteUrl: string;
};

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

export function ProfileForm({ initial }: { initial: ProfileInitialUser }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName ?? "");
  const [lastName, setLastName] = useState(initial.lastName ?? "");
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    return validateWebsiteIfPresent(websiteUrl);
  }, [firstName, lastName, companyName, email, websiteUrl]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void (async () => {
      setError(null);
      setSuccess(false);
      const err = validate();
      if (err) {
        setError(err);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/retailer/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            companyName: companyName.trim(),
            email: email.trim(),
            websiteUrl: websiteUrl.trim(),
          }),
        });
        const data = (await res.json()) as { error?: string; user?: ProfileInitialUser };
        if (!res.ok) {
          setError(data.error || "Could not save changes.");
          return;
        }
        if (data.user) {
          setFirstName(data.user.firstName ?? "");
          setLastName(data.user.lastName ?? "");
          setCompanyName(data.user.companyName ?? "");
          setEmail(data.user.email);
          setWebsiteUrl(data.user.websiteUrl ?? "");
        }
        setSuccess(true);
        router.refresh();
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
            <label htmlFor="pf-first" className="block text-sm font-medium text-zinc-200">
              First name <span className="text-red-400">*</span>
            </label>
            <input
              id="pf-first"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="pf-last" className="block text-sm font-medium text-zinc-200">
              Last name <span className="text-red-400">*</span>
            </label>
            <input
              id="pf-last"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="pf-email" className="block text-sm font-medium text-zinc-200">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="pf-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="pf-company" className="block text-sm font-medium text-zinc-200">
            Company name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="pf-company"
            name="companyName"
            type="text"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="pf-web" className="block text-sm font-medium text-zinc-200">
            Website URL <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="pf-web"
            name="websiteUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourstore.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            Profile updated.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-accent-gradient disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 px-8 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/80"
          >
            Back to dashboard
          </Link>
        </div>
      </form>
    </div>
  );
}
