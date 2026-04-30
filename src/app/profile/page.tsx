import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = {
  title: "Profile settings",
  description: "Update your retailer account details.",
};

export default async function ProfilePage() {
  const user = await getRetailerSessionUser();
  if (!user) redirect("/login?next=/profile");

  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-40 md:pt-44">
        <div className="mx-auto max-w-lg px-6 py-12 md:py-16">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Profile settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Update your name, email, company, and website. Changes apply to your dashboard and account label.
          </p>
          <ProfileForm
            initial={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              companyName: user.companyName,
              websiteUrl: user.websiteUrl,
            }}
          />
        </div>
        <p className="pb-12 text-center text-xs text-zinc-600">
          <Link href="/dashboard" className="underline-offset-2 hover:text-zinc-400 hover:underline">
            Dashboard
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
