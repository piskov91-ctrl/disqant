"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Pencil, RotateCcw, Trash2, X } from "lucide-react";

export interface ClientRow {
  id: string;
  number: string;
  clientName: string;
  apiKeyPrefix: string; // first 8 chars
  createdDate: string;
  usageCount: number;
  usageLimit: number;
}

interface ClientManagementTableProps {
  title?: string;
  clients: ClientRow[];
  onEdit?: (clientId: string) => void;
  onCopyCode?: (clientId: string) => void;
  onReset?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  className?: string;
}

function clampPct(usage: number, limit: number) {
  if (!Number.isFinite(usage) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((usage / limit) * 100)));
}

function statusFor(usage: number, limit: number): "active" | "blocked" {
  return limit > 0 && usage >= limit ? "blocked" : "active";
}

function StatusBadge({ status }: { status: "active" | "blocked" }) {
  if (status === "blocked") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      Active
    </span>
  );
}

function UsageProgress({ usage, limit }: { usage: number; limit: number }) {
  const pct = clampPct(usage, limit);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-36 overflow-hidden rounded-full border border-surface-border bg-surface-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="min-w-[3.5rem] text-xs font-semibold text-zinc-600">{pct}%</span>
    </div>
  );
}

export function ClientManagementTable({
  title = "Clients",
  clients: initialClients,
  onEdit,
  onCopyCode,
  onReset,
  onDelete,
  className = "",
}: ClientManagementTableProps) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [selected, setSelected] = useState<ClientRow | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => setClients(initialClients), [initialClients]);

  useEffect(() => {
    if (!selected) return;
    const next = clients.find((c) => c.id === selected.id) ?? null;
    setSelected(next);
  }, [clients, selected]);

  const counts = useMemo(() => {
    const total = clients.length;
    const blocked = clients.filter((c) => statusFor(c.usageCount, c.usageLimit) === "blocked").length;
    return { total, blocked };
  }, [clients]);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative rounded-2xl border border-surface-border bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {counts.total} clients · {counts.blocked} blocked
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-500">Click a row to view details.</p>
        </div>

        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
          }}
        >
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <div className="col-span-1">No</div>
            <div className="col-span-3">Client Name</div>
            <div className="col-span-2">API Key</div>
            <div className="col-span-3">Usage / Limit</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Status</div>
          </div>

          {clients.map((c) => {
            const status = statusFor(c.usageCount, c.usageLimit);
            const usagePct = clampPct(c.usageCount, c.usageLimit);
            return (
              <motion.div
                key={c.id}
                variants={{
                  hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -18, scale: 0.985 },
                  visible: shouldReduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: { type: "spring", stiffness: 420, damping: 30, mass: 0.65 },
                      },
                }}
                className="relative cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <motion.div
                  className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-muted/30 p-4"
                  whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-l ${
                      status === "blocked" ? "from-amber-500/10" : "from-emerald-500/10"
                    } to-transparent`}
                    style={{
                      backgroundSize: "36% 100%",
                      backgroundPosition: "right",
                      backgroundRepeat: "no-repeat",
                    }}
                  />

                  <div className="relative grid grid-cols-12 items-center gap-4">
                    <div className="col-span-1 text-2xl font-bold text-zinc-400">{c.number}</div>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate font-semibold text-zinc-900">{c.clientName}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="rounded-lg border border-surface-border bg-white px-2 py-1 font-mono text-xs text-zinc-700">
                        {c.apiKeyPrefix}…
                      </span>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center justify-between gap-3">
                        <UsageProgress usage={c.usageCount} limit={c.usageLimit} />
                        <span className="hidden text-xs font-semibold text-zinc-700 md:inline">
                          {c.usageCount}/{c.usageLimit}
                        </span>
                        <span className="sr-only">{usagePct}%</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-zinc-700">{c.createdDate}</div>
                    <div className="col-span-1">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {selected ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              className="absolute inset-0 z-10 flex flex-col overflow-hidden rounded-2xl bg-white/70 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between border-b border-surface-border bg-white/80 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{selected.clientName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    API key: <span className="font-mono">{selected.apiKeyPrefix}…</span> · Created{" "}
                    <span className="font-medium text-zinc-800">{selected.createdDate}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={() => onEdit?.(selected.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-surface-raised"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onCopyCode?.(selected.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-surface-raised"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy code
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onReset?.(selected.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-surface-raised"
                    whileTap={{ scale: 0.98 }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onDelete?.(selected.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-white text-zinc-700 transition hover:bg-surface-raised"
                    aria-label="Close"
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5 md:p-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-surface-border bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Usage</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-900">
                      {selected.usageCount}/{selected.usageLimit}
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-white p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Usage %</p>
                    <div className="mt-3">
                      <UsageProgress usage={selected.usageCount} limit={selected.usageLimit} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

