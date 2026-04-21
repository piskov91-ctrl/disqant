"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type FashnCategory = "tops" | "bottoms" | "one-pieces" | "auto" | "shoes";

type TryOnResponse =
  | { id: string; output: string[]; category?: FashnCategory }
  | { error: string; code?: string; keyKind?: "demo" | "client" };

type DemoWidgetModalState = {
  open: boolean;
  stageUrl: string | null;
  stageAlt: string;
  processing: boolean;
  pct: number;
  resultUrl: string | null;
};

type GarmentPreset = {
  id: "sneakers" | "tee" | "sweater" | "jacket";
  label: "Sneakers" | "T-Shirt" | "Sweater" | "Jacket";
  name: string;
  /** Sent to Fashn as `inputs.category` */
  category: FashnCategory;
  imageUrl: string;
};

const GARMENT_PRESETS: GarmentPreset[] = [
  {
    id: "sneakers",
    label: "Sneakers",
    name: "White clean sneakers",
    category: "shoes",
    imageUrl:
      // White sneakers on a white background (product-style).
      "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "tee",
    label: "T-Shirt",
    name: "Plain white t-shirt (flat lay)",
    category: "tops",
    imageUrl:
      "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sweater",
    label: "Sweater",
    name: "Beige oversized knit sweater",
    category: "tops",
    imageUrl:
      // Beige knit sweater (full garment shot).
      "https://images.unsplash.com/photo-1687275161342-8699c61e4364?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "jacket",
    label: "Jacket",
    name: "Black jacket",
    category: "tops",
    imageUrl:
      "https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?w=400",
  },
];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function compressImageToMax1000px(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image compression failed."))),
        "image/jpeg",
        0.86,
      );
    });

    const nameBase = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${nameBase || "image"}-1000.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function fetchUrlAsFile(url: string, name: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Failed to fetch preset garment image.");
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

export default function DemoClient() {
  const searchParams = useSearchParams();
  const urlKey = searchParams.get("key");
  const [model, setModel] = useState<File | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<GarmentPreset["id"]>(
    GARMENT_PRESETS[0]?.id ?? "tee",
  );
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState<null | "model" | "garment">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [widgetModal, setWidgetModal] = useState<DemoWidgetModalState>({
    open: false,
    stageUrl: null,
    stageAlt: "Preview",
    processing: false,
    pct: 0,
    resultUrl: null,
  });

  const modelCameraInputRef = useRef<HTMLInputElement | null>(null);
  const modelFileInputRef = useRef<HTMLInputElement | null>(null);

  const modelPreview = useMemo(() => (model ? URL.createObjectURL(model) : null), [model]);
  const selectedPreset = useMemo(
    () => GARMENT_PRESETS.find((p) => p.id === selectedPresetId) ?? null,
    [selectedPresetId],
  );
  const garmentPreview = selectedPreset?.imageUrl ?? null;

  async function setModelFromFile(file: File | null) {
    setError(null);
    setResult(null);
    if (!file) {
      setModel(null);
      return;
    }
    setCompressing("model");
    const compressed = await compressImageToMax1000px(file);
    setModel(compressed);
    setCompressing(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setShowUnavailableModal(false);
    if (!model || !selectedPreset) {
      setError("Please upload a person photo and select a sample product.");
      return;
    }

    setLoading(true);
    try {
      // Open widget-style modal immediately with the person photo.
      setWidgetModal({
        open: true,
        stageUrl: modelPreview,
        stageAlt: "Your photo",
        processing: true,
        pct: 0,
        resultUrl: null,
      });

      setCompressing("garment");
      const garmentRaw = await fetchUrlAsFile(
        selectedPreset.imageUrl,
        `${selectedPreset.id}.jpg`,
      );
      const garment = await compressImageToMax1000px(garmentRaw);
      setCompressing(null);

      // Fake progress while request runs (caps at 92%).
      let cancelled = false;
      let pct = 0;
      const timer = window.setInterval(() => {
        if (cancelled) return;
        if (pct < 92) {
          pct += pct < 55 ? 6 : pct < 78 ? 3 : 1;
          pct = Math.min(92, pct);
          setWidgetModal((m) => (m.open ? { ...m, pct } : m));
        }
      }, 260);

      const fd = new FormData();
      fd.set("model", model);
      fd.set("garment", garment);
      fd.set("category", selectedPreset.category);

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: urlKey ? { "x-api-key": urlKey } : undefined,
        body: fd,
      });
      const data = (await res.json()) as TryOnResponse;

      cancelled = true;
      window.clearInterval(timer);

      if (!res.ok) {
        if (res.status === 402) {
          setShowUnavailableModal(true);
          setWidgetModal((m) => ({ ...m, processing: false }));
          return;
        }
        const raw = "error" in data ? data.error : "Try-on failed.";
        if (
          res.status === 403 &&
          "code" in data &&
          data.code === "USAGE_LIMIT"
        ) {
          if (data.keyKind === "demo") {
            setError(
              "You've explored all our demo try-ons! Ready to bring this to your store? Contact us at hello@disqant.com to get started",
            );
            setWidgetModal((m) => ({ ...m, processing: false }));
            return;
          }
          setError("Virtual try-on temporarily unavailable. Please try again later");
          setWidgetModal((m) => ({ ...m, processing: false }));
          return;
        }
        setError(raw);
        setWidgetModal((m) => ({ ...m, processing: false }));
        return;
      }

      if ("output" in data && data.output?.[0]) {
        setResult(data.output[0]);
        setWidgetModal((m) => ({
          ...m,
          processing: false,
          pct: 100,
          stageUrl: data.output[0],
          stageAlt: "Try-on result",
          resultUrl: data.output[0],
        }));
      } else {
        setError("No output returned.");
        setWidgetModal((m) => ({ ...m, processing: false }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setWidgetModal((m) => ({ ...m, processing: false }));
    } finally {
      setLoading(false);
      setCompressing(null);
    }
  }

  async function logout() {
    await fetch("/api/demo-auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="min-h-dvh bg-surface">
      {widgetModal.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Try on"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setWidgetModal((m) => ({ ...m, open: false, processing: false }));
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="text-sm font-semibold text-[#0c0c0f]">Try On</div>
              <button
                type="button"
                onClick={() => setWidgetModal((m) => ({ ...m, open: false, processing: false }))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#0c0c0f] transition hover:bg-zinc-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                <div className="aspect-[4/3]">
                  {widgetModal.stageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={widgetModal.stageUrl}
                      alt={widgetModal.stageAlt}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      No photo selected
                    </div>
                  )}
                </div>

                {widgetModal.processing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/65 backdrop-blur">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-[#7c5cff]" />
                    <p className="max-w-md px-6 text-center text-sm font-semibold text-[#0c0c0f]">
                      This may take 20-30 seconds, please wait ✨
                    </p>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] via-[#ff5ca8] to-[#ffb84a] transition-[width] duration-150"
                      style={{ width: `${widgetModal.processing ? widgetModal.pct : widgetModal.resultUrl ? 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-[#0c0c0f] backdrop-blur">
                  Disqant
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                {widgetModal.resultUrl ? (
                  <a
                    href={widgetModal.resultUrl}
                    download
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#0c0c0f] px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    ⬇️ Save Photo
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWidgetModal((m) => ({ ...m, open: false, processing: false }))}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-[#0c0c0f] transition hover:bg-zinc-50"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showUnavailableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unavailable-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-surface-raised p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl text-amber-300">
                ⚠️
              </div>
              <div className="min-w-0">
                <p id="unavailable-title" className="text-base font-semibold text-white">
                  Virtual try-on temporarily unavailable
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Please try again later or contact support.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUnavailableModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-surface transition hover:bg-amber-400"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">
              Back to landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="lg:w-[420px]">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Virtual try-on demo
            </h1>
            <p className="mt-4 text-zinc-400">
              Select a sample product and upload a person photo. We auto-compress to max 1000px
              before generating.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Person photo</label>
                <p className="mt-1 text-xs text-zinc-500">
                  Front-facing, good lighting works best. We auto-compress to max 1000px.
                </p>
                <div className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => modelCameraInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-surface-border bg-transparent text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-surface-raised"
                      disabled={loading || compressing !== null}
                    >
                      Open camera
                    </button>
                    <button
                      type="button"
                      onClick={() => modelFileInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0c0c0f] transition hover:bg-zinc-200"
                      disabled={loading || compressing !== null}
                    >
                      Upload from files
                    </button>
                  </div>

                  <input
                    ref={modelCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => setModelFromFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <input
                    ref={modelFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setModelFromFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  {model && (
                    <p className="mt-2 text-xs text-zinc-500">
                      {model.name} · {formatBytes(model.size)}
                    </p>
                  )}
                  {compressing === "model" && (
                    <p className="mt-2 text-xs text-zinc-500">Compressing person photo…</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Sample products</label>
                <p className="mt-1 text-xs text-zinc-500">
                  Pick a preset garment. No upload needed.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {GARMENT_PRESETS.map((p) => {
                    const selected = p.id === selectedPresetId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPresetId(p.id)}
                        className={`group overflow-hidden rounded-2xl border text-left transition ${
                          selected
                            ? "border-accent/60 bg-accent/10"
                            : "border-surface-border bg-transparent hover:border-zinc-600 hover:bg-surface-raised/30"
                        }`}
                        disabled={loading || compressing !== null}
                      >
                        <div className="aspect-[4/3] bg-black/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="mt-1 text-xs font-semibold text-zinc-300">{p.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {compressing === "garment" && (
                  <p className="mt-3 text-xs text-zinc-500">Preparing preset garment…</p>
                )}
              </div>

              <p className="rounded-2xl border border-surface-border bg-surface-raised/30 p-4 text-xs text-zinc-500">
                Try-on uses Fashn <span className="font-semibold text-zinc-300">balanced</span> mode.
                {selectedPreset?.id === "sneakers"
                  ? " Sneakers use category shoes (tryon-v2); shirts and jackets use tops."
                  : ""}
              </p>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || compressing !== null}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white shadow-[0_0_48px_-12px_rgba(124,92,255,0.45)] transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {compressing !== null
                  ? "Preparing images…"
                  : loading
                    ? "Generating try-on…"
                    : "Generate try-on"}
              </button>

              <p className="text-xs text-zinc-500">
                Tip: keep uploads under ~4–6MB for smoother requests.
              </p>
            </form>
          </div>

          <div className="flex-1">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-surface-border bg-surface-raised/20 p-4">
                <p className="text-sm font-medium text-white">Inputs</p>
                <div className="mt-4 grid gap-4">
                  <div className="overflow-hidden rounded-xl border border-surface-border bg-zinc-950/40">
                    <div className="border-b border-surface-border px-3 py-2 text-xs text-zinc-500">
                      Person
                    </div>
                    <div className="aspect-[4/3] bg-black/30">
                      {modelPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={modelPreview}
                          alt="Person preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                          No image selected
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-surface-border bg-zinc-950/40">
                    <div className="border-b border-surface-border px-3 py-2 text-xs text-zinc-500">
                      {selectedPreset?.id === "sneakers" ? "Shoes" : "Garment"}
                    </div>
                    <div className="aspect-[4/3] bg-black/30">
                      {garmentPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={garmentPreview}
                          alt="Garment preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                          Select a sample product
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface-raised/20 p-4">
                <p className="text-sm font-medium text-white">Result</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-surface-border bg-zinc-950/40">
                  <div className="border-b border-surface-border px-3 py-2 text-xs text-zinc-500">
                    Try-on output
                  </div>
                  <div className="aspect-[4/3] bg-black/30">
                    {result ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result}
                        alt="Try-on result"
                        className="h-full w-full object-contain"
                      />
                    ) : loading ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-accent" />
                        <p className="text-sm text-zinc-400">Running try-on…</p>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                        Upload inputs and generate
                      </div>
                    )}
                  </div>
                </div>

                {result && (
                  <div className="mt-4 flex gap-3">
                    <a
                      href={result}
                      download
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-surface-border bg-transparent text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-surface-raised"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-muted"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="mt-6 rounded-2xl border border-surface-border bg-surface-raised/20 p-4">
                <p className="text-sm font-medium text-white">Full preview</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Fit-to-screen preview (no cropping). Use Download for full resolution.
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-surface-border bg-zinc-950/40">
                  <div className="border-b border-surface-border px-3 py-2 text-xs text-zinc-500">
                    Full-body view
                  </div>
                  <div className="flex max-h-[70vh] min-h-[420px] items-center justify-center bg-black/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result}
                      alt="Try-on result (full preview)"
                      className="max-h-[68vh] w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-surface-border bg-surface-raised/20 p-6">
              <p className="text-sm font-semibold text-white">Security note</p>
              <p className="mt-2 text-sm text-zinc-400">
                Your API key never reaches the browser—uploads are sent to your server route, which
                calls FASHN using <span className="text-zinc-200">process.env.FASHN_API_KEY</span>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

