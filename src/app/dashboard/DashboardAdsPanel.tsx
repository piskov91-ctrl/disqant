"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { GripVertical, Plus, X } from "lucide-react";
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
  linkUrl: string;
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
    linkUrl: b.linkUrl ?? "",
  }));
}

/** Stable key so the live preview remounts when draft clips change (add / remove / reorder / link / duration). */
function bannerPreviewKey(slides: BannerSlideDraft[]): string {
  return slides.map((s) => `${s.id}:${s.url.length}:${s.linkUrl}:${s.durationSec}`).join("|");
}

function BannerImageCard({
  slide,
  index,
  className,
  isDragging,
  isDropTarget,
  onRemove,
  onDurationChange,
  onLinkUrlChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  slide: BannerSlideDraft;
  index: number;
  className?: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, durationSec: number) => void;
  onLinkUrlChange: (id: string, linkUrl: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => void;
  onDragLeave: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  return (
    <li
      className={`group relative w-full min-w-0 list-none rounded-xl border bg-zinc-900/50 shadow-sm transition-[border-color,box-shadow,opacity] ${className ?? ""} ${
        isDragging
          ? "border-[#c6a77d]/45 opacity-45"
          : "border-white/10 hover:border-[#c6a77d]/35"
      } ${isDropTarget ? "border-[#c6a77d]/55 ring-2 ring-[#c6a77d]/25" : ""}`}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", slide.id);
          onDragStart(slide.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver(slide.id);
        }}
        onDragLeave={() => onDragLeave(slide.id)}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(slide.id);
        }}
        className={`relative aspect-[3/1] min-h-[5.5rem] w-full overflow-hidden rounded-t-xl bg-zinc-950/70 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.url}
          alt={`Banner ${index + 1}`}
          draggable={false}
          className="absolute inset-0 block h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 opacity-70 transition-opacity group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-300">
          {index + 1}
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-0.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3 w-3" aria-hidden />
          Drag
        </span>
        <button
          type="button"
          onClick={() => onRemove(slide.id)}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/75 text-zinc-200 opacity-100 shadow-sm transition hover:border-red-400/40 hover:bg-red-950/80 hover:text-red-200 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Remove banner ${index + 1}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="space-y-2 border-t border-white/10 px-2.5 py-2">
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
              className="w-12 rounded-lg border border-white/10 bg-zinc-950/80 px-1.5 py-1 text-center text-xs font-semibold tabular-nums text-zinc-100 focus:border-[#c6a77d]/45 focus:outline-none focus:ring-1 focus:ring-[#c6a77d]/30"
              aria-label={`Display duration for banner ${index + 1} in seconds`}
            />
            <span className="text-[11px] font-medium text-zinc-500">sec</span>
          </span>
        </label>
        <label className="sr-only" htmlFor={`banner-link-${slide.id}`}>
          Link URL for banner {index + 1}
        </label>
        <input
          id={`banner-link-${slide.id}`}
          type="url"
          inputMode="url"
          value={slide.linkUrl}
          onChange={(e) => onLinkUrlChange(slide.id, e.target.value)}
          placeholder="https://yourstore.com/product (optional)"
          className="w-full rounded-lg border border-white/10 bg-zinc-950/80 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-[#c6a77d]/45 focus:outline-none focus:ring-1 focus:ring-[#c6a77d]/30"
        />
      </div>
    </li>
  );
}

function BannerImageGrid({
  slides,
  onReorder,
  onRemove,
  onDurationChange,
  onLinkUrlChange,
  onAddFiles,
  uploading,
}: {
  slides: BannerSlideDraft[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, durationSec: number) => void;
  onLinkUrlChange: (id: string, linkUrl: string) => void;
  onAddFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  function clearDragState() {
    setDragId(null);
    setDropTargetId(null);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      clearDragState();
      return;
    }
    const fromIndex = slides.findIndex((s) => s.id === dragId);
    const toIndex = slides.findIndex((s) => s.id === targetId);
    if (fromIndex >= 0 && toIndex >= 0) onReorder(fromIndex, toIndex);
    clearDragState();
  }

  const fileInputProps = {
    type: "file" as const,
    accept: "image/jpeg,image/png,image/webp,image/*",
    multiple: true,
    className: "sr-only",
    disabled: uploading,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      onAddFiles(e.target.files);
      e.target.value = "";
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/90">
            Banner images
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Drag cards to reorder · swipe on mobile · up to 30MB each
          </p>
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 px-3 py-1.5 text-xs font-semibold text-[#e8dcc8] transition hover:border-[#c6a77d]/60 hover:bg-[#c6a77d]/16">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {uploading ? "Adding…" : "Add images"}
          <input {...fileInputProps} />
        </label>
      </div>

      <div className="p-4">
        {slides.length ? (
          <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
            <ul className="flex w-max min-w-full snap-x snap-mandatory gap-4 sm:grid sm:w-full sm:grid-cols-2 sm:snap-none xl:grid-cols-3">
            {slides.map((slide, index) => (
              <BannerImageCard
                key={slide.id}
                className="w-[min(88vw,300px)] shrink-0 snap-start sm:w-auto sm:min-w-0"
                slide={slide}
                index={index}
                isDragging={dragId === slide.id}
                isDropTarget={dropTargetId === slide.id && dragId !== slide.id}
                onRemove={onRemove}
                onDurationChange={onDurationChange}
                onLinkUrlChange={onLinkUrlChange}
                onDragStart={setDragId}
                onDragEnd={clearDragState}
                onDragOver={setDropTargetId}
                onDragLeave={(id) => {
                  if (dropTargetId === id) setDropTargetId(null);
                }}
                onDrop={handleDrop}
              />
            ))}
            <li className="w-[min(88vw,300px)] shrink-0 list-none snap-start sm:w-auto sm:min-w-0">
              <label className="flex aspect-[3/1] min-h-[5.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-zinc-950/50 text-center transition hover:border-[#c6a77d]/35 hover:bg-zinc-900/50">
                <Plus className="h-5 w-5 text-[#c6a77d]/80" aria-hidden />
                <span className="text-[11px] font-semibold text-zinc-400">Add image</span>
                <input {...fileInputProps} />
              </label>
            </li>
            </ul>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-zinc-950/50 px-4 py-14 text-center transition hover:border-[#c6a77d]/35 hover:bg-zinc-900/50">
            <Plus className="h-6 w-6 text-[#c6a77d]/80" aria-hidden />
            <span className="text-sm font-semibold text-[#d4bc94]">Add your first banner</span>
            <span className="text-xs text-zinc-500">JPG, PNG, or WebP · up to 30MB each</span>
            <input {...fileInputProps} />
          </label>
        )}
      </div>

      <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-zinc-500">
        Add more images for better coverage — banners rotate randomly during each try-on.
      </p>
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
          linkUrl: "",
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

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    setBannerSlides((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const updateSlideDuration = useCallback((id: string, durationSec: number) => {
    const next = normalizeWidgetAdBannerDuration(durationSec);
    setBannerSlides((prev) =>
      prev.map((slide) => (slide.id === id ? { ...slide, durationSec: next } : slide)),
    );
  }, []);

  const updateSlideLinkUrl = useCallback((id: string, linkUrl: string) => {
    setBannerSlides((prev) =>
      prev.map((slide) => (slide.id === id ? { ...slide, linkUrl } : slide)),
    );
  }, []);

  const removeSlide = useCallback((id: string) => {
    setBannerSlides((prev) => prev.filter((slide) => slide.id !== id));
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
              banners: bannerSlides.map(({ url, durationSec, linkUrl }) => ({
                url,
                durationSec: normalizeWidgetAdBannerDuration(durationSec),
                ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
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
          Promote a sale or message while shoppers wait for their AI try-on. Upload banner images that
          rotate randomly during each generation.
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
              Banner images
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
                className="rounded-2xl border border-[#c6a77d]/15 bg-black/40 px-5 py-4 backdrop-blur-md"
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
                    <span>Images are stored until you delete them manually</span>
                  </li>
                </ul>
              </div>
              <BannerImageGrid
                slides={bannerSlides}
                onReorder={reorderSlides}
                onRemove={removeSlide}
                onDurationChange={updateSlideDuration}
                onLinkUrlChange={updateSlideLinkUrl}
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
