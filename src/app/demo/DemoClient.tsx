"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, SwitchCamera } from "lucide-react";
import {
  DEMO_CATALOG,
  GARMENT_PRESETS,
  PRESET_BY_ID,
  PRESET_ID_SET,
  catalogIdFromHistoryState,
  cloneHistoryStatePatch,
  type DemoCatalogId,
  type GarmentPreset,
  wearCameraFromHistoryState,
  wearModalFromHistoryState,
  wearPresetIdFromHistoryState,
  wearTryOnPopCount,
} from "@/app/demo/demoGarments";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  DEMO_WEAR_MODAL_CSS,
  DEMO_WEAR_MODAL_STYLE_ID,
  DqIconCamera,
  DqIconGallery,
  WEAR_LOADING_MESSAGES,
  compressImageToMax1000px,
  fetchImageBlobFromUrl,
  fetchUrlAsFile,
  formatTryOnApiError,
  type TryOnResponse,
} from "@/lib/wearMeShared";

export default function DemoClient() {
  const pathname = usePathname();
  const [urlKey, setUrlKey] = useState<string | null>(null);

  const [selectedPresetId, setSelectedPresetId] = useState<GarmentPreset["id"]>(
    GARMENT_PRESETS[0]?.id ?? "tee",
  );
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [openCatalog, setOpenCatalog] = useState<DemoCatalogId | null>(null);

  const openProductCatalog = useCallback((id: DemoCatalogId) => {
    setOpenCatalog(id);
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.search;
    window.history.pushState({ demoCatalog: id }, "", path);
  }, []);

  const backToProductCategories = useCallback(() => {
    if (typeof window === "undefined") {
      setOpenCatalog(null);
      return;
    }
    if (catalogIdFromHistoryState(window.history.state) != null) {
      window.history.back();
    } else {
      setOpenCatalog(null);
    }
  }, []);

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
  const [wearCameraFacing, setWearCameraFacing] = useState<"user" | "environment">("user");
  const [wearFlippingCamera, setWearFlippingCamera] = useState(false);
  const [wearGenerating, setWearGenerating] = useState(false);
  const [wearError, setWearError] = useState<string | null>(null);
  const [wearLoadingMsgIndex, setWearLoadingMsgIndex] = useState(0);
  /** Prefetched when the result URL is ready — faster / more reliable save and Web Share. */
  const [wearResultBlob, setWearResultBlob] = useState<Blob | null>(null);
  const [wearSaveLoading, setWearSaveLoading] = useState(false);

  const wearGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const wearVideoRef = useRef<HTMLVideoElement | null>(null);
  const wearStreamRef = useRef<MediaStream | null>(null);
  const wearProgressTimerRef = useRef<number | null>(null);
  const wearStageUrlRef = useRef<string | null>(null);
  /** Sync guard: `wearGenerating` updates after render, so double-clicks can fire two `/api/tryon` → two Fashn /run. */
  const wearTryOnInFlightRef = useRef(false);
  /** Avoid refetching the sample garment on every popstate when the same preset is already loaded. */
  const wearLoadedPresetIdRef = useRef<GarmentPreset["id"] | null>(null);

  /** Admin analytics: one demo page visit per load (debounce shields React Strict Mode double-mount in dev). */
  useEffect(() => {
    const key = "fit-room_demo_visit_last_beacon_ms";
    const now = Date.now();
    try {
      const prev = Number(sessionStorage.getItem(key) ?? "0");
      if (now - prev < 800) return;
      sessionStorage.setItem(key, String(now));
    } catch {
      /* ignore */
    }
    void fetch("/api/demo-visit", { method: "POST" }).catch(() => {});
  }, []);

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

  // Rotate friendly status copy while the API request is running.
  useEffect(() => {
    if (!wearProcessing) {
      setWearLoadingMsgIndex(0);
      return;
    }
    setWearLoadingMsgIndex(0);
    const ms = 3200;
    const id = window.setInterval(() => {
      setWearLoadingMsgIndex((i) => (i + 1) % WEAR_LOADING_MESSAGES.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [wearProcessing]);

  // Lock page scroll while the try-on modal is open (remains through close animation until `wearOpen` is false).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!wearOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      html: html.style.overflow,
      body: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      html.style.overscrollBehavior = prev.htmlOverscroll;
    };
  }, [wearOpen]);

  // `<video>` is not mounted until `wearShowVideo` is true, so after `getUserMedia` the ref is often still null
  // on the first open. Attach the pending stream once the preview is in the tree.
  useLayoutEffect(() => {
    if (!wearShowVideo) return;
    const video = wearVideoRef.current;
    const stream = wearStreamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    void video.play().catch(() => {
      /* autoplay may be blocked; user interaction already occurred */
    });
  }, [wearShowVideo]);

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

  const applyDemoPopState = useCallback(
    (state: unknown) => {
      const cat = catalogIdFromHistoryState(state);
      setOpenCatalog(cat);

      const cam = wearCameraFromHistoryState(state);
      const modal = wearModalFromHistoryState(state);
      const pid = wearPresetIdFromHistoryState(state);
      const preset = pid ? (PRESET_BY_ID[pid] ?? null) : null;

      if (!modal || !preset) {
        wearLoadedPresetIdRef.current = null;
        stopWearStream();
        setWearShowVideo(false);
        clearWearProgressTimer();
        const snap = wearStageUrlRef.current;
        if (snap?.startsWith("blob:")) URL.revokeObjectURL(snap);
        setWearBackdropOpen(false);
        setWearClosing(false);
        setWearOpen(false);
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
        setWearGenerating(false);
        setWearError(null);
        setWearResultBlob(null);
        setWearCameraFacing("user");
        setWearFlippingCamera(false);
        wearTryOnInFlightRef.current = false;
        return;
      }

      setWearOpen(true);
      setWearClosing(false);
      setWearPreset(preset);
      setSelectedPresetId(preset.id);
      setWearShowVideo(cam);
      if (!cam) stopWearStream();
      setWearError(null);
      void window.requestAnimationFrame(() => setWearBackdropOpen(true));

      if (wearLoadedPresetIdRef.current !== preset.id) {
        wearLoadedPresetIdRef.current = preset.id;
        setWearGarmentLoading(true);
        void (async () => {
          try {
            const raw = await fetchUrlAsFile(preset.imageUrl, `${preset.id}.jpg`);
            const g = await compressImageToMax1000px(raw);
            setWearGarmentFile(g);
          } catch {
            setWearError("Could not load sample product image.");
            wearLoadedPresetIdRef.current = null;
          } finally {
            setWearGarmentLoading(false);
          }
        })();
      }
    },
    [clearWearProgressTimer, stopWearStream],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("key");
    setUrlKey(raw?.trim() || null);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = (e: PopStateEvent) => {
      const raw = new URLSearchParams(window.location.search).get("key");
      setUrlKey(raw?.trim() || null);
      applyDemoPopState(e.state);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyDemoPopState]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    applyDemoPopState(window.history.state);
  }, [applyDemoPopState]);

  const closeWearModal = useCallback(() => {
    if (typeof window !== "undefined") {
      const pops = wearTryOnPopCount(window.history.state);
      if (pops > 0) {
        window.history.go(-pops);
        return;
      }
    }
    setWearClosing(true);
    setWearBackdropOpen(false);
    setWearCameraFacing("user");
    setWearFlippingCamera(false);
    stopWearStream();
    clearWearProgressTimer();
    const snap = wearStageUrlRef.current;
    if (snap?.startsWith("blob:")) URL.revokeObjectURL(snap);
    window.setTimeout(() => {
      setWearOpen(false);
      setWearClosing(false);
      wearLoadedPresetIdRef.current = null;
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
      setWearResultBlob(null);
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
      wearLoadedPresetIdRef.current = null;
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
      setWearCameraFacing("user");
      setWearFlippingCamera(false);
      setWearResultBlob(null);
      setSelectedPresetId(preset.id);
      setWearGarmentLoading(true);
      void (async () => {
        try {
          const raw = await fetchUrlAsFile(preset.imageUrl, `${preset.id}.jpg`);
          const g = await compressImageToMax1000px(raw);
          setWearGarmentFile(g);
          wearLoadedPresetIdRef.current = preset.id;
        } catch {
          setWearError("Could not load sample product image.");
          wearLoadedPresetIdRef.current = null;
        } finally {
          setWearGarmentLoading(false);
        }
      })();

      if (typeof window !== "undefined" && openCatalog) {
        const path = window.location.pathname + window.location.search;
        const cur = cloneHistoryStatePatch(window.history.state);
        const next: Record<string, unknown> = {
          ...cur,
          demoCatalog: openCatalog,
          wearModal: true,
          wearPresetId: preset.id,
        };
        delete next.wearCamera;
        const st = window.history.state;
        const replace = wearModalFromHistoryState(st) && !wearCameraFromHistoryState(st);
        if (replace) {
          window.history.replaceState(next, "", path);
        } else {
          window.history.pushState(next, "", path);
        }
      }
    },
    [clearWearProgressTimer, openCatalog, stopWearStream],
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
        video: { facingMode: { ideal: wearCameraFacing } },
        audio: false,
      });
      wearStreamRef.current = stream;
      if (wearVideoRef.current) {
        wearVideoRef.current.srcObject = stream;
        void wearVideoRef.current.play();
      }
      setWearShowVideo(true);
      if (typeof window !== "undefined" && !wearCameraFromHistoryState(window.history.state)) {
        const path = window.location.pathname + window.location.search;
        const cur = cloneHistoryStatePatch(window.history.state);
        const next: Record<string, unknown> = { ...cur, wearCamera: true, wearModal: true };
        if (openCatalog) next.demoCatalog = openCatalog;
        if (wearPreset) next.wearPresetId = wearPreset.id;
        window.history.pushState(next, "", path);
      }
    } catch {
      /* user may deny; gallery still works */
    }
  }, [stopWearStream, wearCameraFacing, openCatalog, wearPreset]);

  const onWearFlipCamera = useCallback(async () => {
    if (!wearShowVideo) return;
    setWearError(null);
    const previous = wearCameraFacing;
    const next: "user" | "environment" = previous === "user" ? "environment" : "user";
    setWearFlippingCamera(true);
    try {
      stopWearStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next } },
        audio: false,
      });
      wearStreamRef.current = stream;
      if (wearVideoRef.current) {
        wearVideoRef.current.srcObject = stream;
        void wearVideoRef.current.play();
      }
      setWearCameraFacing(next);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: previous } },
          audio: false,
        });
        wearStreamRef.current = stream;
        if (wearVideoRef.current) {
          wearVideoRef.current.srcObject = stream;
          void wearVideoRef.current.play();
        }
      } catch {
        setWearError("Could not switch camera. Try again or use Gallery.");
      }
    } finally {
      setWearFlippingCamera(false);
    }
  }, [wearShowVideo, wearCameraFacing, stopWearStream]);

  const onWearCameraBack = useCallback(() => {
    if (typeof window !== "undefined" && wearCameraFromHistoryState(window.history.state)) {
      stopWearStream();
      setWearShowVideo(false);
      window.history.back();
    } else {
      stopWearStream();
      setWearShowVideo(false);
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
        if (typeof window !== "undefined" && wearCameraFromHistoryState(window.history.state)) {
          window.history.back();
        }
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
    if (wearTryOnInFlightRef.current) return;
    wearTryOnInFlightRef.current = true;
    setWearError(null);
    setWearGenerating(true);
    setWearResultBlob(null);
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
      fd.set("productImageUrl", wearPreset.imageUrl);
      fd.set("category", wearPreset.category);
      fd.set("generationMode", "balanced");
      const tryOnTrace = globalThis.crypto?.randomUUID?.() ?? `tryon-${Date.now()}-${Math.random()}`;
      const reqHeaders: Record<string, string> = { "x-tryon-trace": tryOnTrace };
      if (urlKey) reqHeaders["x-api-key"] = urlKey;
      console.log(
        "[fit-room] browser: about to fetch POST /api/tryon (one successful log per try-on; if you see 2+ per click, the client is firing more than one request before the in-flight ref blocks it)",
        { tryOnTrace },
      );
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: reqHeaders,
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as TryOnResponse;
      clearWearProgressTimer();
      if (!res.ok) {
        if (res.status === 402) {
          setShowUnavailableModal(true);
          setWearProcessing(false);
          setWearShowProgress(false);
          return;
        }
        if (res.status === 403 && "code" in data && data.code === "USAGE_LIMIT") {
          setWearError("Wear Me is temporarily unavailable. Please try again later.");
          setWearProcessing(false);
          setWearShowProgress(false);
          return;
        }
        const msg = "error" in data ? formatTryOnApiError((data as { error?: unknown }).error) : "Try-on failed.";
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
      setWearResultBlob(null);
      void (async () => {
        try {
          const b = await fetchImageBlobFromUrl(out);
          setWearResultBlob(b);
        } catch {
          /* Save flow will try again on action; CORS or transient network. */
        }
      })();
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
      wearTryOnInFlightRef.current = false;
    }
  }, [
    clearWearProgressTimer,
    startWearFakeProgress,
    urlKey,
    wearGarmentFile,
    wearModelFile,
    wearPreset,
  ]);

  /** Triggers a direct file download (blob + `a[download]`) — no share sheet or extra menus. */
  const onWearSaveToGallery = useCallback(async () => {
    if (!wearStageUrl) return;
    setWearSaveLoading(true);
    setWearError(null);
    try {
      let blob = wearResultBlob;
      if (!blob) {
        blob = await fetchImageBlobFromUrl(wearStageUrl);
        setWearResultBlob(blob);
      }
      const ext = blob.type?.includes("png") ? "png" : "jpeg";
      const fileName = `fit-room-tryon.${ext}`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      setWearError("Could not save the image. Check your connection and try again.");
    } finally {
      setWearSaveLoading(false);
    }
  }, [wearStageUrl, wearResultBlob]);

  const openCatalogDef = useMemo(
    () => (openCatalog ? (DEMO_CATALOG.find((c) => c.id === openCatalog) ?? null) : null),
    [openCatalog],
  );

  const visiblePresets = useMemo((): GarmentPreset[] => {
    if (!openCatalogDef) return [];
    return openCatalogDef.presetIds.map((id) => PRESET_BY_ID[id]!);
  }, [openCatalogDef]);

  useEffect(() => {
    if (!openCatalogDef) return;
    if (!openCatalogDef.presetIds.includes(selectedPresetId)) {
      setSelectedPresetId(openCatalogDef.presetIds[0]!);
    }
  }, [openCatalogDef, openCatalog, selectedPresetId]);

  return (
    <div className="relative min-h-dvh text-[#F5EDE4]">
      {/*
        Full-page backdrop comes from root layout <SiteBackground /> (fittingroom.png + dark gradient).
        No opaque page bg here so the fitting-room photo reads through like the home page.
      */}
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

                <div className={`dq-processing${wearProcessing ? " is-on" : ""}`} aria-busy={wearProcessing}>
                  <div className="dq-processing-inner">
                    <div className="dq-spin" aria-hidden />
                    <div
                      key={wearLoadingMsgIndex}
                      className="dq-processing-text dq-processing-msg"
                      role="status"
                      aria-live="polite"
                    >
                      {WEAR_LOADING_MESSAGES[wearLoadingMsgIndex] ?? WEAR_LOADING_MESSAGES[0]}
                    </div>
                  </div>
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
                  <div className="dq-cam-row">
                    <button
                      type="button"
                      className="dq-flip"
                      onClick={onWearCameraBack}
                      disabled={wearFlippingCamera}
                      aria-label="Back to try-on"
                      title="Back"
                    >
                      <ChevronLeft className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      className="dq-flip"
                      onClick={() => void onWearFlipCamera()}
                      disabled={wearFlippingCamera}
                      aria-label={
                        wearCameraFacing === "user"
                          ? "Switch to back camera"
                          : "Switch to front camera"
                      }
                      title={
                        wearCameraFacing === "user"
                          ? "Use back camera"
                          : "Use front camera"
                      }
                    >
                      <SwitchCamera
                        className="h-5 w-5 shrink-0 opacity-90"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>Flip</span>
                    </button>
                    <button
                      type="button"
                      className="dq-primary"
                      onClick={onWearCapturePhoto}
                      disabled={wearFlippingCamera}
                    >
                      Capture photo
                    </button>
                  </div>
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
                <button
                  type="button"
                  className="dq-primary"
                  onClick={() => void onWearSaveToGallery()}
                  disabled={wearSaveLoading}
                  aria-busy={wearSaveLoading}
                  title="Downloads the try-on image to your device (e.g. Downloads or your default save location)"
                >
                  {wearSaveLoading ? "Saving…" : "Download image"}
                </button>
              ) : null}
            </div>

            <div className="dq-brand">
              <span>Fit Room</span>
              <small>virtual try-on</small>
            </div>
          </div>
        </div>
      )}

      {showUnavailableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unavailable-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl shadow-zinc-200/80">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl text-amber-700">
                ⚠️
              </div>
              <div className="min-w-0">
                <p id="unavailable-title" className="text-base font-semibold text-zinc-900">
                  Virtual try-on temporarily unavailable
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Please try again later or contact support.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUnavailableModal(false)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] px-5 text-sm font-semibold text-white shadow-accent-glow transition hover:opacity-[0.96]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-12 pt-[60px] md:pb-16">
        <div className="min-w-0">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
            Virtual try-on demo
          </h1>
          <p className="mt-4 text-[#F5EDE4]/75">
            Tap <span className="font-semibold text-[#F5EDE4]">Wear Me</span> on a sample product, then upload your
            photo in the modal (gallery or camera), generate, and download your try-on.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#C6A77D]/25 bg-[#2C241F]/88 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          {!openCatalog ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#C6A77D]">Product catalog</p>
              <p className="mt-1 text-xs text-[#F5EDE4]/65">Choose a category, then pick a product to try on.</p>
              <ul
                className="mt-6 grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                role="list"
              >
                {DEMO_CATALOG.map((cat) => {
                  const Icon = cat.Icon;
                  return (
                    <li key={cat.id} className="w-full">
                      <button
                        type="button"
                        onClick={() => openProductCatalog(cat.id)}
                        aria-label={`View ${cat.title}`}
                        className="group relative flex min-h-[280px] w-full flex-col items-center rounded-2xl border border-[#C6A77D]/22 bg-[#2C241F]/48 px-6 pb-8 pt-10 text-center shadow-[0_14px_44px_rgba(0,0,0,0.32)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:scale-[1.035] hover:border-[#C6A77D] hover:bg-[#2C241F]/68 hover:shadow-[0_22px_60px_rgba(0,0,0,0.42),0_0_44px_-10px_rgba(198,167,125,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A77D]/65 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1512] active:scale-[1.02]"
                      >
                        <span className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full bg-[#1a1614]/85 text-[#C6A77D] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-[#C6A77D]/20 transition-[box-shadow,transform,ring-color] duration-500 ease-out group-hover:ring-[#C6A77D]/55 group-hover:shadow-[0_0_36px_-10px_rgba(198,167,125,0.55)]">
                          <Icon
                            className="h-[2.65rem] w-[2.65rem] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                            strokeWidth={1.15}
                            aria-hidden
                          />
                        </span>
                        <p className="mt-9 font-serif text-[1.5rem] font-normal leading-[1.15] tracking-[0.06em] text-[#F5EDE4] md:text-[1.625rem] md:tracking-[0.08em]">
                          {cat.title}
                        </p>
                        <p className="mt-3 max-w-[15rem] text-[11px] font-normal leading-relaxed text-[#F5EDE4]/50 md:text-xs md:leading-relaxed">
                          {cat.line}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={backToProductCategories}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C6A77D]/40 bg-[#231e1a]/95 px-3 py-1.5 text-sm font-medium text-[#F5EDE4] shadow-sm transition-all duration-300 hover:border-[#C6A77D] hover:bg-[#2C241F] hover:shadow-[0_0_24px_-8px_rgba(198,167,125,0.35)]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                  All categories
                </button>
                {openCatalogDef ? (
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-[#F5EDE4]">Sample products</p>
                    <p className="text-xs text-[#F5EDE4]/65">
                      {openCatalogDef.title} — {openCatalogDef.line}
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-[#F5EDE4]/55">
                Highlighted card is your current selection for try-on.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {visiblePresets.map((p) => {
                  const selected = p.id === selectedPresetId;
                  return (
                    <article
                      key={p.id}
                      className={`group overflow-hidden rounded-2xl border text-left shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out will-change-transform hover:-translate-y-0.5 ${
                        selected
                          ? "border-[#C6A77D] bg-[#2C241F] shadow-[0_12px_40px_rgba(0,0,0,0.42),0_0_32px_-10px_rgba(198,167,125,0.35)] ring-2 ring-[#C6A77D]/35"
                          : "border-[#C6A77D]/30 bg-[#2C241F]/85 hover:border-[#C6A77D]/65 hover:shadow-[0_14px_44px_rgba(0,0,0,0.42),0_0_28px_-8px_rgba(198,167,125,0.28)]"
                      }`}
                    >
                      <div
                        role="presentation"
                        className="relative aspect-[4/3] cursor-pointer bg-zinc-800"
                        onClick={() => setSelectedPresetId(p.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-black/70 via-black/35 to-transparent pb-3 pt-12">
                          <button
                            type="button"
                            className="wear-me-3d-final wear-me-3d-demo pointer-events-auto"
                            aria-label="Wear Me"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openWearMe(p);
                            }}
                          >
                            <div className="brushed-surface">
                              <div className="monogram-frame">
                                <svg viewBox="0 0 100 100" className="intertwined-wm">
                                  <text x="10" y="72" style={{ fontFamily: "serif", fontSize: "65px", fontWeight: "bold" }}>
                                    W
                                  </text>
                                  <text
                                    x="36"
                                    y="72"
                                    style={{
                                      fontFamily: "serif",
                                      fontSize: "65px",
                                      fontWeight: "bold",
                                      opacity: 0.9,
                                    }}
                                  >
                                    M
                                  </text>
                                </svg>
                              </div>
                              <span className="btn-text-luxury">WEAR ME</span>
                            </div>
                          </button>
                        </div>
                      </div>
                      <div
                        role="presentation"
                        className="cursor-pointer border-t border-[#C6A77D]/20 bg-[#231e1a]/90 p-4"
                        onClick={() => setSelectedPresetId(p.id)}
                      >
                        <p className="text-sm font-semibold text-[#F5EDE4]">{p.name}</p>
                        <p className="mt-1 text-xs font-medium text-[#F5EDE4]/60">{p.label}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-[#F5EDE4]/55">
          All product images shown are for demonstration purposes only. These are sample items used to showcase the
          virtual try-on technology and do not represent real products for sale.
        </p>
      </main>
      <Footer />
    </div>
  );
}

