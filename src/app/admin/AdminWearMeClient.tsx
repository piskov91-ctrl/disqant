"use client";

/**
 * Admin-only virtual try-on UI. Does not import demo routes, catalog, or DemoClient.
 * Calls `/api/tryon` with the retailer `x-api-key` from the admin key picker.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  compressImageToMax1000px,
  formatTryOnApiError,
  type TryOnResponse,
} from "@/lib/wearMeShared";

function revokeIfBlob(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function AdminWearMeClient({ apiKey }: { apiKey: string }) {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wearMenuOpen, setWearMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const modelUploadRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inFlightRef = useRef(false);
  const wearMenuRef = useRef<HTMLDivElement>(null);

  const setModelFromFile = useCallback((file: File) => {
    setModelFile(file);
    setModelPreview((prev) => {
      revokeIfBlob(prev);
      return URL.createObjectURL(file);
    });
    setResultUrl(null);
    setError(null);
  }, []);

  const setGarmentFromFile = useCallback((file: File) => {
    setGarmentFile(file);
    setGarmentPreview((prev) => {
      revokeIfBlob(prev);
      return URL.createObjectURL(file);
    });
    setResultUrl(null);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      revokeIfBlob(modelPreview);
      revokeIfBlob(garmentPreview);
    };
  }, [modelPreview, garmentPreview]);

  useEffect(() => {
    if (!wearMenuOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = wearMenuRef.current;
      if (el && !el.contains(e.target as Node)) setWearMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [wearMenuOpen]);

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      try {
        s.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const closeCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
  }, [stopStream]);

  useLayoutEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => {
      /* autoplay policy */
    });
  }, [cameraOpen]);

  const openCamera = useCallback(async () => {
    setWearMenuOpen(false);
    setError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError("Camera not available. Use upload instead.");
    }
  }, [stopStream]);

  const onCapturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], "person.jpg", { type: blob.type || "image/jpeg" });
        closeCamera();
        setModelFromFile(f);
      },
      "image/jpeg",
      0.92,
    );
  }, [closeCamera, setModelFromFile]);

  const onGenerate = useCallback(async () => {
    if (!modelFile || !garmentFile || inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    setLoading(true);
    setResultUrl(null);
    try {
      const modelC = await compressImageToMax1000px(modelFile);
      const garmentC = await compressImageToMax1000px(garmentFile);
      const fd = new FormData();
      fd.set("model", modelC);
      fd.set("garment", garmentC);
      fd.set("category", "tops");
      fd.set("generationMode", "balanced");
      const traceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
      const tryOnTrace = `admin-wear-${traceId}`;
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "x-tryon-trace": tryOnTrace,
        },
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as TryOnResponse;
      if (!res.ok) {
        if (res.status === 402) {
          setError("Try-on is temporarily unavailable for this account.");
          return;
        }
        if (res.status === 403 && "code" in data && data.code === "USAGE_LIMIT") {
          const kind = "limitMessageKind" in data ? data.limitMessageKind : undefined;
          setError(
            kind === "promotional"
              ? "Wear Me is temporarily unavailable. Please check back soon!"
              : "Wear Me is temporarily unavailable.",
          );
          return;
        }
        const msg = "error" in data ? formatTryOnApiError((data as { error?: unknown }).error) : "Try-on failed.";
        setError(msg);
        return;
      }
      const out = "output" in data ? data.output?.[0] : null;
      if (!out) {
        setError("No output returned.");
        return;
      }
      setResultUrl(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [apiKey, garmentFile, modelFile]);

  const canGenerate = Boolean(modelFile && garmentFile && !loading);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="relative" ref={wearMenuRef}>
          <button
            type="button"
            onClick={() => setWearMenuOpen((o) => !o)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
          >
            Wear Me
          </button>
          {wearMenuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              <button
                type="button"
                onClick={() => void openCamera()}
                className="block w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Use camera
              </button>
              <button
                type="button"
                onClick={() => {
                  setWearMenuOpen(false);
                  modelUploadRef.current?.click();
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Upload photo
              </button>
            </div>
          ) : null}
          <input
            ref={modelUploadRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setModelFromFile(f);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-200">Garment image</label>
          <input
            ref={garmentInputRef}
            type="file"
            accept="image/*"
            className="mt-2 block w-full max-w-xs text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:border-zinc-500"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setGarmentFromFile(f);
            }}
          />
        </div>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void onGenerate()}
          className="btn-accent-gradient h-11 px-8 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {(modelPreview || garmentPreview) && (
        <div className="flex flex-wrap gap-4">
          {modelPreview ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Person</p>
              <img
                src={modelPreview}
                alt=""
                className="h-32 w-24 rounded-lg border border-zinc-700 object-cover sm:h-40 sm:w-32"
              />
            </div>
          ) : null}
          {garmentPreview ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Garment</p>
              <img
                src={garmentPreview}
                alt=""
                className="h-32 w-24 rounded-lg border border-zinc-700 object-cover sm:h-40 sm:w-32"
              />
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Result</p>
        {loading ? (
          <div className="flex h-48 max-w-md items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/50 text-sm text-zinc-500">
            Generating…
          </div>
        ) : resultUrl ? (
          <img
            src={resultUrl}
            alt="Try-on result"
            className="max-h-[min(70vh,560px)] max-w-full rounded-xl border border-zinc-700 object-contain"
          />
        ) : (
          <div className="flex h-48 max-w-md items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 text-sm text-zinc-500">
            Output appears here after you generate.
          </div>
        )}
      </div>

      {cameraOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-100">Take person photo</p>
            </div>
            <div className="p-4">
              <video ref={videoRef} className="aspect-[3/4] w-full rounded-lg bg-black object-cover" playsInline muted />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="rounded-full border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onCapturePhoto}
                  className="btn-accent-gradient px-5 py-2 text-sm"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
