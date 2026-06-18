"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  RETAILER_WIDGET_AD_MAX_BANNERS,
  RETAILER_WIDGET_AD_MAX_BANNER_BYTES,
  RETAILER_WIDGET_AD_MAX_MESSAGE_CHARS,
  RETAILER_WIDGET_AD_MAX_MESSAGES,
  type RetailerWidgetAdRecord,
} from "@/lib/retailerWidgetAd";
import { WEAR_LOADING_MESSAGES, compressImageToMax1000px } from "@/lib/wearMeShared";

type AdEditorKind = "text" | "banner";

type WidgetAdApiResponse = {
  error?: string;
  ad?: RetailerWidgetAdRecord | null;
  embed?: {
    kind: "none" | "text" | "banner";
    messages?: string[];
    bannerUrls?: string[];
  };
};

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

function WidgetAdLoadingPreview({
  kind,
  messages,
  bannerUrls,
}: {
  kind: AdEditorKind;
  messages: string[];
  bannerUrls: string[];
}) {
  const [tick, setTick] = useState(0);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showPromo, setShowPromo] = useState(false);
  const [fading, setFading] = useState(false);

  const promoLines = useMemo(
    () => messages.map((m) => m.trim()).filter(Boolean).slice(0, RETAILER_WIDGET_AD_MAX_MESSAGES),
    [messages],
  );
  const banners = useMemo(
    () => bannerUrls.map((u) => u.trim()).filter(Boolean).slice(0, RETAILER_WIDGET_AD_MAX_BANNERS),
    [bannerUrls],
  );
  const hasTextPromo = kind === "text" && promoLines.length > 0;
  const hasBanner = kind === "banner" && banners.length > 0;

  const bannerIndex = hasBanner
    ? Math.floor(Math.max(0, tick) / 2) % banners.length
    : 0;

  useEffect(() => {
    if (!hasTextPromo && !hasBanner) {
      setShowPromo(false);
      return;
    }

    const id = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setTick((t) => t + 1);
        setFading(false);
      }, 480);
    }, 3000);

    return () => window.clearInterval(id);
  }, [hasTextPromo, hasBanner]);

  useEffect(() => {
    if (!hasTextPromo && !hasBanner) return;
    if (tick === 0) return;

    if (hasBanner) {
      setShowPromo((prev) => !prev);
      return;
    }

    if (tick % 2 === 1) {
      setShowPromo(true);
      setPromoIndex((i) => (i + 1) % promoLines.length);
    } else {
      setShowPromo(false);
      setLoadingIndex((i) => (i + 1) % WEAR_LOADING_MESSAGES.length);
    }
  }, [tick, hasBanner, hasTextPromo, promoLines.length]);

  const loadingText = WEAR_LOADING_MESSAGES[loadingIndex] ?? WEAR_LOADING_MESSAGES[0];
  const promoText = promoLines[promoIndex] ?? promoLines[0] ?? "";
  const activeBanner = banners[bannerIndex] ?? banners[0] ?? "";

  return (
    <div className="overflow-hidden rounded-2xl border border-[#c6a77d]/28 bg-[#0f0f14]">
      <div className="border-b border-[#c6a77d]/15 bg-[#2c241f] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4bc94]/85">
          Widget preview
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Shoppers see this on the loading overlay while AI generates their look.
          {hasBanner && banners.length > 1 ? ` Rotates through ${banners.length} banners.` : null}
        </p>
      </div>
      <div className="relative aspect-[4/3] min-h-[220px] bg-[#0f0f14]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(26,22,18,0.82)] backdrop-blur-sm">
          <div
            className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-3.5 transition-opacity duration-[480ms] ${
              fading ? "opacity-0" : "opacity-100"
            }`}
          >
            <div
              className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-[rgba(15,15,20,0.14)] border-t-[#c6a77d]"
              aria-hidden
            />
            {hasBanner && showPromo && activeBanner ? (
              // eslint-disable-next-line @next/next/no-img-element -- retailer-uploaded banner preview
              <img
                key={activeBanner}
                src={activeBanner}
                alt=""
                className="max-h-40 max-w-[min(420px,92%)] rounded-[10px] border border-[#c6a77d]/35 object-contain shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
              />
            ) : (
              <p
                className={`max-w-[420px] px-4 text-center text-sm font-black leading-snug ${
                  hasTextPromo && showPromo ? "text-[#c6a77d]" : "text-[#f5ede4]"
                }`}
              >
                {hasTextPromo && showPromo ? promoText : loadingText}
              </p>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-2.5 overflow-hidden rounded-full bg-[rgba(245,237,228,0.12)]">
          <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-[#a68958] via-[#c6a77d] to-[#e8d4bc]" />
        </div>
      </div>
    </div>
  );
}

export function DashboardAdsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [editorKind, setEditorKind] = useState<AdEditorKind>("text");
  const [messageDraft, setMessageDraft] = useState("");
  const [savedMessages, setSavedMessages] = useState<string[]>([]);
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
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

  const previewBannerUrls = editorKind === "banner" ? bannerUrls : [];

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
        setBannerUrls([]);
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
        setBannerUrls([]);
      } else {
        setSavedMessages([]);
        setMessageDraft("");
        setBannerUrls(ad.bannerUrls ?? []);
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

    const remaining = RETAILER_WIDGET_AD_MAX_BANNERS - bannerUrls.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${RETAILER_WIDGET_AD_MAX_BANNERS} banner images.`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const nextUrls: string[] = [];

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
        nextUrls.push(await fileToDataUrl(compressed));
      }
      setEditorKind("banner");
      setBannerUrls((prev) => [...prev, ...nextUrls].slice(0, RETAILER_WIDGET_AD_MAX_BANNERS));
    } catch {
      setError("Could not process one or more images.");
    }
  }, [bannerUrls.length]);

  const removeBannerAt = useCallback((index: number) => {
    setBannerUrls((prev) => prev.filter((_, i) => i !== index));
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
              bannerDataUrls: bannerUrls,
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
        setBannerUrls(data.ad.bannerUrls ?? []);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [bannerUrls, editorKind, messageDraft]);

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
      setBannerUrls([]);
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
      : bannerUrls.length > 0;

  const bannerSlotsLeft = RETAILER_WIDGET_AD_MAX_BANNERS - bannerUrls.length;

  return (
    <div className="mt-10 max-w-4xl space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">Widget ads</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Promote a sale or message while shoppers wait for their AI try-on. Content appears in the
          Wear Me widget loading overlay — alternating with the standard progress messages every few
          seconds.
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

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm">
              {editorKind === "text" ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Banner images</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Upload up to {RETAILER_WIDGET_AD_MAX_BANNERS} promotional banners (JPEG/PNG/WebP).
                      They alternate with loading messages and rotate during generation.
                    </p>
                  </div>
                  {bannerUrls.length > 0 ? (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {bannerUrls.map((url, index) => (
                        <li
                          key={`${index}-${url.slice(0, 48)}`}
                          className="group relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/60"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Banner ${index + 1}`}
                            className="aspect-[5/3] w-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeBannerAt(index)}
                            className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/70 text-zinc-200 opacity-0 transition hover:bg-black/90 group-hover:opacity-100 focus:opacity-100"
                            aria-label={`Remove banner ${index + 1}`}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                            {index + 1}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {bannerSlotsLeft > 0 ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c6a77d]/35 bg-zinc-950/50 px-4 py-8 text-center transition hover:border-[#c6a77d]/55 hover:bg-zinc-950/80">
                      <span className="text-sm font-semibold text-[#d4bc94]">
                        {bannerUrls.length ? "Add more banners" : "Choose images"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {bannerSlotsLeft} slot{bannerSlotsLeft === 1 ? "" : "s"} left · up to 30MB each
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          void onBannerFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Maximum of {RETAILER_WIDGET_AD_MAX_BANNERS} banners reached. Remove one to add another.
                    </p>
                  )}
                </>
              )}

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

            <WidgetAdLoadingPreview
              kind={editorKind}
              messages={previewMessages}
              bannerUrls={previewBannerUrls}
            />
          </div>
        </>
      )}
    </div>
  );
}
