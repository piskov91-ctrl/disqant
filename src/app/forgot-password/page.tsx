import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Fit Room retailer account password.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className="relative min-h-dvh overflow-hidden bg-zinc-950 pt-[var(--site-header-height)]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 min-h-full bg-[radial-gradient(ellipse_100%_55%_at_50%_-10%,rgba(198,167,125,0.12),transparent_52%),radial-gradient(ellipse_70%_45%_at_100%_30%,rgba(124,58,237,0.06),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(236,72,153,0.04),transparent_45%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-md px-6 py-16 md:py-24">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 shadow-xl shadow-black/25 backdrop-blur-sm md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c6a77d]/85">Password help</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">Forgot your password?</h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-300">
              No worries, it happens to everyone. Enter your email below and we will send you a link to reset your
              password in seconds.
            </p>
            <ForgotPasswordForm />
            <p className="mt-8 text-center text-sm text-zinc-500">
              <Link
                href="/login"
                className="font-medium text-[#d4bc94] underline-offset-2 transition hover:text-[#e8dcc8] hover:underline"
              >
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
