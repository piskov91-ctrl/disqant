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
      <main className="relative min-h-dvh bg-zinc-950 pt-[var(--site-header-height)]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 min-h-full bg-[radial-gradient(ellipse_95%_45%_at_50%_0%,rgba(198,167,125,0.08),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(0,0,0,0.4),transparent_50%),radial-gradient(ellipse_55%_45%_at_0%_85%,rgba(198,167,125,0.05),transparent_48%)]"
          aria-hidden
        />
        <div className="mx-auto max-w-xl px-6 pb-24 pt-14 md:pt-16 md:pb-28">
          <header>
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4bc94]/85">Account</h1>
            <p className="mt-3 text-balance text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              Profile settings
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
              View your storefront identity here. Editing opens your full details whenever you&apos;re ready.
            </p>
          </header>
          <ProfileForm
            initial={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              storeName: user.storeName,
              companyName: user.companyName,
              websiteUrl: user.websiteUrl,
            }}
          />
        </div>
        <p className="pb-12 text-center text-xs text-zinc-600">
          <Link href="/dashboard" className="underline-offset-2 hover:text-[#d4bc94]/90 hover:underline">
            Dashboard
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
