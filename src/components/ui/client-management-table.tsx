"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Copy, Pencil, RotateCcw, Trash2 } from "lucide-react";

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
      <div className="h-2 w-40 overflow-hidden rounded-full border border-surface-border bg-surface-muted">
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
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => setClients(initialClients), [initialClients]);

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
          <p className="text-xs text-zinc-500">Actions are available on each row.</p>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="border-b border-surface-border px-4 py-3">Client Name</th>
                <th className="border-b border-surface-border px-4 py-3">API Key</th>
                <th className="border-b border-surface-border px-4 py-3">Usage / Limit</th>
                <th className="border-b border-surface-border px-4 py-3">Status</th>
                <th className="border-b border-surface-border px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {clients.map((c) => {
                const status = statusFor(c.usageCount, c.usageLimit);
                return (
                  <motion.tr
                    key={c.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                    className="align-middle"
                    whileHover={shouldReduceMotion ? undefined : { backgroundColor: "rgba(241,245,249,0.6)" }}
                  >
                    <td className="border-b border-surface-border px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">{c.clientName}</p>
                        <p className="mt-1 text-xs text-zinc-500">Created {c.createdDate}</p>
                      </div>
                    </td>
                    <td className="border-b border-surface-border px-4 py-4">
                      <span className="rounded-lg border border-surface-border bg-white px-2.5 py-1 font-mono text-xs text-zinc-700">
                        {c.apiKeyPrefix}…
                      </span>
                    </td>
                    <td className="border-b border-surface-border px-4 py-4">
                      <div className="flex items-center gap-4">
                        <UsageProgress usage={c.usageCount} limit={c.usageLimit} />
                        <span className="text-xs font-semibold text-zinc-700">
                          {c.usageCount}/{c.usageLimit}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-surface-border px-4 py-4">
                      <StatusBadge status={status} />
                    </td>
                    <td className="border-b border-surface-border px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit?.(c.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-surface-border bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopyCode?.(c.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-surface-border bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => onReset?.(c.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-surface-border bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(c.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

