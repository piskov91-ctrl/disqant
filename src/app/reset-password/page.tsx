import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Fit Room retailer account.",
};

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-[var(--site-header-height)]">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Choose a new password</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Enter a new password for your retailer account. After saving, you can log in with the new password.
          </p>
          <ResetPasswordForm />
          <p className="mt-10 text-center text-sm text-zinc-500">
            <Link href="/login" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
