import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/app/signup/SignupForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a retailer account for Fit Room Wear Me.",
};

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="bg-zinc-950 pt-20">
        <div className="mx-auto max-w-lg px-6 py-16 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Sign up</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Create your retailer account for an API key and usage dashboard. Passwords are hashed with scrypt; we
            never store plain text passwords. Required fields use a red asterisk (
            <span className="text-red-400">*</span>); company and website are optional.
          </p>
          <SignupForm />
          <p className="mt-8 text-center text-xs text-zinc-500">
            <Link href="/" className="underline-offset-2 hover:text-zinc-300 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
