import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Fit Room retailer account password.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-[150px]">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Forgot password?</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Self-serve password reset by email isn&apos;t available yet. Please contact us and we&apos;ll help you get
            back into your account.
          </p>
          <p className="mt-6 text-sm text-zinc-300">
            <a
              href="mailto:hello@fit-room.com"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              hello@fit-room.com
            </a>
          </p>
          <p className="mt-10 text-center text-sm text-zinc-500">
            <Link href="/login" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
