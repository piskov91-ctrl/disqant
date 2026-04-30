import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TopProductThumbnails } from "@/components/TopProductThumbnails";
import { getClientByApiKey } from "@/lib/apiKeyStore";
import { getTopTryOnProducts } from "@/lib/tryOnAnalytics";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View try-ons used, try-on limit, and top product images for your Wear Me API key.",
};

export const runtime = "nodejs";

type UsagePageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function UsagePage(props: UsagePageProps) {
  const sp = await props.searchParams;
  const apiKey = typeof sp.key === "string" ? sp.key.trim() : "";

  const client = apiKey ? await getClientByApiKey(apiKey) : null;
  const topProducts = client ? await getTopTryOnProducts(client.id, 5) : [];

  const used = client?.usageCount ?? 0;
  const limit = client?.usageLimit ?? 0;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const blocked = !!client && limit > 0 && used >= limit;

  return (
    <>
      <Header />
      <main className="pt-[60px]">
        <section className="border-b border-white/10 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-400">
              See try-ons used, try-ons remaining, and your try-on limit—and your most-used product images.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-6xl px-6">
            {!apiKey ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <p className="text-sm text-zinc-300">
                  Missing key. Open this page with <span className="font-mono text-zinc-100">?key=...</span>
                </p>
              </div>
            ) : !client ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                <p className="text-base font-semibold text-zinc-100">Key not found. Please check your key.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-400">Client</p>
                      <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-50">
                        {client.clientName}
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Key:{" "}
                        <span className="rounded-md border border-white/10 bg-zinc-950/50 px-2 py-1 font-mono text-sm text-zinc-200">
                          {client.key.slice(0, 8)}…
                        </span>
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
                        {blocked ? "Blocked" : "Active"}
                      </span>
                    </div>
                  </div>

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
                        Try-ons used {used} / {limit} try-on limit
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

                <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                  <h2 className="text-lg font-semibold text-zinc-50">Top Wear Me product images</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Thumbnails show the product image URL from each Wear Me. Send{" "}
                    <span className="font-mono text-zinc-300">productImageUrl</span> in your API request to attribute
                    catalog images.
                  </p>

                  {topProducts.length === 0 ? (
                    <p className="mt-6 text-sm text-zinc-500">
                      No data yet. Complete a Wear Me (with an optional product image URL) to see rankings here.
                    </p>
                  ) : (
                    <TopProductThumbnails items={topProducts} />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
