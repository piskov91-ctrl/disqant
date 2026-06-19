"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import {
  RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC,
  RETAILER_WIDGET_AD_MAX_BANNER_BYTES,
  RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC,
  RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS,
  RETAILER_WIDGET_AD_MAX_MESSAGES,
  RETAILER_WIDGET_AD_MIN_BANNER_DURATION_SEC,
  normalizeWidgetAdBannerDuration,
  type RetailerWidgetAdBannerSlide,
  type RetailerWidgetAdRecord,
} from "@/lib/retailerWidgetAd";
import { WEAR_LOADING_MESSAGES, compressImageToMax1000px } from "@/lib/wearMeShared";

type AdEditorKind = "text" | "banner";

type BannerSlideDraft = {
  id: string;
  url: string;
  durationSec: number;
};

type WidgetAdApiResponse = {
  error?: string;
  ad?: RetailerWidgetAdRecord | null;
  embed?: {
    kind: "none" | "text" | "banner";
    messages?: string[];
    banners?: RetailerWidgetAdBannerSlide[];
  };
};

function newSlideId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image."));
    };
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function slidesFromRecord(banners: RetailerWidgetAdBannerSlide[]): BannerSlideDraft[] {
  return banners.map((b) => ({
    id: newSlideId(),
    url: b.url,
    durationSec: b.durationSec,
  }));
}

/** Stable key so the live preview remounts when draft clips change (add / remove / reorder / duration). */
function bannerPreviewKey(slides: BannerSlideDraft[]): string {
  return slides.map((s) => `${s.id}:${s.durationSec}:${s.url.length}`).join("|");
}

function BannerTimelineClip({
  slide,
  index,
  slideCount,
  onDurationChange,
  onRemove,
  onMove,
}: {
  slide: BannerSlideDraft;
  index: number;
  slideCount: number;
  onDurationChange: (id: string, durationSec: number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const durationPct =
    (slide.durationSec / RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC) * 100;

  return (
    <li className="relative flex w-[148px] shrink-0 flex-col rounded-xl border border-white/10 bg-[#121018] shadow-sm transition-shadow hover:border-[#c6a77d]/35">
      <div className="relative overflow-hidden rounded-t-xl border-b border-white/8 bg-[#0f0f14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.url}
          alt={`Banner ${index + 1}`}
          className="aspect-[4/3] w-full object-contain p-1"
        />
        <button
          type="button"
          onClick={() => onRemove(slide.id)}
          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/75 text-zinc-200 transition hover:bg-black/90"
          aria-label={`Remove banner ${index + 1}`}
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-300">
          {index + 1}
        </span>
      </div>

      <div className="space-y-2 px-2.5 py-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Order
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(slide.id, -1)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-zinc-400 transition hover:border-[#c6a77d]/35 hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move banner ${index + 1} earlier`}
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              disabled={index >= slideCount - 1}
              onClick={() => onMove(slide.id, 1)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-zinc-400 transition hover:border-[#c6a77d]/35 hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-35"
              aria-label={`Move banner ${index + 1} later`}
            >
              <ArrowRight className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Duration
          </span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={RETAILER_WIDGET_AD_MIN_BANNER_DURATION_SEC}
              max={RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC}
              step={1}
              value={slide.durationSec}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                onDurationChange(
                  slide.id,
                  Number.isFinite(parsed)
                    ? parsed
                    : RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC,
                );
              }}
              onBlur={() =>
                onDurationChange(slide.id, normalizeWidgetAdBannerDuration(slide.durationSec))
              }
              className="w-12 rounded-md border border-white/12 bg-zinc-950/80 px-1.5 py-1 text-center text-xs font-semibold tabular-nums text-zinc-100 focus:border-[#c6a77d]/45 focus:outline-none focus:ring-1 focus:ring-[#c6a77d]/30"
            />
            <span className="text-[11px] font-medium text-zinc-500">sec</span>
          </span>
        </label>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-zinc-800/90"
          title={`${slide.durationSec}s of ${RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC}s max`}
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#a68958]/80 via-[#c6a77d]/80 to-[#e8d4bc]/80"
            style={{ width: `${Math.min(100, Math.max(4, durationPct))}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function BannerTimeline({
  slides,
  onDurationChange,
  onRemove,
  onMove,
  onAddFiles,
  uploading,
}: {
  slides: BannerSlideDraft[];
  onDurationChange: (id: string, durationSec: number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onAddFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const rulerMarks = [0, 15, 30, 45];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#c6a77d]/22 bg-[#14111a] shadow-inner shadow-black/40">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/90">
            Timeline
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Set how long each banner shows · random order in the widget · max{" "}
            {RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC}s each
          </p>
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 px-3 py-1.5 text-xs font-semibold text-[#e8dcc8] transition hover:border-[#c6a77d]/60 hover:bg-[#c6a77d]/16">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {uploading ? "Adding…" : "Add images"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              onAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="relative border-b border-white/6 px-4 py-2">
        <div className="relative h-5">
          {rulerMarks.map((sec) => (
            <span
              key={sec}
              className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-zinc-600"
              style={{ left: `${(sec / RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC) * 100}%` }}
            >
              {sec}s
            </span>
          ))}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5">
            {rulerMarks.map((sec) => (
              <span
                key={`tick-${sec}`}
                className="h-2 w-px bg-zinc-700"
                style={{
                  position: "absolute",
                  left: `${(sec / RETAILER_WIDGET_AD_MAX_BANNER_DURATION_SEC) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-4">
        {slides.length ? (
          <ul className="flex min-w-min gap-3 pb-1">
            {slides.map((slide, index) => (
              <BannerTimelineClip
                key={slide.id}
                slide={slide}
                index={index}
                slideCount={slides.length}
                onDurationChange={onDurationChange}
                onRemove={onRemove}
                onMove={onMove}
              />
            ))}
            <li className="flex w-[120px] shrink-0 items-center justify-center">
              <label className="flex h-full min-h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c6a77d]/30 bg-zinc-950/40 text-center transition hover:border-[#c6a77d]/50 hover:bg-zinc-950/70">
                <Plus className="h-5 w-5 text-[#c6a77d]/80" aria-hidden />
                <span className="text-[11px] font-semibold text-zinc-400">Add clip</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  multiple
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    onAddFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </li>
          </ul>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c6a77d]/35 bg-zinc-950/40 px-4 py-12 text-center transition hover:border-[#c6a77d]/55 hover:bg-zinc-950/60">
            <Plus className="h-6 w-6 text-[#c6a77d]/80" aria-hidden />
            <span className="text-sm font-semibold text-[#d4bc94]">Add banner images to the timeline</span>
            <span className="text-xs text-zinc-500">Unlimited uploads · up to 30MB each · default 10s per clip</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                onAddFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function WidgetAdLoadingPreview({
  kind,
  messages,
  bannerSlides,
}: {
  kind: AdEditorKind;
  messages: string[];
  bannerSlides: BannerSlideDraft[];
}) {
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showPromo, setShowPromo] = useState(false);
  const [fading, setFading] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [bannerImgFading, setBannerImgFading] = useState(false);
  const phaseTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const promoLines = useMemo(
    () => messages.map((m) => m.trim()).filter(Boolean).slice(0, RETAILER_WIDGET_AD_MAX_MESSAGES),
    [messages],
  );
  const slides = useMemo(
    () => bannerSlides.filter((s) => s.url.trim()),
    [bannerSlides],
  );
  const slidesFingerprint = useMemo(
    () => bannerPreviewKey(slides),
    [slides],
  );
  const hasTextPromo = kind === "text" && promoLines.length > 0;
  const hasBanner = kind === "banner" && slides.length > 0;

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? null;

  useEffect(() => {
    if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
    phaseTimerRef.current = null;
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = null;
    setBannerImgFading(false);
    setShowPromo(false);
    setActiveSlideId(null);
    setLoadingIndex(0);
    setPromoIndex(0);
    setFading(false);

    if (hasBanner) {
      const FADE_MS = 480;
      const bannerQueue: number[] = [];

      function shuffleQueue() {
        bannerQueue.length = 0;
        for (let i = 0; i < slides.length; i++) bannerQueue.push(i);
        for (let i = bannerQueue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bannerQueue[i], bannerQueue[j]] = [bannerQueue[j], bannerQueue[i]];
        }
      }

      function popSlide(): BannerSlideDraft | null {
        if (!slides.length) return null;
        if (!bannerQueue.length) shuffleQueue();
        const idx = bannerQueue.shift();
        if (idx == null) return slides[0] ?? null;
        return slides[idx] ?? slides[0] ?? null;
      }

      function showNextSlide(isFirst: boolean) {
        const slide = popSlide();
        if (!slide) return;

        if (isFirst) {
          setActiveSlideId(slide.id);
        } else {
          setBannerImgFading(true);
          fadeTimerRef.current = window.setTimeout(() => {
            fadeTimerRef.current = null;
            setActiveSlideId(slide.id);
            setBannerImgFading(false);
          }, FADE_MS);
        }

        phaseTimerRef.current = window.setTimeout(
          () => showNextSlide(false),
          Math.max(500, slide.durationSec * 1000),
        );
      }

      shuffleQueue();
      showNextSlide(true);

      return () => {
        if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
        if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      };
    }

    if (!hasTextPromo) return;

    const LOADING_MS = 3000;
    const FADE_MS = 480;

    function runTextPromoPhase() {
      setFading(true);
      window.setTimeout(() => {
        setShowPromo(true);
        setPromoIndex((i) => (i + 1) % promoLines.length);
        setFading(false);
      }, FADE_MS);
      phaseTimerRef.current = window.setTimeout(runTextLoadingPhase, LOADING_MS);
    }

    function runTextLoadingPhase() {
      setFading(true);
      window.setTimeout(() => {
        setShowPromo(false);
        setLoadingIndex((i) => (i + 1) % WEAR_LOADING_MESSAGES.length);
        setFading(false);
      }, FADE_MS);
      phaseTimerRef.current = window.setTimeout(runTextPromoPhase, LOADING_MS);
    }

    phaseTimerRef.current = window.setTimeout(runTextPromoPhase, LOADING_MS);

    return () => {
      if (phaseTimerRef.current) window.clearTimeout(phaseTimerRef.current);
    };
  }, [hasBanner, hasTextPromo, slides, slidesFingerprint, promoLines.join("\n")]);

  const loadingText = WEAR_LOADING_MESSAGES[loadingIndex] ?? WEAR_LOADING_MESSAGES[0];
  const promoText = promoLines[promoIndex] ?? promoLines[0] ?? "";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#c6a77d]/28 bg-[#0f0f14]">
      <div className="border-b border-[#c6a77d]/15 bg-[#2c241f] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4bc94]/85">
          Widget preview
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {hasBanner
            ? "Matches the live try-on: banners fill the stage and rotate at each clip’s duration (random order)."
            : "Shoppers see this on the loading overlay while AI generates their look."}
        </p>
      </div>
      <div className="relative aspect-[4/3] min-h-[220px] overflow-hidden bg-[#0f0f14]">
        {hasBanner && activeSlide ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={activeSlide.id}
            src={activeSlide.url}
            alt=""
            className={`absolute inset-0 z-[1] h-full w-full object-cover object-center transition-opacity duration-[480ms] ${
              bannerImgFading ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : null}

        <div
          className={`absolute inset-0 z-[4] flex flex-col items-center justify-center gap-3 ${
            hasBanner
              ? "bg-[rgba(12,10,8,0.32)]"
              : "bg-[rgba(26,22,18,0.82)] backdrop-blur-sm"
          }`}
        >
          {kind === "banner" && !hasBanner ? (
            <p className="max-w-[280px] px-4 text-center text-sm font-semibold leading-snug text-zinc-500">
              Upload banner images to preview how they appear during try-on.
            </p>
          ) : hasBanner ? (
            <div
              className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[rgba(15,15,20,0.14)] border-t-[#c6a77d]"
              aria-hidden
            />
          ) : (
            <div
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-3.5 transition-opacity duration-[480ms] ${
                fading ? "opacity-0" : "opacity-100"
              }`}
            >
              <div
                className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[rgba(15,15,20,0.14)] border-t-[#c6a77d]"
                aria-hidden
              />
              <p
                className={`max-w-[420px] px-4 text-center text-sm font-black leading-snug ${
                  hasTextPromo && showPromo ? "text-[#c6a77d]" : "text-[#f5ede4]"
                }`}
              >
                {hasTextPromo && showPromo ? promoText : loadingText}
              </p>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[5] h-2.5 overflow-hidden rounded-full bg-[rgba(245,237,228,0.12)]">
          <div className="h-full w-[45%] animate-pulse rounded-full bg-gradient-to-r from-[#a68958] via-[#c6a77d] to-[#e8d4bc]" />
        </div>
      </div>
    </div>
  );
}

export function DashboardAdsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [editorKind, setEditorKind] = useState<AdEditorKind>("text");
  const [messageDraft, setMessageDraft] = useState("");
  const [savedMessages, setSavedMessages] = useState<string[]>([]);
  const [bannerSlides, setBannerSlides] = useState<BannerSlideDraft[]>([]);
  const [hasSavedAd, setHasSavedAd] = useState(false);

  const previewMessages = useMemo(() => {
    const draftLines = messageDraft
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, RETAILER_WIDGET_AD_MAX_MESSAGES);
    if (editorKind === "text") {
      return draftLines.length ? draftLines : savedMessages;
    }
    return savedMessages;
  }, [editorKind, messageDraft, savedMessages]);

  const previewBannerSlides = editorKind === "banner" ? bannerSlides : [];

  const loadAd = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/retailer/widget-ad", { credentials: "include" });
      const data = (await res.json()) as WidgetAdApiResponse;
      if (!res.ok) {
        setError(data.error || "Could not load your ad.");
        return;
      }

      const ad = data.ad;
      if (!ad) {
        setHasSavedAd(false);
        setSavedMessages([]);
        setBannerSlides([]);
        setMessageDraft("");
        setEditorKind("text");
        return;
      }

      setHasSavedAd(true);
      setEditorKind(ad.kind);
      if (ad.kind === "text") {
        const msgs = ad.messages ?? [];
        setSavedMessages(msgs);
        setMessageDraft(msgs.join("\n"));
        setBannerSlides([]);
      } else {
        setSavedMessages([]);
        setMessageDraft("");
        setBannerSlides(slidesFromRecord(ad.banners ?? []));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAd();
  }, [loadAd]);

  const onBannerFiles = useCallback(async (files: FileList | null) => {
    setError(null);
    setSavedNotice(null);
    if (!files?.length) return;

    setUploading(true);
    const toProcess = Array.from(files);
    const nextSlides: BannerSlideDraft[] = [];

    try {
      for (const file of toProcess) {
        if (!file.type.startsWith("image/")) {
          setError("Choose JPEG, PNG, or WebP images only.");
          return;
        }
        if (file.size > RETAILER_WIDGET_AD_MAX_BANNER_BYTES) {
          setError("Each banner must be 30MB or smaller.");
          return;
        }
        const compressed = await compressImageToMax1000px(file);
        const url = await fileToDataUrl(compressed);
        nextSlides.push({
          id: newSlideId(),
          url,
          durationSec: RETAILER_WIDGET_AD_DEFAULT_BANNER_DURATION_SEC,
        });
      }
      setEditorKind("banner");
      setBannerSlides((prev) => [...prev, ...nextSlides]);
    } catch {
      setError("Could not process one or more images.");
    } finally {
      setUploading(false);
    }
  }, []);

  const updateSlideDuration = useCallback((id: string, durationSec: number) => {
    const next = normalizeWidgetAdBannerDuration(durationSec);
    setBannerSlides((prev) =>
      prev.map((slide) => (slide.id === id ? { ...slide, durationSec: next } : slide)),
    );
  }, []);

  const removeSlide = useCallback((id: string) => {
    setBannerSlides((prev) => prev.filter((slide) => slide.id !== id));
  }, []);

  const moveSlide = useCallback((id: string, direction: -1 | 1) => {
    setBannerSlides((prev) => {
      const index = prev.findIndex((slide) => slide.id === id);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const saveAd = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSavedNotice(null);
    try {
      const body =
        editorKind === "text"
          ? {
              kind: "text" as const,
              messages: messageDraft
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .slice(0, RETAILER_WIDGET_AD_MAX_MESSAGES),
            }
          : {
              kind: "banner" as const,
              banners: bannerSlides.map(({ url, durationSec }) => ({
                url,
                durationSec: normalizeWidgetAdBannerDuration(durationSec),
              })),
            };

      const res = await fetch("/api/retailer/widget-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as WidgetAdApiResponse;
      if (!res.ok) {
        setError(data.error || "Could not save your ad.");
        return;
      }

      setHasSavedAd(true);
      setSavedNotice("Saved — your widget will show this during generation.");
      if (data.ad?.kind === "text") {
        setSavedMessages(data.ad.messages ?? []);
        setMessageDraft((data.ad.messages ?? []).join("\n"));
      } else if (data.ad?.kind === "banner") {
        setBannerSlides(slidesFromRecord(data.ad.banners ?? []));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [bannerSlides, editorKind, messageDraft]);

  const clearAd = useCallback(async () => {
    setClearing(true);
    setError(null);
    setSavedNotice(null);
    try {
      const res = await fetch("/api/retailer/widget-ad", {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as WidgetAdApiResponse;
      if (!res.ok) {
        setError(data.error || "Could not remove your ad.");
        return;
      }
      setHasSavedAd(false);
      setSavedMessages([]);
      setMessageDraft("");
      setBannerSlides([]);
      setEditorKind("text");
      setSavedNotice("Ad removed from your widget.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClearing(false);
    }
  }, []);

  const canSave =
    editorKind === "text"
      ? messageDraft.split("\n").some((l) => l.trim().length > 0)
      : bannerSlides.length > 0;

  return (
    <div className="mt-10 max-w-5xl space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Widget ads</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Promote a sale or message while shoppers wait for their AI try-on. Banner clips play in
          random order with the duration you set on each thumbnail.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading your ad settings…</p>
      ) : (
        <>
          {error ? (
            <p className="text-sm text-red-300/90" role="alert">
              {error}
            </p>
          ) : null}
          {savedNotice ? (
            <p className="text-sm text-emerald-200/90" role="status">
              {savedNotice}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditorKind("text")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                editorKind === "text"
                  ? "border border-[#c6a77d]/55 bg-[#c6a77d]/14 text-[#f5efe6]"
                  : "border border-transparent text-zinc-500 hover:border-[#c6a77d]/35 hover:text-zinc-200"
              }`}
            >
              Promotional text
            </button>
            <button
              type="button"
              onClick={() => setEditorKind("banner")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                editorKind === "banner"
                  ? "border border-[#c6a77d]/55 bg-[#c6a77d]/14 text-[#f5efe6]"
                  : "border border-transparent text-zinc-500 hover:border-[#c6a77d]/35 hover:text-zinc-200"
              }`}
            >
              Banner timeline
            </button>
          </div>

          {editorKind === "text" ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <section className="space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
                <div>
                  <label htmlFor="widget-ad-messages" className="text-sm font-semibold text-zinc-100">
                    Promotional messages
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    One message per line (up to {RETAILER_WIDGET_AD_MAX_MESSAGES}, max{" "}
                    {RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS} characters each). Multiple lines rotate
                    during loading.
                  </p>
                </div>
                <textarea
                  id="widget-ad-messages"
                  rows={6}
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder={"Summer sale — 20% off dresses\nFree shipping this weekend"}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#c6a77d]/45 focus:outline-none focus:ring-2 focus:ring-[#c6a77d]/25"
                />
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={!canSave || saving}
                    onClick={() => void saveAd()}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#c6a77d] px-5 text-sm font-semibold text-zinc-950 transition hover:bg-[#d4b896] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {saving ? "Saving…" : "Save ad"}
                  </button>
                  {hasSavedAd ? (
                    <button
                      type="button"
                      disabled={clearing}
                      onClick={() => void clearAd()}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-5 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:bg-zinc-900/80 disabled:opacity-45"
                    >
                      {clearing ? "Removing…" : "Remove ad"}
                    </button>
                  ) : null}
                </div>
              </section>
              <WidgetAdLoadingPreview kind="text" messages={previewMessages} bannerSlides={[]} />
            </div>
          ) : (
            <div className="space-y-8">
              <div
                className="rounded-2xl border border-[#c6a77d]/35 bg-[#0f0f14]/90 px-5 py-4 shadow-[inset_0_1px_0_0_rgba(198,167,125,0.08)]"
                role="note"
              >
                <ul className="space-y-2 text-xs leading-relaxed text-zinc-400">
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[#c6a77d]" aria-hidden>
                      •
                    </span>
                    <span>
                      <span className="font-semibold text-zinc-300">Recommended image size:</span> 1200×400px
                      (3:1 ratio)
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[#c6a77d]" aria-hidden>
                      •
                    </span>
                    <span>
                      <span className="font-semibold text-zinc-300">Supported formats:</span> JPG, PNG, WebP
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[#c6a77d]" aria-hidden>
                      •
                    </span>
                    <span>
                      <span className="font-semibold text-zinc-300">Max file size:</span> 30MB
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[#c6a77d]" aria-hidden>
                      •
                    </span>
                    <span>
                      Set the display duration per image based on how long you want each banner visible — a
                      typical try-on takes 20–40 seconds
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[#c6a77d]" aria-hidden>
                      •
                    </span>
                    <span>Images are stored until you delete them manually</span>
                  </li>
                </ul>
              </div>
              <BannerTimeline
                slides={bannerSlides}
                onDurationChange={updateSlideDuration}
                onRemove={removeSlide}
                onMove={moveSlide}
                onAddFiles={(files) => void onBannerFiles(files)}
                uploading={uploading}
              />
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!canSave || saving}
                    onClick={() => void saveAd()}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#c6a77d] px-5 text-sm font-semibold text-zinc-950 transition hover:bg-[#d4b896] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {saving ? "Saving…" : "Save ad"}
                  </button>
                  {hasSavedAd ? (
                    <button
                      type="button"
                      disabled={clearing}
                      onClick={() => void clearAd()}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-5 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:bg-zinc-900/80 disabled:opacity-45"
                    >
                      {clearing ? "Removing…" : "Remove ad"}
                    </button>
                  ) : null}
                </div>
                <WidgetAdLoadingPreview
                  key={bannerPreviewKey(previewBannerSlides)}
                  kind="banner"
                  messages={previewMessages}
                  bannerSlides={previewBannerSlides}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
