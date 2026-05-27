"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const inputClass =
  "mt-2 block w-full rounded-xl border border-[#c6a77d]/25 bg-black/55 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/30 outline-none transition placeholder:text-zinc-600 focus:border-[#C6A77D]/55 focus:ring-1 focus:ring-[#C6A77D]/30";

export type ProfileInitialUser = {
  firstName?: string;
  lastName?: string;
  email: string;
  storeName: string;
  companyName: string;
  websiteUrl: string;
};

function initialsFromProfile(u: ProfileInitialUser): string {
  const f = u.firstName?.trim() ?? "";
  const l = u.lastName?.trim() ?? "";
  const a = f[0]?.toUpperCase();
  const b = l[0]?.toUpperCase();
  if (a && b) return `${a}${b}`;
  if (a) return f.length >= 2 ? `${a}${f[1]?.toUpperCase() ?? ""}` : a;
  const e = u.email?.trim() ?? "?";
  return (e[0]?.toUpperCase() ?? "?") + (e[1]?.toUpperCase() ?? "");
}

function displayFullName(firstName: string, lastName: string): string {
  const t = `${firstName.trim()} ${lastName.trim()}`.trim();
  return t || "Your name";
}

function validateWebsiteIfPresent(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const url = new URL(t.includes("://") ? t : `https://${t}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
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
  const [storeName, setStoreName] = useState(initial.storeName ?? "");
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setFirstName(initial.firstName ?? "");
    setLastName(initial.lastName ?? "");
    setStoreName(initial.storeName ?? "");
    setCompanyName(initial.companyName ?? "");
    setEmail(initial.email);
    setWebsiteUrl(initial.websiteUrl ?? "");
  }, [
    initial.firstName,
    initial.lastName,
    initial.storeName,
    initial.companyName,
    initial.email,
    initial.websiteUrl,
  ]);

  const validate = useCallback((): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (firstName.trim().length > 100) return "First name must be at most 100 characters.";
    if (!lastName.trim()) return "Last name is required.";
    if (lastName.trim().length > 100) return "Last name must be at most 100 characters.";
    if (!storeName.trim()) return "Store name is required.";
    if (storeName.trim().length > 200) return "Store name must be at most 200 characters.";
    if (companyName.trim().length > 200) return "Company name must be at most 200 characters.";
    const em = email.trim();
    if (!em) return "Email is required.";
    if (em.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return "Enter a valid email address.";
    }
    return validateWebsiteIfPresent(websiteUrl);
  }, [firstName, lastName, storeName, companyName, email, websiteUrl]);

  function handleCancelEdit() {
    setEditing(false);
    setError(null);
    setSuccess(false);
    setFirstName(initial.firstName ?? "");
    setLastName(initial.lastName ?? "");
    setStoreName(initial.storeName ?? "");
    setCompanyName(initial.companyName ?? "");
    setEmail(initial.email ?? "");
    setWebsiteUrl(initial.websiteUrl ?? "");
  }

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
            storeName: storeName.trim(),
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
          setStoreName(data.user.storeName ?? "");
          setCompanyName(data.user.companyName ?? "");
          setEmail(data.user.email);
          setWebsiteUrl(data.user.websiteUrl ?? "");
        }
        setSuccess(true);
        setEditing(false);
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  const cardFullName = displayFullName(firstName, lastName);
  const cardStore = storeName.trim() || "Your store";
  const avatar = initialsFromProfile({
    ...initial,
    firstName,
    lastName,
    email,
  });

  return (
    <div className="mt-10 space-y-8">
      <div
        className="relative overflow-hidden rounded-3xl border border-[#c6a77d]/32 bg-[#14110e]/92 p-8 shadow-[0_32px_80px_-36px_rgba(0,0,0,0.85)] backdrop-blur-xl md:p-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(198,167,125,0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(0,0,0,0.45), transparent 50%), radial-gradient(ellipse 55% 45% at 0% 90%, rgba(198,167,125,0.06), transparent 48%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#d4bc94]/40 to-transparent"
          aria-hidden
        />

        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-5">
            <div
              className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#c6a77d]/40 bg-gradient-to-br from-[#2a231c] via-[#1a1612] to-black text-xl font-semibold tracking-tight text-[#f0e6d8] shadow-inner shadow-black/50 ring-2 ring-[#c6a77d]/15 sm:h-[5.25rem] sm:w-[5.25rem] sm:text-2xl"
              aria-hidden
            >
              {avatar.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4bc94]/80">Profile</p>
              <p className="mt-3 truncate text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{cardFullName}</p>
              <p className="mt-2 truncate text-sm text-[#c6a77d]/90">{cardStore}</p>
              {!editing ? (
                <p className="mt-4 max-w-md text-xs leading-relaxed text-zinc-500">
                  Your store name powers how we label your Wear Me integration. Tap edit to update details securely.
                </p>
              ) : null}
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError(null);
                setSuccess(false);
              }}
              className="shrink-0 rounded-full border border-[#c6a77d]/45 bg-black/35 px-6 py-2.5 text-sm font-semibold text-[#f0e6d8] shadow-inner shadow-black/40 transition-colors duration-300 hover:border-[#d4bc94]/60 hover:bg-[#c6a77d]/10"
            >
              Edit profile
            </button>
          ) : null}
        </div>

        {success && !editing ? (
          <div className="relative mt-8 rounded-xl border border-emerald-500/35 bg-emerald-950/35 px-4 py-3 text-center text-sm text-emerald-100">
            Profile updated successfully.
          </div>
        ) : null}

        <div
          role="region"
          aria-labelledby="profile-edit-heading"
          className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`border-t border-[#c6a77d]/15 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${editing ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none"}`}
              inert={!editing ? true : undefined}
            >
              <h2 id="profile-edit-heading" className="sr-only">
                Edit profile details
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5 pt-8" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pf-first" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      First name <span className="font-normal lowercase text-red-400/95">*</span>
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
                    <label htmlFor="pf-last" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Last name <span className="font-normal lowercase text-red-400/95">*</span>
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
                  <label htmlFor="pf-store" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Store name <span className="font-normal lowercase text-red-400/95">*</span>
                  </label>
                  <input
                    id="pf-store"
                    name="storeName"
                    type="text"
                    autoComplete="organization"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    maxLength={200}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pf-email" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Email <span className="font-normal lowercase text-red-400/95">*</span>
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
                  <label htmlFor="pf-company" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Company name <span className="font-normal lowercase text-zinc-600">(optional)</span>
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
                  <label htmlFor="pf-web" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Website URL <span className="font-normal lowercase text-zinc-600">(optional)</span>
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
                  <div className="rounded-xl border border-red-500/35 bg-red-950/45 px-4 py-3 text-sm text-red-100">
                    {error}
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
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCancelEdit}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#c6a77d]/30 bg-black/40 px-6 text-sm font-semibold text-zinc-200 transition-colors duration-300 hover:border-[#c6a77d]/50 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600/70 px-6 text-sm font-semibold text-zinc-300 transition-colors duration-300 hover:border-zinc-500 hover:bg-zinc-900/70"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-red-900/45 bg-[#140c0c]/95 p-7 shadow-xl shadow-black/40 backdrop-blur-sm md:p-8">
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-red-900/55 to-transparent"
          aria-hidden
        />
        <h2 className="text-base font-semibold text-red-100">Danger zone</h2>
        <p className="mt-2 text-sm leading-relaxed text-red-200/80">
          Permanently delete your account and all associated data. This action cannot be undone. All your remaining
          try-ons will be lost and cannot be recovered.
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteEmail("");
              setDeleteError(null);
            }}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-red-700/70 bg-red-950/50 px-6 text-sm font-semibold text-red-100 transition hover:border-red-600 hover:bg-red-950/70"
          >
            Delete account
          </button>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              <p className="font-medium text-red-50">Type your email to confirm deletion</p>
              <p className="mt-1 text-red-100/80">
                Enter <span className="font-semibold">{initial.email}</span> to permanently delete your account.
              </p>
            </div>

            <div>
              <label htmlFor="da-email" className="block text-sm font-medium text-red-100">
                Email confirmation
              </label>
              <input
                id="da-email"
                name="deleteEmail"
                type="email"
                autoComplete="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-red-900/60 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-red-600/70 focus:ring-1 focus:ring-red-600/25"
              />
            </div>

            {deleteError ? (
              <div className="rounded-xl border border-red-700/60 bg-red-950/60 px-4 py-3 text-sm text-red-100">
                {deleteError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={deleting || deleteEmail.trim().toLowerCase() !== initial.email.trim().toLowerCase()}
                onClick={() => {
                  void (async () => {
                    setDeleteError(null);
                    setDeleting(true);
                    try {
                      const res = await fetch("/api/retailer/delete-account", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: deleteEmail }),
                      });
                      const data = (await res.json()) as { ok?: true; error?: string };
                      if (!res.ok) {
                        setDeleteError(data.error || "Could not delete account.");
                        return;
                      }
                      window.location.assign("/");
                    } catch {
                      setDeleteError("Something went wrong. Please try again.");
                    } finally {
                      setDeleting(false);
                    }
                  })();
                }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteEmail("");
                  setDeleteError(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/40 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
