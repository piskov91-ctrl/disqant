"use client";

import { useCallback, useEffect, useState } from "react";

type AdminSystemServiceState = "ok" | "warning" | "error";

type AdminSystemServiceCheck = {
  id: string;
  label: string;
  state: AdminSystemServiceState;
  message: string;
  creditsTotal?: number;
};

type AdminSystemStatusPayload = {
  checkedAt: string;
  services: AdminSystemServiceCheck[];
};

function formatCheckedAt(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function serviceCardClasses(state: AdminSystemServiceState): string {
  if (state === "ok") return "border-emerald-800/50 bg-emerald-950/20";
  if (state === "warning") return "border-amber-700/55 bg-amber-950/25";
  return "border-rose-800/55 bg-rose-950/25";
}

function serviceDotClasses(state: AdminSystemServiceState): string {
  if (state === "ok") return "bg-emerald-400";
  if (state === "warning") return "bg-amber-400";
  return "bg-rose-400";
}

function serviceTitleClasses(state: AdminSystemServiceState): string {
  if (state === "ok") return "text-emerald-100";
  if (state === "warning") return "text-amber-100";
  return "text-rose-100";
}

function serviceMessageClasses(state: AdminSystemServiceState): string {
  if (state === "ok") return "text-emerald-300/80";
  if (state === "warning") return "text-amber-200/90";
  return "text-rose-200/90";
}

export function AdminSystemStatusPanel() {
  const [status, setStatus] = useState<AdminSystemStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/system-status", { cache: "no-store" });
      const data = (await res.json()) as Partial<AdminSystemStatusPayload> & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setStatus(null);
        setFetchError(data.error || "Could not load system status.");
        return;
      }
      if (!data.checkedAt || !Array.isArray(data.services)) {
        setStatus(null);
        setFetchError("Unexpected response from system status API.");
        return;
      }
      setStatus({
        checkedAt: data.checkedAt,
        services: data.services,
      });
    } catch (e) {
      setStatus(null);
      setFetchError(e instanceof Error ? e.message : "Could not load system status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasErrors = status?.services.some((service) => service.state === "error") ?? false;
  const hasWarnings = status?.services.some((service) => service.state === "warning") ?? false;
  const allHealthy = status?.services.every((service) => service.state === "ok") ?? false;

  return (
    <section
      className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 md:px-6"
      aria-label="System status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">System status</p>
          {loading ? (
            <p className="mt-2 text-sm text-zinc-500">Checking services…</p>
          ) : fetchError ? (
            <p className="mt-2 text-sm leading-snug text-rose-300">{fetchError}</p>
          ) : status ? (
            <>
              <p className="mt-2 text-sm text-zinc-400">
                Last checked:{" "}
                <time dateTime={status.checkedAt} className="tabular-nums text-zinc-300">
                  {formatCheckedAt(status.checkedAt)}
                </time>
              </p>
              {hasErrors ? (
                <p className="mt-1 text-xs text-rose-300/90">One or more services are unavailable.</p>
              ) : hasWarnings ? (
                <p className="mt-1 text-xs text-amber-300/90">All services are up; review warnings below.</p>
              ) : allHealthy ? (
                <p className="mt-1 text-xs text-emerald-300/90">All monitored services are responding.</p>
              ) : null}
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-4 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Recheck
        </button>
      </div>

      {status && !fetchError ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {status.services.map((service) => (
            <li
              key={service.id}
              className={`rounded-lg border px-4 py-3 ${serviceCardClasses(service.state)}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${serviceDotClasses(service.state)}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${serviceTitleClasses(service.state)}`}>{service.label}</p>
                  <p className={`mt-0.5 text-xs ${serviceMessageClasses(service.state)}`}>{service.message}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
