"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type TryOnResponse =
  | { id: string; output: string[] }
  | { error: string };

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

export default function DemoClient() {
  const [model, setModel] = useState<File | null>(null);
  const [garment, setGarment] = useState<File | null>(null);
  const [tryOnType, setTryOnType] = useState<"clothing" | "shoes">("clothing");
  const [mode, setMode] = useState<"performance" | "balanced" | "quality">("balanced");
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg">("png");

  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState<null | "model" | "garment">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const modelCameraInputRef = useRef<HTMLInputElement | null>(null);
  const modelFileInputRef = useRef<HTMLInputElement | null>(null);

  const modelPreview = useMemo(() => (model ? URL.createObjectURL(model) : null), [model]);
  const garmentPreview = useMemo(() => (garment ? URL.createObjectURL(garment) : null), [garment]);

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

  async function setGarmentFromFile(file: File | null) {
    setError(null);
    setResult(null);
    if (!file) {
      setGarment(null);
      return;
    }
    setCompressing("garment");
    const compressed = await compressImageToMax1000px(file);
    setGarment(compressed);
    setCompressing(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!model || !garment) {
      setError("Please choose both a person photo and a garment image.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("model", model);
      fd.set("garment", garment);
      fd.set("tryOnType", tryOnType);
      fd.set("mode", mode);
      fd.set("outputFormat", outputFormat);
      fd.set("returnBase64", "true");

      const res = await fetch("/api/tryon", { method: "POST", body: fd });
      const data = (await res.json()) as TryOnResponse;

      if (!res.ok) {
        if ("error" in data && data.error === "Unauthorized.") {
          window.location.reload();
          return;
        }
        setError("error" in data ? data.error : "Try-on failed.");
        return;
      }

      if ("output" in data && data.output?.[0]) {
        setResult(data.output[0]);
      } else {
        setError("No output returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/demo-auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="min-h-dvh bg-surface">
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
              Upload a person photo and a garment image. We auto-compress to max 1000px before
              generating.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Try-on type</label>
                <p className="mt-1 text-xs text-zinc-500">
                  Clothing uses fast try-on. Shoes uses Try-On Max (slower, higher fidelity).
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTryOnType("clothing")}
                    className={`inline-flex h-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      tryOnType === "clothing"
                        ? "border-accent/60 bg-accent/15 text-white"
                        : "border-surface-border bg-transparent text-zinc-300 hover:border-zinc-600 hover:bg-surface-raised"
                    }`}
                    disabled={loading || compressing !== null}
                  >
                    Clothing
                  </button>
                  <button
                    type="button"
                    onClick={() => setTryOnType("shoes")}
                    className={`inline-flex h-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      tryOnType === "shoes"
                        ? "border-accent/60 bg-accent/15 text-white"
                        : "border-surface-border bg-transparent text-zinc-300 hover:border-zinc-600 hover:bg-surface-raised"
                    }`}
                    disabled={loading || compressing !== null}
                  >
                    Shoes
                  </button>
                </div>
              </div>

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
                <label className="block text-sm font-medium text-white">
                  {tryOnType === "shoes" ? "Shoe image" : "Garment image"}
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  {tryOnType === "shoes"
                    ? "Product-only shoe photos work best (side view, clean background). We auto-compress to max 1000px."
                    : "Flat-lay or mannequin photos are ideal. We auto-compress to max 1000px."}
                </p>
                <div className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setGarmentFromFile(e.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-200 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:border-zinc-700"
                  />
                  {garment && (
                    <p className="mt-2 text-xs text-zinc-500">
                      {garment.name} · {formatBytes(garment.size)}
                    </p>
                  )}
                  {compressing === "garment" && (
                    <p className="mt-2 text-xs text-zinc-500">Compressing garment image…</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                  <label className="block text-sm font-medium text-white">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) =>
                      setMode(e.target.value as "performance" | "balanced" | "quality")
                    }
                    className="mt-3 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700"
                  >
                    <option value="performance">performance</option>
                    <option value="balanced">balanced</option>
                    <option value="quality">quality</option>
                  </select>
                  <p className="mt-2 text-xs text-zinc-500">
                    {tryOnType === "shoes"
                      ? "Shoes uses Try-On Max; expect ~20–120s depending on load."
                      : "Quality takes longer (12–17s)."}
                  </p>
                </div>

                <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                  <label className="block text-sm font-medium text-white">Output format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as "png" | "jpeg")}
                    className="mt-3 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700"
                  >
                    <option value="png">png</option>
                    <option value="jpeg">jpeg</option>
                  </select>
                  <p className="mt-2 text-xs text-zinc-500">PNG is highest quality.</p>
                </div>
              </div>

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
                      Garment
                    </div>
                    <div className="aspect-[4/3] bg-black/30">
                      {garmentPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={garmentPreview}
                          alt="Garment preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                          No image selected
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

