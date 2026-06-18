"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Download, SwitchCamera, X } from "lucide-react";
import {
  DEMO_CATALOG,
  GARMENT_PRESETS,
  PRESET_BY_ID,
  catalogIdFromHistoryState,
  cloneHistoryStatePatch,
  type DemoCatalogId,
  type GarmentPreset,
  wearCameraFromHistoryState,
  wearModalFromHistoryState,
  wearPresetIdFromHistoryState,
  wearTryOnPopCount,
} from "@/app/demo/demoGarments";
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
  isCameraCaptureSupported,
  requestCameraVideoStream,
  WearMeResultFullscreen,
  WearMeTipsPrivacy,
  type CameraFacingMode,
  type TryOnResponse,
} from "@/lib/wearMeShared";
import { Footer } from "@/components/Footer";
import {
  DEMO_OWN_TRYON_LIMIT,
  DEMO_OWN_TRYON_LS_KEY,
  type DemoOwnTryOnLimitResponse,
} from "@/lib/demoOwnTryOnLimit";

export default function DemoClient() {
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

  /** "Try your own product" flow: the garment is a user upload, not a catalogue preset (rate-limited to 3). */
  const [wearOwnProduct, setWearOwnProduct] = useState(false);
  /** Per-IP remaining from the server (Redis); null until first fetched. */
  const [ownServerRemaining, setOwnServerRemaining] = useState<number | null>(null);
  /** Per-browser used count (localStorage). */
  const [ownLocalUsed, setOwnLocalUsed] = useState(0);
  /** Admin or access-granted retailer: unlimited custom try-ons (bypasses IP + localStorage limits). */
  const [ownUnlimited, setOwnUnlimited] = useState(false);
  const [ownLimitMsgVisible, setOwnLimitMsgVisible] = useState(false);
  /** Two-step guide shown before the own-product try-on (garment first, then full-body photo). */
  const [ownGuideOpen, setOwnGuideOpen] = useState(false);
  const [ownGuideGarmentFile, setOwnGuideGarmentFile] = useState<File | null>(null);
  const [ownGuideModelFile, setOwnGuideModelFile] = useState<File | null>(null);
  const [cameraCaptureSupported, setCameraCaptureSupported] = useState(false);
  const [ownGuideCameraOpen, setOwnGuideCameraOpen] = useState(false);
  const [ownGuideCameraTarget, setOwnGuideCameraTarget] = useState<"garment" | "model">("model");
  const [ownGuideCameraFacing, setOwnGuideCameraFacing] = useState<CameraFacingMode>("user");
  const [ownGuideCameraFlipping, setOwnGuideCameraFlipping] = useState(false);

  const wearGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const ownProductInputRef = useRef<HTMLInputElement | null>(null);
  const ownModelInputRef = useRef<HTMLInputElement | null>(null);
  const ownGuideVideoRef = useRef<HTMLVideoElement | null>(null);
  const ownGuideStreamRef = useRef<MediaStream | null>(null);
  const wearVideoRef = useRef<HTMLVideoElement | null>(null);
  const wearStreamRef = useRef<MediaStream | null>(null);
  const wearProgressTimerRef = useRef<number | null>(null);
  const wearStageUrlRef = useRef<string | null>(null);
  const wearStageImgRef = useRef<HTMLImageElement | null>(null);
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

  /** Hydrate own-product try-on usage: localStorage (this browser) + server IP counter (Redis). */
  useEffect(() => {
    try {
      const raw = Number(localStorage.getItem(DEMO_OWN_TRYON_LS_KEY) ?? "0");
      setOwnLocalUsed(Number.isFinite(raw) && raw > 0 ? raw : 0);
    } catch {
      /* ignore */
    }
    void (async () => {
      try {
        const res = await fetch("/api/demo/own-product-tryon", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as DemoOwnTryOnLimitResponse;
        setOwnUnlimited(Boolean(data.unlimited));
        if (typeof data.remaining === "number") setOwnServerRemaining(data.remaining);
      } catch {
        /* offline / Redis down — localStorage still gates this browser */
      }
    })();
  }, []);

  useEffect(() => {
    setCameraCaptureSupported(isCameraCaptureSupported());
  }, []);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    let el = document.getElementById(DEMO_WEAR_MODAL_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = DEMO_WEAR_MODAL_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = DEMO_WEAR_MODAL_CSS;
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

  const stopOwnGuideStream = useCallback(() => {
    const s = ownGuideStreamRef.current;
    if (s) {
      try {
        s.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
    }
    ownGuideStreamRef.current = null;
    if (ownGuideVideoRef.current) ownGuideVideoRef.current.srcObject = null;
  }, []);

  useLayoutEffect(() => {
    if (!ownGuideCameraOpen) return;
    const video = ownGuideVideoRef.current;
    const stream = ownGuideStreamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    void video.play().catch(() => {
      /* user tapped to open camera */
    });
  }, [ownGuideCameraOpen, ownGuideCameraFacing]);

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
    const onPopState = (e: PopStateEvent) => {
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
      setWearOwnProduct(false);
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

  /** Try-on API in flight — backdrop / Escape must not dismiss (only explicit Close control). */
  const wearTryOnDismissLocked = wearProcessing;

  useEffect(() => {
    if (!wearOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (wearTryOnDismissLocked) {
        e.preventDefault();
        return;
      }
      closeWearModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [wearOpen, wearTryOnDismissLocked, closeWearModal]);

  const openWearMe = useCallback(
    (preset: GarmentPreset) => {
      wearLoadedPresetIdRef.current = null;
      const prev = wearStageUrlRef.current;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      stopWearStream();
      clearWearProgressTimer();
      setWearOwnProduct(false);
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

  /** Opens the try-on modal using a user-uploaded garment + full-body photo (rate-limited own-product flow). */
  const openWearMeOwnProduct = useCallback(
    (productFile: File, modelFile: File) => {
      wearLoadedPresetIdRef.current = null;
      const prev = wearStageUrlRef.current;
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      stopWearStream();
      clearWearProgressTimer();
      setWearOwnProduct(true);
      setWearPreset(null);
      setWearError(null);
      setWearSaveVisible(false);
      setWearModelFile(modelFile);
      setWearGarmentFile(null);
      setWearStageUrl(URL.createObjectURL(modelFile));
      setWearHasPhoto(true);
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
      setWearGarmentLoading(true);
      void (async () => {
        try {
          const g = await compressImageToMax1000px(productFile);
          setWearGarmentFile(g);
        } catch {
          setWearError("Could not load that product image. Try a different file.");
        } finally {
          setWearGarmentLoading(false);
        }
      })();
    },
    [clearWearProgressTimer, stopWearStream],
  );

  /** Step 2 → 3: launches the try-on modal once both the garment and the full-body photo are chosen. */
  const onStartOwnProductTryOn = useCallback(() => {
    if (!ownGuideGarmentFile || !ownGuideModelFile) return;
    setOwnGuideOpen(false);
    openWearMeOwnProduct(ownGuideGarmentFile, ownGuideModelFile);
  }, [ownGuideGarmentFile, ownGuideModelFile, openWearMeOwnProduct]);

  /** Gate the own-product flow on both the per-IP (server) and per-browser (localStorage) limits before showing the guide. */
  const onTryOwnProduct = useCallback(async () => {
    let serverRemaining = ownServerRemaining;
    let unlimited = ownUnlimited;
    try {
      const res = await fetch("/api/demo/own-product-tryon", { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as DemoOwnTryOnLimitResponse;
        unlimited = Boolean(data.unlimited);
        setOwnUnlimited(unlimited);
        if (typeof data.remaining === "number") {
          serverRemaining = data.remaining;
          setOwnServerRemaining(data.remaining);
        }
      }
    } catch {
      /* ignore — localStorage still gates this browser */
    }
    if (unlimited) {
      setOwnLimitMsgVisible(false);
      setOwnGuideGarmentFile(null);
      setOwnGuideModelFile(null);
      setOwnGuideOpen(true);
      return;
    }
    let localUsed = ownLocalUsed;
    try {
      const raw = Number(localStorage.getItem(DEMO_OWN_TRYON_LS_KEY) ?? "0");
      localUsed = Number.isFinite(raw) && raw > 0 ? raw : 0;
      setOwnLocalUsed(localUsed);
    } catch {
      /* ignore */
    }
    const localRemaining = Math.max(0, DEMO_OWN_TRYON_LIMIT - localUsed);
    const effectiveRemaining =
      serverRemaining == null ? localRemaining : Math.min(serverRemaining, localRemaining);
    if (effectiveRemaining <= 0) {
      setOwnLimitMsgVisible(true);
      return;
    }
    setOwnLimitMsgVisible(false);
    setOwnGuideGarmentFile(null);
    setOwnGuideModelFile(null);
    setOwnGuideOpen(true);
  }, [ownServerRemaining, ownLocalUsed, ownUnlimited]);

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

  const closeOwnGuideCamera = useCallback(() => {
    stopOwnGuideStream();
    setOwnGuideCameraOpen(false);
    setOwnGuideCameraFlipping(false);
  }, [stopOwnGuideStream]);

  const openOwnGuideCamera = useCallback(
    async (target: "garment" | "model") => {
      if (!isCameraCaptureSupported()) return;
      const facing: CameraFacingMode = target === "garment" ? "environment" : "user";
      setOwnGuideCameraTarget(target);
      setOwnGuideCameraFacing(facing);
      stopOwnGuideStream();
      try {
        const stream = await requestCameraVideoStream(facing);
        ownGuideStreamRef.current = stream;
        setOwnGuideCameraOpen(true);
      } catch {
        setOwnGuideCameraOpen(false);
      }
    },
    [stopOwnGuideStream],
  );

  const onOwnGuideFlipCamera = useCallback(async () => {
    if (!ownGuideCameraOpen) return;
    const previous = ownGuideCameraFacing;
    const next: CameraFacingMode = previous === "user" ? "environment" : "user";
    setOwnGuideCameraFlipping(true);
    try {
      stopOwnGuideStream();
      const stream = await requestCameraVideoStream(next);
      ownGuideStreamRef.current = stream;
      setOwnGuideCameraFacing(next);
    } catch {
      try {
        const stream = await requestCameraVideoStream(previous);
        ownGuideStreamRef.current = stream;
      } catch {
        closeOwnGuideCamera();
      }
    } finally {
      setOwnGuideCameraFlipping(false);
    }
  }, [ownGuideCameraOpen, ownGuideCameraFacing, stopOwnGuideStream, closeOwnGuideCamera]);

  const onOwnGuideCapturePhoto = useCallback(() => {
    const video = ownGuideVideoRef.current;
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
        const name = ownGuideCameraTarget === "garment" ? "item.jpg" : "user.jpg";
        const file = new File([blob], name, { type: blob.type || "image/jpeg" });
        if (ownGuideCameraTarget === "garment") {
          setOwnGuideGarmentFile(file);
        } else {
          setOwnGuideModelFile(file);
        }
        closeOwnGuideCamera();
      },
      "image/jpeg",
      0.92,
    );
  }, [ownGuideCameraTarget, closeOwnGuideCamera]);

  useEffect(() => {
    if (!ownGuideOpen) closeOwnGuideCamera();
  }, [ownGuideOpen, closeOwnGuideCamera]);

  const onWearOpenCamera = useCallback(async () => {
    if (!isCameraCaptureSupported()) return;
    setWearError(null);
    try {
      stopWearStream();
      const stream = await requestCameraVideoStream(wearCameraFacing);
      wearStreamRef.current = stream;
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
      setWearError("Could not open the camera. Try Gallery or check browser permissions.");
    }
  }, [stopWearStream, wearCameraFacing, openCatalog, wearPreset]);

  const onWearFlipCamera = useCallback(async () => {
    if (!wearShowVideo) return;
    setWearError(null);
    const previous = wearCameraFacing;
    const next: CameraFacingMode = previous === "user" ? "environment" : "user";
    setWearFlippingCamera(true);
    try {
      stopWearStream();
      const stream = await requestCameraVideoStream(next);
      wearStreamRef.current = stream;
      setWearCameraFacing(next);
    } catch {
      try {
        const stream = await requestCameraVideoStream(previous);
        wearStreamRef.current = stream;
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
    if (!wearModelFile || !wearGarmentFile) return;
    if (!wearOwnProduct && !wearPreset) return;
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
      fd.set("productImageUrl", wearOwnProduct ? "" : (wearPreset?.imageUrl ?? ""));
      fd.set("category", wearOwnProduct ? "tops" : (wearPreset?.category ?? "tops"));
      fd.set("generationMode", "balanced");
      const tryOnTrace = globalThis.crypto?.randomUUID?.() ?? `tryon-${Date.now()}-${Math.random()}`;
      const reqHeaders: Record<string, string> = { "x-tryon-trace": tryOnTrace };
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
      if (wearOwnProduct && !ownUnlimited) {
        setOwnLocalUsed((prev) => {
          const next = prev + 1;
          try {
            localStorage.setItem(DEMO_OWN_TRYON_LS_KEY, String(next));
          } catch {
            /* ignore */
          }
          return next;
        });
        void (async () => {
          try {
            const r = await fetch("/api/demo/own-product-tryon", { method: "POST" });
            if (r.ok) {
              const d = (await r.json()) as DemoOwnTryOnLimitResponse;
              setOwnUnlimited(Boolean(d.unlimited));
              if (typeof d.remaining === "number") setOwnServerRemaining(d.remaining);
            }
          } catch {
            /* ignore */
          }
        })();
      }
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
    wearGarmentFile,
    wearModelFile,
    wearOwnProduct,
    ownUnlimited,
    wearPreset,
  ]);

  /** Triggers a direct file download (blob + `a[download]`) — no share sheet or extra menus. */
  const onWearSaveToGallery = useCallback(async () => {
    if (!wearStageUrl) return;
    setWearSaveLoading(true);
    setWearError(null);
    try {
      const isLocal = wearStageUrl.startsWith("blob:") || wearStageUrl.startsWith("data:");

      // Cross-origin try-on result (FASHN CDN): a direct CORS blob fetch is blocked by the
      // browser, so route it through our same-origin proxy which forces an attachment download.
      if (!isLocal && !wearResultBlob) {
        const proxyUrl = `/api/demo/download-image?url=${encodeURIComponent(wearStageUrl)}&filename=fit-room-tryon`;
        const a = document.createElement("a");
        a.href = proxyUrl;
        a.download = "fit-room-tryon";
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

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

  /** Single-line overview below category cards (middot-separated titles). */
  const demoCatalogTitlesOverview = useMemo(
    () => DEMO_CATALOG.map((c) => c.title).join(" · "),
    [],
  );

  const ownLocalRemaining = Math.max(0, DEMO_OWN_TRYON_LIMIT - ownLocalUsed);
  const ownEffectiveRemaining =
    ownServerRemaining == null
      ? ownLocalRemaining
      : Math.min(ownServerRemaining, ownLocalRemaining);
  const ownLimitReached = !ownUnlimited && ownEffectiveRemaining <= 0;

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
          className={`dq-backdrop${wearBackdropOpen && !wearClosing ? " dq-open" : ""}${wearClosing ? " dq-closing" : ""}${wearTryOnDismissLocked ? " dq-dismiss-locked" : ""}`}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (wearTryOnDismissLocked) {
              e.preventDefault();
              return;
            }
            closeWearModal();
          }}
        >
          <div
            className="dq-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Try on"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="dq-head">
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingRight: 52 }}>
                <div className="dq-head-title">See yourself in it</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#c6a77d", letterSpacing: ".2px" }}>
                  One line of code. Works on any store. Try it on your products today.
                </div>
              </div>
              <button
                type="button"
                className="dq-x dq-modal-close"
                aria-label="Close try-on"
                title="Close"
                style={{ position: "absolute", top: 12, right: 12, zIndex: 30 }}
                onClick={() => closeWearModal()}
              >
                <X className="dq-x-icon" strokeWidth={2.5} aria-hidden />
              </button>
            </div>

            <div className="dq-body" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <WearMeTipsPrivacy />
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
                    ref={wearStageImgRef}
                    className="dq-stage-photo"
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

                {wearSaveVisible && wearStageUrl ? (
                  <WearMeResultFullscreen
                    imageUrl={wearStageUrl}
                    active={wearSaveVisible}
                    stageImageRef={wearStageImgRef}
                  />
                ) : null}

                {wearSaveVisible ? (
                  <>
                    <div className="dq-wow dq-stage-wow" role="status" aria-live="polite">
                      Wow, you look amazing! ✨
                    </div>
                    <button
                      type="button"
                      className="dq-dl"
                      onClick={() => void onWearSaveToGallery()}
                      disabled={wearSaveLoading}
                      aria-busy={wearSaveLoading}
                      aria-label="Download image"
                      title="Download image"
                    >
                      <Download className="dq-dl-icon" strokeWidth={2.5} aria-hidden />
                    </button>
                  </>
                ) : null}

                {wearShowVideo ? (
                  <>
                    <video
                      ref={wearVideoRef}
                      className="dq-stage-video"
                      autoPlay
                      playsInline
                      muted
                      title="Camera preview"
                    />
                    <div className="dq-stage-actions">
                      <div className="dq-cam-row" style={{ width: "100%", pointerEvents: "auto" }}>
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
                  </>
                ) : null}

                {!wearProcessing && !wearSaveVisible && !wearShowVideo ? (
                  <div className="dq-stage-actions">
                    <div className="dq-stage-actions-row">
                      <button
                        type="button"
                        className="dq-choice"
                        onClick={() => wearGalleryInputRef.current?.click()}
                      >
                        <DqIconGallery />
                        Gallery
                      </button>
                      {cameraCaptureSupported ? (
                        <button type="button" className="dq-choice" onClick={() => void onWearOpenCamera()}>
                          <DqIconCamera />
                          Camera
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="dq-wear-me"
                      disabled={
                        !wearModelFile ||
                        !wearGarmentFile ||
                        wearGarmentLoading ||
                        wearGenerating ||
                        wearProcessing
                      }
                      onClick={() => void onWearGenerate()}
                    >
                      Wear Me
                    </button>
                  </div>
                ) : null}

                {wearGarmentLoading ? (
                  <p className="dq-stage-toast text-center text-xs text-[#F5EDE4]/65">
                    Loading sample product…
                  </p>
                ) : null}
                {wearError ? (
                  <p className="dq-stage-toast rounded-xl border border-red-900/50 bg-red-950/80 px-2 py-1 text-center text-xs text-red-200 backdrop-blur-sm">
                    {wearError}
                  </p>
                ) : null}
              </div>

              <input
                ref={wearGalleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onWearGalleryPick(e.target.files?.[0] ?? null)}
              />
            </div>

            {wearSaveVisible ? (
              <div className="dq-modal-cta">
                <button
                  type="button"
                  className="dq-cta"
                  onClick={() => window.open("/subscriptions", "_blank", "noopener,noreferrer")}
                >
                  Add Wear Me to your store →
                </button>
              </div>
            ) : null}

            <div className="dq-brand">
              <a
                href="https://www.fit-room.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#c6a77d",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "2px",
                  textTransform: "lowercase",
                  textDecoration: "none",
                  transition: "color .16s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#e2cfb4";
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#c6a77d";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                www.fit-room.com
              </a>
            </div>
          </div>
        </div>
      )}

      {ownGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
          style={{ paddingTop: "calc(var(--site-header-height) + 1rem)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="own-guide-title"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setOwnGuideOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#C6A77D]/30 bg-[#2C241F] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="own-guide-title" className="text-lg font-semibold text-[#F5EDE4]">
                  Try your own items
                </p>
                <p className="mt-1 text-sm text-[#F5EDE4]/65">
                  Works with clothing, shoes, jewellery and eyewear — anything you wear.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOwnGuideOpen(false)}
                className="shrink-0 rounded-full border border-[#C6A77D]/35 p-1.5 text-[#F5EDE4]/80 transition hover:border-[#C6A77D] hover:text-[#F5EDE4]"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="mt-5 rounded-xl border-l-2 border-[#C6A77D] bg-[#1f1a16]/90 py-3.5 pl-4 pr-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C6A77D]">
                Tips for best results
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {[
                  "Stand in a well-lit space with your full body visible",
                  "Keep 2-3 metres between you and the camera",
                  "Use the original product photo — not a screenshot",
                  "Plain backgrounds work best for both photos",
                ].map((tip) => (
                  <li key={tip} className="flex gap-2 text-xs leading-relaxed text-[#F5EDE4]/75">
                    <span aria-hidden className="text-[#C6A77D]">
                      ✦
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6A77D]/30 bg-[#C6A77D]/10 px-3 py-1 text-[11px] font-medium text-[#F5EDE4]/80">
                  <span aria-hidden>🔒</span>
                  Your photos are not stored. They are processed instantly and deleted.
                </span>
              </div>
            </div>

            <input
              ref={ownProductInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setOwnGuideGarmentFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={ownModelInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setOwnGuideModelFile(e.target.files?.[0] ?? null)}
            />

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[#C6A77D]/25 bg-[#231e1a]/80 p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C6A77D] text-sm font-bold text-[#2C241F]">
                    1
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#F5EDE4]">Your item</p>
                    <p className="text-xs text-[#F5EDE4]/60">
                      A clear photo of what you want to try on. Plain background works best.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => ownProductInputRef.current?.click()}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[#C6A77D]/45 bg-[#2C241F] px-4 text-sm font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D] hover:bg-[#332a23]"
                  >
                    {ownGuideGarmentFile ? "Change from gallery" : "Choose from gallery"}
                  </button>
                  {cameraCaptureSupported ? (
                    <button
                      type="button"
                      onClick={() => void openOwnGuideCamera("garment")}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[#C6A77D]/45 bg-[#2C241F] px-4 text-sm font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D] hover:bg-[#332a23]"
                    >
                      <DqIconCamera />
                      Take photo
                    </button>
                  ) : null}
                </div>
                {ownGuideGarmentFile ? (
                  <p className="mt-2 truncate text-xs font-medium text-[#9FD3A6]">
                    ✓ {ownGuideGarmentFile.name}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-[#C6A77D]/25 bg-[#231e1a]/80 p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C6A77D] text-sm font-bold text-[#2C241F]">
                    2
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#F5EDE4]">Your photo</p>
                    <p className="text-xs text-[#F5EDE4]/60">
                      A full-body photo of yourself facing forward. Good lighting makes a big
                      difference.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => ownModelInputRef.current?.click()}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[#C6A77D]/45 bg-[#2C241F] px-4 text-sm font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D] hover:bg-[#332a23]"
                  >
                    {ownGuideModelFile ? "Change from gallery" : "Choose from gallery"}
                  </button>
                  {cameraCaptureSupported ? (
                    <button
                      type="button"
                      onClick={() => void openOwnGuideCamera("model")}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[#C6A77D]/45 bg-[#2C241F] px-4 text-sm font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D] hover:bg-[#332a23]"
                    >
                      <DqIconCamera />
                      Take photo
                    </button>
                  ) : null}
                </div>
                {ownGuideModelFile ? (
                  <p className="mt-2 truncate text-xs font-medium text-[#9FD3A6]">
                    ✓ {ownGuideModelFile.name}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onStartOwnProductTryOn}
              disabled={!ownGuideGarmentFile || !ownGuideModelFile}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-6 text-sm font-semibold text-[#2C241F] shadow-accent-glow transition hover:opacity-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start try-on
            </button>
          </div>
        </div>
      )}

      {ownGuideCameraOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) closeOwnGuideCamera();
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#C6A77D]/30 bg-black shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] w-full bg-black">
              <video
                ref={ownGuideVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-between gap-2 px-3">
              <button
                type="button"
                onClick={closeOwnGuideCamera}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#C6A77D]/40 bg-black/55 px-4 text-sm font-semibold text-[#F5EDE4] backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onOwnGuideFlipCamera()}
                disabled={ownGuideCameraFlipping}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#C6A77D]/40 bg-black/55 px-4 text-sm font-semibold text-[#F5EDE4] backdrop-blur-sm disabled:opacity-50"
              >
                <SwitchCamera className="h-4 w-4" strokeWidth={2} aria-hidden />
                Flip
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
              <button
                type="button"
                onClick={onOwnGuideCapturePhoto}
                disabled={ownGuideCameraFlipping}
                className="btn-accent-gradient inline-flex min-h-11 min-w-[11rem] items-center justify-center px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Capture photo
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-5 text-sm font-semibold text-[#2C241F] shadow-accent-glow transition hover:opacity-[0.96]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-12 pt-[var(--site-header-height)] md:pb-16">
        <div className="min-w-0">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#F5EDE4] md:text-4xl">
            Try It Free
          </h1>
          <p className="mt-4 text-[#F5EDE4]/75">
            Tap <span className="font-semibold text-[#F5EDE4]">Wear Me</span> on a sample product, then upload your
            photo in the modal (gallery or camera), generate, and download your try-on.
          </p>
        </div>

        <div
          id="demo-product-catalog"
          className="mt-8 rounded-2xl border border-[#C6A77D]/25 bg-[#2C241F]/88 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
        >
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
              <p
                className="mt-5 text-center text-xs leading-snug text-[#F5EDE4]/55 md:text-sm"
                aria-hidden="true"
              >
                {demoCatalogTitlesOverview}
              </p>

              <div className="mt-8 rounded-2xl border border-[#C6A77D]/25 bg-[#231e1a]/70 p-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#C6A77D]">
                  Or try your own product
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-[#F5EDE4]/65">
                  Upload a photo of any product and see it on yourself.
                </p>
                <p className="mt-3 text-xs font-medium text-[#C6A77D]">
                  {ownUnlimited ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Unlimited custom try-ons enabled
                    </span>
                  ) : (
                    <>
                      {ownEffectiveRemaining} of {DEMO_OWN_TRYON_LIMIT} free try-ons with your own
                      items left
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void onTryOwnProduct()}
                  disabled={ownLimitReached}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-6 text-sm font-semibold text-[#2C241F] shadow-accent-glow transition hover:opacity-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Try your own product
                </button>

                {ownLimitMsgVisible || ownLimitReached ? (
                  <div className="mx-auto mt-5 max-w-md rounded-xl border border-[#C6A77D]/30 bg-[#2C241F]/85 p-4 text-sm text-[#F5EDE4]/85">
                    <p>
                      You have {DEMO_OWN_TRYON_LIMIT} free try-ons with your own items. Want to keep
                      going? Try styles from our catalogue or bring Wear Me to your store.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                      <a
                        href="#demo-product-catalog"
                        onClick={() => setOwnLimitMsgVisible(false)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#C6A77D]/45 px-4 text-xs font-semibold text-[#F5EDE4] transition hover:border-[#C6A77D] hover:bg-[#2C241F]"
                      >
                        Browse catalogue
                      </a>
                      <a
                        href="/subscriptions"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-[#C6A77D] to-[#e8d4bc] px-4 text-xs font-semibold text-[#2C241F] shadow-accent-glow transition hover:opacity-[0.96]"
                      >
                        Bring Wear Me to your store
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
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

