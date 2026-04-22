import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getClientByApiKey } from "@/lib/apiKeyStore";

export const runtime = "nodejs";

type UsagePageProps = {
  searchParams: Promise<{ key?: string }>;
};

export default async function UsagePage(props: UsagePageProps) {
  const sp = await props.searchParams;
  const apiKey = typeof sp.key === "string" ? sp.key.trim() : "";

  const client = apiKey ? await getClientByApiKey(apiKey) : null;

  const used = client?.usageCount ?? 0;
  const limit = client?.usageLimit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const blocked = !!client && limit > 0 && used >= limit;

  return (
    <>
      <Header />
      <main className="pt-16">
        <section className="border-b border-surface-border bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Usage
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Check your try-on usage with your API key.
            </p>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            {!apiKey ? (
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <p className="text-sm text-zinc-700">
                  Missing key. Open this page with <span className="font-mono">?key=...</span>
                </p>
              </div>
            ) : !client ? (
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <p className="text-base font-semibold text-zinc-900">Key not found. Please check your key.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-600">Client</p>
                    <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-900">
                      {client.clientName}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600">
                      Key:{" "}
                      <span className="rounded-md border border-surface-border bg-white px-2 py-1 font-mono text-sm text-zinc-800">
                        {client.key.slice(0, 8)}…
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                        blocked
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {blocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-surface-border bg-white p-6">
                    <p className="text-sm font-medium text-zinc-600">Used try-ons</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{used}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-white p-6">
                    <p className="text-sm font-medium text-zinc-600">Limit</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{limit}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-white p-6">
                    <p className="text-sm font-medium text-zinc-600">Usage</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{pct}%</p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between text-sm font-medium text-zinc-700">
                    <span>
                      {used} / {limit}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-surface-border bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
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

