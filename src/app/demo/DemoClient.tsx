"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Echoed from FormData; Try-On Max infers product type from images (no Fashn `category` param). */
type GarmentCategoryHint = "tops" | "shoes" | "bottoms";

type TryOnResponse =
  | { id: string; output: string[]; category?: GarmentCategoryHint }
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
  id: "sneakers" | "tee" | "sweater" | "jacket" | "jacket_leather" | "jeans";
  label: string;
  name: string;
  /** Hint for `/api/try-on` (echoed in JSON); maps to sneakers → shoes, apparel → tops */
  category: GarmentCategoryHint;
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
  {
    id: "jacket_leather",
    label: "Leather jacket",
    name: "Black leather jacket (flat lay, no model)",
    category: "tops",
    // Lea Øchel — black leather zip-up on white textile (product / flat lay).
    imageUrl:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "jeans",
    label: "Blue jeans",
    name: "Blue denim jeans (flat lay, no model)",
    category: "bottoms",
    // TuanAnh Blue — pair of blue jeans on a box (product-style denim).
    imageUrl:
      "https://images.unsplash.com/photo-1714143136361-386dae5672e2?auto=format&fit=crop&w=1400&q=80",
  },
];

/** Matches `public/widget.js` injectStyles (Wear Me + modal) for pixel-consistent /demo modal. */
const DEMO_WEAR_MODAL_STYLE_ID = "disqant-demo-wear-modal-style";
const DEMO_WEAR_MODAL_CSS =
  ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}" +
  ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}" +
  ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:2147483646;display:flex;align-items:center;pointer-events:auto;}" +
  ".dq-wear-btn{position:relative;appearance:none;border:0;cursor:pointer;padding:10px 14px;border-radius:999px;color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.2px;background:linear-gradient(135deg,#7c5cff 0%,#ff5ca8 55%,#ffb84a 100%);box-shadow:0 16px 34px rgba(124,92,255,.24),0 12px 30px rgba(255,92,168,.18);transform:translateY(0) scale(1);transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;}" +
  ".dq-wear-btn:hover{transform:translateY(-2px) scale(1.03);filter:saturate(1.08);box-shadow:0 22px 44px rgba(124,92,255,.26),0 18px 36px rgba(255,92,168,.22);}" +
  ".dq-wear-btn:active{transform:translateY(-1px) scale(.99);}" +
  ".dq-wear-btn::after{content:\"\";position:absolute;inset:-2px;border-radius:999px;opacity:0;box-shadow:0 0 0 0 rgba(255,184,74,.38);transition:opacity .18s ease;}" +
  ".dq-wear-btn:hover::after{opacity:1;animation:dq-pulse 1.35s ease-out infinite;}" +
  "@keyframes dq-pulse{0%{box-shadow:0 0 0 0 rgba(255,184,74,.32)}100%{box-shadow:0 0 0 16px rgba(255,184,74,0)}}" +
  ".dq-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,14,.55);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .18s ease;}" +
  ".dq-backdrop.dq-open{opacity:1;}" +
  ".dq-modal{width:min(720px,100%);max-height:90vh;background:#fff;border:1px solid rgba(15,15,20,.08);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.30);display:flex;flex-direction:column;transform:translateY(10px) scale(.985);opacity:0;transition:transform .18s ease, opacity .18s ease;}" +
  ".dq-backdrop.dq-open .dq-modal{transform:translateY(0) scale(1);opacity:1;}" +
  ".dq-backdrop.dq-closing{opacity:0;}" +
  ".dq-backdrop.dq-closing .dq-modal{transform:translateY(10px) scale(.985);opacity:0;}" +
  ".dq-head{display:flex;align-items:center;justify-content:space-between;padding:12px 12px;border-bottom:1px solid rgba(15,15,20,.08);background:#fff;}" +
  ".dq-head-title{font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.25px;color:#0f0f14;}" +
  ".dq-x{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;border-radius:12px;padding:8px 10px;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.08);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-x:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(0,0,0,.10);}" +
  ".dq-body{padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto;-webkit-overflow-scrolling:touch;}" +
  ".dq-stage{position:relative;width:100%;height:min(72vh,560px);border-radius:18px;border:1px solid rgba(15,15,20,.10);background:linear-gradient(180deg,#ffffff,#fbfbfd);box-shadow:0 18px 50px rgba(0,0,0,.08);overflow:hidden;}" +
  ".dq-stage img{width:100%;height:100%;display:block;background:#fff;object-fit:contain;object-position:center center;}" +
  ".dq-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(15,15,20,.55);text-align:center;padding:18px;}" +
  ".dq-empty strong{color:#0f0f14;font:900 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-empty span{font:600 12px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}" +
  ".dq-processing{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:4;background:rgba(255,255,255,.62);backdrop-filter:blur(8px);}" +
  ".dq-processing.is-on{display:flex;}" +
  ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);border-top-color:#7c5cff;animation:dqspin 1s linear infinite;}" +
  "@keyframes dqspin{to{transform:rotate(360deg);}}" +
  ".dq-processing-text{font:900 13px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;text-align:center;max-width:420px;padding:0 14px;}" +
  ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;border-radius:999px;background:rgba(15,15,20,.10);overflow:hidden;display:none;}" +
  ".dq-progress.is-on{display:block;}" +
  ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#7c5cff,#ff5ca8,#ffb84a);transition:width .12s ease;}" +
  ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}" +
  ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}" +
  ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:16px;padding:12px 12px;background:linear-gradient(135deg,#7c5cff,#ff5ca8);color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 16px 34px rgba(124,92,255,.20),0 12px 30px rgba(255,92,168,.14);transition:transform .16s ease, filter .16s ease, box-shadow .16s ease;}" +
  ".dq-primary:hover{transform:translateY(-1px) scale(1.01);filter:saturate(1.05);}" +
  ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}" +
  ".dq-save{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;cursor:pointer;border-radius:16px;padding:12px 12px;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-save:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-brand{padding:12px 12px;border-top:1px solid rgba(15,15,20,.08);display:flex;align-items:center;justify-content:flex-start;background:#fff;}" +
  ".dq-brand span{font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;letter-spacing:.25px;}" +
  ".dq-brand small{margin-left:8px;font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);}" +
  "@media (max-width:420px){.dq-body{padding:10px}.dq-stage{height:min(74vh,520px)}.dq-choice{min-width:100%}}";

function DqIconGallery() {
  return (
    <span className="dq-ico">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M9 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="m5.5 18 5-5 3.2 3.2 2-2L20 18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function DqIconCamera() {
  return (
    <span className="dq-ico">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M7 7h2l1.2-2h3.6L15 7h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

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

  const [wearOpen, setWearOpen] = useState(false);
  const [wearBackdropOpen, setWearBackdropOpen] = useState(false);
  const [wearClosing, setWearClosing] = useState(false);
  const [wearPreset, setWearPreset] = useState<GarmentPreset | null>(null);
  const [wearStageUrl, setWearStageUrl] = useState<string | null>(null);
  const [wearHasPhoto, setWearHasPhoto] = useState(false);
  const [wearModelFile, setWearModelFile] = useState<File | null>(null);
  const [wearGarmentFile, setWearGarmentFile] = useState<File | null>(null);
  const [wearGarmentLoading, setWearGarmentLoading] = useState(false);
  const [wearProcessing, setWearProcessing] = useState(false);
  const [wearProgressPct, setWearProgressPct] = useState(0);
  const [wearShowProgress, setWearShowProgress] = useState(false);
  const [wearSaveVisible, setWearSaveVisible] = useState(false);
  const [wearShowVideo, setWearShowVideo] = useState(false);
  const [wearGenerating, setWearGenerating] = useState(false);
  const [wearError, setWearError] = useState<string | null>(null);

  const wearGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const wearVideoRef = useRef<HTMLVideoElement | null>(null);
  const wearStreamRef = useRef<MediaStream | null>(null);
  const wearProgressTimerRef = useRef<number | null>(null);
  const wearStageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    wearStageUrlRef.current = wearStageUrl;
  }, [wearStageUrl]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(DEMO_WEAR_MODAL_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = DEMO_WEAR_MODAL_STYLE_ID;
    el.textContent = DEMO_WEAR_MODAL_CSS;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    if (!wearOpen || wearClosing) return;
    const id = window.requestAnimationFrame(() => setWearBackdropOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, [wearOpen, wearClosing]);

  const stopWearStream = useCallback(() => {
    const s = wearStreamRef.current;
    if (s) {
      try {
        s.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    }
    wearStreamRef.current = null;
    if (wearVideoRef.current) wearVideoRef.current.srcObject = null;
  }, []);

  const clearWearProgressTimer = useCallback(() => {
    if (wearProgressTimerRef.current != null) {
      window.clearInterval(wearProgressTimerRef.current);
      wearProgressTimerRef.current = null;
    }
  }, []);

  const closeWearModal = useCallback(() => {
    setWearClosing(true);
    setWearBackdropOpen(false);
    stopWearStream();
    clearWearProgressTimer();
    const snap = wearStageUrlRef.current;
    if (snap?.startsWith("blob:")) URL.revokeObjectURL(snap);
    window.setTimeout(() => {
      setWearOpen(false);
      setWearClosing(false);
      setWearPreset(null);
      setWearStageUrl(null);
      setWearHasPhoto(false);
      setWearModelFile(null);
      setWearGarmentFile(null);
      setWearGarmentLoading(false);
      setWearProcessing(false);
      setWearShowProgress(false);
      setWearProgressPct(0);
      setWearSaveVisible(false);
      setWearShowVideo(false);
      setWearGenerating(false);
      setWearError(null);
    }, 220);
  }, [clearWearProgressTimer, stopWearStream]);

  useEffect(() => {
    if (!wearOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeWearModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [wearOpen, closeWearModal]);

  const openWearMe = useCallback(
    (preset: GarmentPreset) => {
      const prev = wearStageUrlRef.current;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      stopWearStream();
      clearWearProgressTimer();
      setWearPreset(preset);
      setWearError(null);
      setWearSaveVisible(false);
      setWearModelFile(null);
      setWearGarmentFile(null);
      setWearStageUrl(null);
      setWearHasPhoto(false);
      setWearShowVideo(false);
      setWearProcessing(false);
      setWearShowProgress(false);
      setWearProgressPct(0);
      setWearGenerating(false);
      setWearBackdropOpen(false);
      setWearClosing(false);
      setWearOpen(true);
      setSelectedPresetId(preset.id);
      setWearGarmentLoading(true);
      void (async () => {
        try {
          const raw = await fetchUrlAsFile(preset.imageUrl, `${preset.id}.jpg`);
          const g = await compressImageToMax1000px(raw);
          setWearGarmentFile(g);
        } catch {
          setWearError("Could not load sample product image.");
        } finally {
          setWearGarmentLoading(false);
        }
      })();
    },
    [clearWearProgressTimer, stopWearStream],
  );

  const onWearGalleryPick = useCallback(
    (file: File | null) => {
      if (!file) return;
      setWearError(null);
      setWearSaveVisible(false);
      setWearModelFile(file);
      setWearStageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setWearHasPhoto(true);
    },
    [],
  );

  const onWearOpenCamera = useCallback(async () => {
    setWearError(null);
    try {
      stopWearStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      wearStreamRef.current = stream;
      if (wearVideoRef.current) wearVideoRef.current.srcObject = stream;
      setWearShowVideo(true);
    } catch {
      /* user may deny; gallery still works */
    }
  }, [stopWearStream]);

  const onWearCapturePhoto = useCallback(() => {
    const video = wearVideoRef.current;
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
        const f = new File([blob], "user.jpg", { type: blob.type || "image/jpeg" });
        stopWearStream();
        setWearShowVideo(false);
        onWearGalleryPick(f);
      },
      "image/jpeg",
      0.92,
    );
  }, [onWearGalleryPick, stopWearStream]);

  const startWearFakeProgress = useCallback(() => {
    clearWearProgressTimer();
    let pct = 0;
    wearProgressTimerRef.current = window.setInterval(() => {
      if (pct < 92) {
        pct += pct < 55 ? 6 : pct < 78 ? 3 : 1;
        pct = Math.min(92, pct);
        setWearProgressPct(pct);
      }
    }, 260);
  }, [clearWearProgressTimer]);

  const onWearGenerate = useCallback(async () => {
    if (!wearModelFile || !wearGarmentFile || !wearPreset) return;
    setWearError(null);
    setWearGenerating(true);
    setWearProcessing(true);
    setWearShowProgress(true);
    setWearProgressPct(0);
    setWearSaveVisible(false);
    startWearFakeProgress();
    try {
      const modelC = await compressImageToMax1000px(wearModelFile);
      const garmentC = await compressImageToMax1000px(wearGarmentFile);
      const fd = new FormData();
      fd.set("model", modelC);
      fd.set("garment", garmentC);
      fd.set("category", wearPreset.category);
      fd.set("generationMode", "balanced");
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: urlKey ? { "x-api-key": urlKey } : undefined,
        body: fd,
      });
      const data = (await res.json()) as TryOnResponse;
      clearWearProgressTimer();
      if (!res.ok) {
        const msg = "error" in data ? data.error : "Try-on failed.";
        setWearError(msg);
        setWearProcessing(false);
        setWearShowProgress(false);
        return;
      }
      const out = "output" in data ? data.output?.[0] : null;
      if (!out) {
        setWearError("No output returned.");
        setWearProcessing(false);
        setWearShowProgress(false);
        return;
      }
      setWearStageUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return out;
      });
      setWearHasPhoto(true);
      setWearProgressPct(100);
      window.setTimeout(() => {
        setWearProcessing(false);
        setWearShowProgress(false);
        setWearSaveVisible(true);
      }, 450);
    } catch (e) {
      clearWearProgressTimer();
      setWearError(e instanceof Error ? e.message : "Unexpected error.");
      setWearProcessing(false);
      setWearShowProgress(false);
    } finally {
      setWearGenerating(false);
    }
  }, [
    clearWearProgressTimer,
    startWearFakeProgress,
    urlKey,
    wearGarmentFile,
    wearModelFile,
    wearPreset,
  ]);

  const onWearDownload = useCallback(() => {
    if (!wearStageUrl) return;
    const a = document.createElement("a");
    a.href = wearStageUrl;
    a.download = "disqant-tryon.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [wearStageUrl]);

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
      fd.set("generationMode", "balanced");

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
      {wearOpen && (
        <div
          role="presentation"
          className={`dq-backdrop${wearBackdropOpen && !wearClosing ? " dq-open" : ""}${wearClosing ? " dq-closing" : ""}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeWearModal();
          }}
        >
          <div className="dq-modal" role="dialog" aria-modal="true" aria-label="Try on">
            <div className="dq-head">
              <div className="dq-head-title">Try On</div>
              <button type="button" className="dq-x" aria-label="Close" onClick={closeWearModal}>
                ✕
              </button>
            </div>

            <div className="dq-body">
              <div className="dq-stage">
                {!wearHasPhoto && !wearProcessing ? (
                  <div className="dq-empty">
                    <strong>Upload a full-body photo</strong>
                    <span>We’ll keep your full body visible (no cropping).</span>
                  </div>
                ) : null}
                {wearStageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wearStageUrl}
                    alt={wearSaveVisible ? "Try-on result" : "Preview"}
                    style={{ display: wearHasPhoto || wearProcessing ? "block" : "none" }}
                  />
                ) : null}

                <div className={`dq-processing${wearProcessing ? " is-on" : ""}`}>
                  <div className="dq-spin" />
                  <div className="dq-processing-text">This may take 20-30 seconds, please wait ✨</div>
                </div>

                <div className={`dq-progress${wearShowProgress ? " is-on" : ""}`}>
                  <span style={{ width: `${wearProgressPct}%` }} />
                </div>
              </div>

              <div className="dq-row">
                <button type="button" className="dq-choice" onClick={() => wearGalleryInputRef.current?.click()}>
                  <DqIconGallery />
                  Gallery
                </button>
                <button type="button" className="dq-choice" onClick={onWearOpenCamera}>
                  <DqIconCamera />
                  Camera
                </button>
              </div>

              <input
                ref={wearGalleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onWearGalleryPick(e.target.files?.[0] ?? null)}
              />

              {wearShowVideo ? (
                <div>
                  <video
                    ref={wearVideoRef}
                    autoPlay
                    playsInline
                    muted
                    title="Camera preview"
                    style={{
                      width: "100%",
                      borderRadius: "16px",
                      border: "1px solid rgba(15,15,20,.10)",
                      boxShadow: "0 18px 50px rgba(0,0,0,.08)",
                    }}
                  />
                  <div style={{ height: 10 }} />
                  <button type="button" className="dq-primary" onClick={onWearCapturePhoto}>
                    Capture photo
                  </button>
                </div>
              ) : null}

              {wearGarmentLoading ? (
                <p className="text-center text-xs text-zinc-500">Loading sample product…</p>
              ) : null}
              {wearError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700">
                  {wearError}
                </p>
              ) : null}

              <button
                type="button"
                className="dq-primary"
                disabled={
                  !wearModelFile ||
                  !wearGarmentFile ||
                  wearGarmentLoading ||
                  wearGenerating ||
                  wearProcessing
                }
                onClick={() => void onWearGenerate()}
              >
                Generate
              </button>

              {wearSaveVisible ? (
                <button type="button" className="dq-save" onClick={onWearDownload}>
                  ⬇️ Save Photo
                </button>
              ) : null}
            </div>

            <div className="dq-brand">
              <span>Disqant</span>
              <small>virtual try-on</small>
            </div>
          </div>
        </div>
      )}

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
                      <article
                        key={p.id}
                        className={`group overflow-hidden rounded-2xl border text-left transition ${
                          selected
                            ? "border-accent/60 bg-accent/10"
                            : "border-surface-border bg-transparent hover:border-zinc-600 hover:bg-surface-raised/30"
                        }`}
                      >
                        <div
                          role="presentation"
                          className="relative aspect-[4/3] cursor-pointer bg-black/30"
                          onClick={() => setSelectedPresetId(p.id)}
                        >
                          <button
                            type="button"
                            className="dq-wear-btn absolute bottom-3 right-3 z-20 shadow-lg"
                            aria-label="Wear Me"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openWearMe(p);
                            }}
                          >
                            Wear Me ✨
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        </div>
                        <div
                          role="presentation"
                          className="cursor-pointer p-4"
                          onClick={() => setSelectedPresetId(p.id)}
                        >
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="mt-1 text-xs font-semibold text-zinc-300">{p.label}</p>
                        </div>
                      </article>
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
                  ? " Sneakers → shoes hint; tops for shirt/sweater/jacket. Try-On Max uses product_image + model_image per Fashn docs."
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
                      {selectedPreset?.id === "sneakers"
                        ? "Shoes"
                        : selectedPreset?.id === "jeans"
                          ? "Jeans"
                          : "Garment"}
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

