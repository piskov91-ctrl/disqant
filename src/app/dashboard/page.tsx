import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TopProductThumbnails } from "@/components/TopProductThumbnails";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { TryOnTimingCharts } from "@/components/TryOnTimingCharts";
import { getTryOnTimingForClient } from "@/lib/platformAnalytics";
import { getTopTryOnProducts } from "@/lib/tryOnAnalytics";
import { RetailerDashboardClient } from "./RetailerDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Wear Me API key, try-on usage, and top product images.",
};

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await getRetailerSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const client = await getClientKeyRecordById(user.clientId);
  if (!client) {
    return (
      <>
        <Header />
        <main className="pt-16">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-zinc-300">
              We couldn&apos;t load your API key record. Please contact{" "}
              <a href="mailto:hello@disqant.com" className="text-accent underline-offset-2 hover:underline">
                hello@disqant.com
              </a>
              .
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const topProducts = await getTopTryOnProducts(client.id, 5);
  const tryOnTiming = await getTryOnTimingForClient(client.id);
  const used = client.usageCount;
  const limit = client.usageLimit;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const blocked = limit > 0 && used >= limit;

  return (
    <>
      <Header />
      <main className="pt-16">
        <section className="border-b border-white/10 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
              {[
                [user.firstName, user.lastName].filter(Boolean).join(" "),
                user.companyName?.trim(),
              ]
                .filter(Boolean)
                .join(" · ") || "Account"}{" "}
              · Try-on usage and your embed API key.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Website:{" "}
              {user.websiteUrl ? (
                <a
                  href={user.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 underline-offset-2 hover:underline"
                >
                  {user.websiteUrl}
                </a>
              ) : (
                <span className="text-zinc-600">Not provided</span>
              )}
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-8">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-400">API key</p>
                    <p className="mt-2 break-all font-mono text-sm text-zinc-200">{client.key}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Use this value as <span className="font-mono text-zinc-400">data-disquant-key</span> on the
                      script tag, or pass <span className="font-mono text-zinc-400">?key=</span> in the script URL.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                        blocked
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      {blocked ? "Limit reached" : "Active"}
                    </span>
                  </div>
                </div>

                <RetailerDashboardClient apiKey={client.key} />

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-ons used</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{used}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-ons remaining</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{remaining}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-on limit</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{limit}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-zinc-300">
                    <span>
                      Try-ons used {used} / {limit}
                    </span>
                    <span className="tabular-nums text-zinc-400">{pct}% of limit</span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-950/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <TryOnTimingCharts
                variant="dashboard"
                subtitle="Try-ons billed to your API key (all time)."
                tryOnByHourUtc={tryOnTiming.tryOnByHourUtc}
                tryOnByWeekdayUtc={tryOnTiming.tryOnByWeekdayUtc}
              />

              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-zinc-50">Top Wear Me product images</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Ranked by completed try-ons. Send <span className="font-mono text-zinc-300">productImageUrl</span>{" "}
                  with requests to attribute catalog images.
                </p>
                {topProducts.length === 0 ? (
                  <p className="mt-6 text-sm text-zinc-500">
                    No data yet. Complete a Wear Me on your site to see rankings here.
                  </p>
                ) : (
                  <TopProductThumbnails items={topProducts} />
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
