import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a retailer account for Disquant Wear Me.",
};

export default function SignupPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <div className="mx-auto max-w-md px-6 py-16 md:py-24">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Sign up</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Create your account to get an API key and track try-on usage. Passwords are stored with a strong one-way
            hash (scrypt).
          </p>
          <SignupForm />
          <p className="mt-8 text-center text-xs text-zinc-600">
            <Link href="/" className="underline-offset-2 hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
