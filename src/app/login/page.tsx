import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Fit Room retailer dashboard.",
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="pt-[var(--site-header-height)]">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Log In</h1>
          <p className="mt-2 text-sm text-zinc-400">Access your dashboard, API key, and try-on statistics.</p>
          <LoginForm />
          <p className="mt-8 text-center text-xs text-zinc-600">
            <Link href="/" className="underline-offset-2 hover:underline">
              Back to home
            </Link>
          </p>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
