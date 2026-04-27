"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Folder,
  Glasses,
  Shirt,
  Snowflake,
  Sparkles,
  SwitchCamera,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/** Echoed from FormData; the API route uses Fashn Try-On Max. This hint is for our JSON only (tops/bottoms) — it is not a Try-On Max routing field. */
type GarmentCategoryHint = "tops" | "bottoms";

type TryOnResponse =
  | { id: string; output: string[]; category?: GarmentCategoryHint }
  | { error: string; code?: string; keyKind?: "demo" | "client" };

/** Fashn may return a structured `error` object; React cannot render it — always coerce to a string. */
function formatTryOnApiError(err: unknown): string {
  if (err == null) return "Try-on failed.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Try-on failed.";
  }
}

type GarmentPreset = {
  id:
    | "sneakers"
    | "tee"
    | "sweater"
    | "jacket"
    | "jacket_leather"
    | "jeans"
    | "cap"
    | "beanie"
    | "sunglasses_aviator"
    | "sunglasses_round"
    | "sunglasses_wayfarer"
    | "necklace"
    | "earrings"
    | "gloves"
    | "handbag_women"
    | "mens_bag"
    | "ankle_bracelet"
    | "boxer_shorts"
    | "blouse"
    | "scarf"
    | "bracelet"
    | "swim_men"
    | "swim_women"
    | "eyeglasses";
  label: string;
  name: string;
  /** Hint for `/api/try-on` (echoed in JSON); sneakers use `bottoms` like other non-top apparel. */
  category: GarmentCategoryHint;
  imageUrl: string;
};

const GARMENT_PRESETS: GarmentPreset[] = [
  {
    id: "sneakers",
    label: "Sneakers",
    name: "White clean sneakers",
    category: "bottoms",
    imageUrl:
      // White sneakers, full pair on a light/white background (Unsplash). https://unsplash.com/photo-1625860191460-10a66c7384fb
      "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "tee",
    label: "T-Shirt",
    name: "Plain white t-shirt (mockup, full shirt visible)",
    category: "tops",
    // mockupbee — flat-lay crew neck, full garment, light gray backdrop, no model. https://unsplash.com/photos/a-white-shirt-on-a-white-background-4rUYuwJ2vGw
    imageUrl:
      "https://images.unsplash.com/photo-1651761179569-4ba2aa054997?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sweater",
    label: "Sweater",
    name: "Beige oversized knit sweater",
    category: "tops",
    // Full knit sweater, flat lay, neutral background. https://unsplash.com/photo-1687275161342-8699c61e4364
    imageUrl:
      "https://images.unsplash.com/photo-1687275161342-8699c61e4364?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "jacket",
    label: "Jacket",
    name: "Black jacket",
    category: "tops",
    // Black jacket laid flat, full piece visible. https://unsplash.com/photo-1608063615781-e2ef8c73d114
    imageUrl:
      "https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "jacket_leather",
    label: "Leather jacket",
    name: "Black leather jacket (flat lay, no model)",
    category: "tops",
    // Lea Øchel — black leather zip-up on light textile. https://unsplash.com/photo-1551028719-00167b16eac5
    imageUrl:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "jeans",
    label: "Blue jeans",
    name: "Blue denim jeans (flat lay, no model)",
    category: "bottoms",
    // TuanAnh Blue — single pair, front flat-lay, full legs and waist visible, neutral gray, no model. https://unsplash.com/photos/a-pair-of-dark-blue-jeans-on-a-white-background-wNP79A-_bRY
    imageUrl:
      "https://images.unsplash.com/photo-1714143164072-7646ef5cb24d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "cap",
    label: "Cap",
    name: "Black baseball cap (product shot)",
    category: "tops",
    // Black cap, clear product angle, light background. https://unsplash.com/photo-1521369909029-2afed882baee
    imageUrl:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "beanie",
    label: "Beanie",
    name: "Grey knit beanie (white background)",
    category: "tops",
    // Ryan Hoffman — beanie for mockup, whole hat on white. https://unsplash.com/photos/black-knit-cap-on-white-surface-2BK0JEwQSpQ
    imageUrl:
      "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sunglasses_aviator",
    label: "Sunglasses (aviator)",
    name: "Aviator sunglasses — silver metal frame (white background)",
    category: "tops",
    // Engin Akyurt — single pair, full frame, light backdrop; e-commerce / try-on style (no logos). https://unsplash.com/photos/silver-framed-aviator-style-sunglasses-hB8YCg-FC-A
    imageUrl:
      "https://images.unsplash.com/photo-1592635955011-24d885bdb289?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sunglasses_round",
    label: "Sunglasses (round)",
    name: "Round-frame sunglasses (white background)",
    category: "tops",
    // Alondra Lucia — round metal frames, gradient lenses, clean white product shot. https://unsplash.com/photos/a-pair-of-sunglasses-on-a-white-background-tUyg4nIQHPk
    imageUrl:
      "https://images.unsplash.com/photo-1649119161997-00ffc8c24e11?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "sunglasses_wayfarer",
    label: "Sunglasses (wayfarer)",
    name: "Wayfarer-style sunglasses — black frame (white background)",
    category: "tops",
    // Kiran CK — browline / clubmaster (common everyday style), full frame, neutral light backdrop, no visible branding. https://unsplash.com/photos/black-framed-sunglasses-on-white-surface-lSl94SZHRgA
    imageUrl:
      "https://images.unsplash.com/photo-1584036553516-bf83210aa16c?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "necklace",
    label: "Necklace",
    name: "Simple gold chain (product shot)",
    category: "tops",
    // Gold chain on a white plinth. https://unsplash.com/photo-1708220040954-a89dd8317a9e
    imageUrl:
      "https://images.unsplash.com/photo-1708220040954-a89dd8317a9e?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "earrings",
    label: "Earrings",
    name: "Gold earrings (white surface, product shot)",
    category: "tops",
    // Oscar Ramirez — pair of gold earrings on white. (unsplash.com/photos/gold-earrings 404s; Miao Xiang’s hit in that search is wedding bands, not earrings.) https://unsplash.com/photos/a-pair-of-gold-earrings-on-a-white-surface-pQYSjhWz4cQ
    imageUrl:
      "https://images.unsplash.com/photo-1708220040828-9ab1673681d3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "gloves",
    label: "Gloves",
    name: "Brown leather gloves",
    category: "tops",
    // Nicolas Solerieu — brown leather pair on white. https://unsplash.com/photos/a-pair-of-brown-leather-gloves-on-a-white-background-RLShnUiFFNA
    imageUrl:
      "https://images.unsplash.com/photo-1673294861057-4584f92b91d2?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "handbag_women",
    label: "Handbag (women's)",
    name: "Brown leather shoulder bag (product shot)",
    category: "tops",
    // Handbag on white. https://unsplash.com/photo-1691480250099-a63081ecfcb8
    imageUrl:
      "https://images.unsplash.com/photo-1691480250099-a63081ecfcb8?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "mens_bag",
    label: "Bag (men's)",
    name: "Brown leather briefcase (on wood)",
    category: "tops",
    // Full briefcase, neutral wood surface. https://unsplash.com/photo-1643168661851-199cf2bba5c0
    imageUrl:
      "https://images.unsplash.com/photo-1643168661851-199cf2bba5c0?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "ankle_bracelet",
    label: "Ankle bracelet",
    name: "Silver chain anklet / bracelet (product style)",
    category: "bottoms",
    // Full chain loop visible, bright background. https://unsplash.com/photo-1610695049917-d21679d7d593
    imageUrl:
      "https://images.unsplash.com/photo-1610695049917-d21679d7d593?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "boxer_shorts",
    label: "Boxer shorts",
    name: "Blue denim shorts (flat lay, white background)",
    category: "bottoms",
    // Single pair, full length on white. Engin Akyurt. https://unsplash.com/photos/blue-denim-shorts-on-white-surface-Hd4nlxLgIbA
    imageUrl:
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "blouse",
    label: "Collared shirt",
    name: "White collared shirt — short sleeve polo (full garment, neutral wall)",
    category: "tops",
    // Mediamodifier — white polo on hanger, hem to collar visible, off-white wall; no exterior logos. https://unsplash.com/photos/a-white-polo-shirt-hanging-on-a-clothes-rack-F5i3PZXYkvY
    imageUrl:
      "https://images.unsplash.com/photo-1671438118097-479e63198629?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "scarf",
    label: "Scarf",
    name: "Soft knit winter scarf (flat lay)",
    category: "tops",
    // Scarf with full length visible, neutral background. https://unsplash.com/photo-1606760227091-3dd870d97f1d
    imageUrl:
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "bracelet",
    label: "Bracelet",
    name: "Gold chain bracelet (white textile)",
    category: "tops",
    // Amina Atar — gold chain bracelet on white blanket; no model. (unsplash.com/photos/gold-bracelet 404s.) https://unsplash.com/photos/a-gold-chain-bracelet-laying-on-top-of-a-white-blanket-F6qEiDArzfk
    imageUrl:
      "https://images.unsplash.com/photo-1684616289712-dd118c126fae?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "swim_men",
    label: "Swim (men's)",
    name: "Surfer walking from the ocean with a board (stock)",
    category: "bottoms",
    // Unsplash+ CDN (direct image from API `urls` / plus host). https://unsplash.com/photos/a-man-walking-out-of-the-ocean-with-a-surfboard-mx0AGA3Cyp8
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1661891142977-6db59f9c2c71?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "swim_women",
    label: "Swim (women's)",
    name: "Pair of bikinis in the snow (stock)",
    category: "tops",
    // Unsplash+ CDN (direct image from API `urls` / plus host). https://unsplash.com/photos/a-pair-of-bikinis-laying-in-the-snow-X5hKPjUU2Ck
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1682470124225-ed9ed8b08dce?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "eyeglasses",
    label: "Glasses",
    name: "Clear-lens eyeglasses (on white surface)",
    category: "tops",
    // Bartosz Sujkowski — frames on a white surface. https://unsplash.com/photos/a-pair-of-glasses-sitting-on-top-of-a-white-surface-0zA84TFRjI8
    imageUrl:
      "https://images.unsplash.com/photo-1646084081219-1090f72a531c?auto=format&fit=crop&w=1400&q=80",
  },
];

const PRESET_BY_ID = Object.fromEntries(GARMENT_PRESETS.map((p) => [p.id, p])) as Record<
  GarmentPreset["id"],
  GarmentPreset
>;

const PRESET_ID_SET = new Set<string>(GARMENT_PRESETS.map((p) => p.id));

type DemoCatalogId = "clothing" | "accessories" | "winter" | "swimwear" | "eyewear";

const DEMO_CATALOG: readonly {
  id: DemoCatalogId;
  title: string;
  line: string;
  Icon: LucideIcon;
  /** Preset order inside the category. */
  presetIds: readonly GarmentPreset["id"][];
}[] = [
  {
    id: "clothing",
    title: "Clothing",
    line: "T-shirts, jeans, collared tops",
    Icon: Shirt,
    presetIds: ["tee", "jeans", "sweater", "sneakers", "blouse", "boxer_shorts"],
  },
  {
    id: "accessories",
    title: "Accessories",
    line: "Necklace, earrings, bracelet, ankle bracelet, bags",
    Icon: Sparkles,
    presetIds: ["necklace", "earrings", "bracelet", "ankle_bracelet", "handbag_women", "mens_bag"],
  },
  {
    id: "winter",
    title: "Winter",
    line: "Jackets, gloves, caps & beanies",
    Icon: Snowflake,
    presetIds: ["jacket", "jacket_leather", "gloves", "cap", "beanie"],
  },
  {
    id: "swimwear",
    title: "Swimwear",
    line: "Men's and women's",
    Icon: Waves,
    presetIds: ["swim_men", "swim_women"],
  },
  {
    id: "eyewear",
    title: "Eyewear",
    line: "Aviator, round, and wayfarer sunglasses; prescription glasses",
    Icon: Glasses,
    presetIds: ["sunglasses_aviator", "sunglasses_round", "sunglasses_wayfarer", "eyeglasses"],
  },
] as const;

const DEMO_CATALOG_IDS = new Set<DemoCatalogId>(DEMO_CATALOG.map((c) => c.id));

/**
 * Browsers back/forward do not know about React `openCatalog`. We push a same-URL `history` entry
 * with `{ demoCatalog }` so Back returns to the category list instead of leaving `/demo`.
 */
function catalogIdFromHistoryState(state: unknown): DemoCatalogId | null {
  if (state == null || typeof state !== "object" || !("demoCatalog" in state)) return null;
  const id = (state as { demoCatalog?: unknown }).demoCatalog;
  if (typeof id !== "string" || !DEMO_CATALOG_IDS.has(id as DemoCatalogId)) return null;
  return id as DemoCatalogId;
}

function wearCameraFromHistoryState(state: unknown): boolean {
  if (state == null || typeof state !== "object" || !("wearCamera" in state)) return false;
  return (state as { wearCamera?: unknown }).wearCamera === true;
}

function wearModalFromHistoryState(state: unknown): boolean {
  if (state == null || typeof state !== "object") return false;
  return (state as { wearModal?: unknown }).wearModal === true;
}

function wearPresetIdFromHistoryState(state: unknown): GarmentPreset["id"] | null {
  if (state == null || typeof state !== "object") return null;
  const id = (state as { wearPresetId?: unknown }).wearPresetId;
  if (typeof id !== "string" || !PRESET_ID_SET.has(id)) return null;
  return id as GarmentPreset["id"];
}

/** How many history steps to pop to leave try-on (modal ± camera) and land on the catalog grid. */
function wearTryOnPopCount(state: unknown): number {
  if (wearCameraFromHistoryState(state)) return 2;
  if (wearModalFromHistoryState(state)) return 1;
  return 0;
}

function cloneHistoryStatePatch(state: unknown): Record<string, unknown> {
  if (state != null && typeof state === "object" && !Array.isArray(state)) {
    return { ...(state as Record<string, unknown>) };
  }
  return {};
}

/** Cycled while the try-on request is in flight (see `wearLoadingMsgIndex` + `useEffect`). */
const WEAR_LOADING_MESSAGES: readonly string[] = [
  "AI is styling your outfit...",
  "Almost ready...",
  "Adding final touches...",
  "Blending the look on you...",
  "Tuning the fit and colors...",
  "AI is processing your look... usually ready in 20-30 seconds",
];

/** Fetch as blob so cross-origin URLs still work with an object URL and `a[download]`. */
async function fetchImageBlobFromUrl(url: string): Promise<Blob> {
  const r = await fetch(url, { mode: "cors" });
  if (!r.ok) throw new Error("Could not read image");
  return r.blob();
}

/** Matches `public/widget.js` injectStyles (Wear Me + modal) for pixel-consistent /demo modal. */
const DEMO_WEAR_MODAL_STYLE_ID = "disqant-demo-wear-modal-style";
const DEMO_WEAR_MODAL_CSS =
  ".dq-wrap{display:inline-block;position:relative;vertical-align:top;line-height:0;max-width:100%;}" +
  ".dq-wrap>img{display:block;max-width:100%;height:auto;vertical-align:top;}" +
  ".dq-overlay{position:absolute;inset:auto 12px 12px auto;z-index:20;display:flex;align-items:center;pointer-events:auto;}" +
  ".dq-wear-btn{position:relative;appearance:none;border:0;cursor:pointer;padding:10px 14px;border-radius:999px;color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;letter-spacing:.2px;background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);box-shadow:0 16px 34px rgba(124,58,237,.22),0 12px 30px rgba(236,72,153,.16);transform:translateY(0) scale(1);transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;}" +
  ".dq-wear-btn:hover{transform:translateY(-2px) scale(1.03);filter:saturate(1.08);box-shadow:0 22px 44px rgba(124,58,237,.24),0 18px 36px rgba(236,72,153,.2);}" +
  ".dq-wear-btn:active{transform:translateY(-1px) scale(.99);}" +
  ".dq-wear-btn::after{content:\"\";position:absolute;inset:-2px;border-radius:999px;opacity:0;box-shadow:0 0 0 0 rgba(236,72,153,.38);transition:opacity .18s ease;}" +
  ".dq-wear-btn:hover::after{opacity:1;animation:dq-pulse 1.35s ease-out infinite;}" +
  "@keyframes dq-pulse{0%{box-shadow:0 0 0 0 rgba(236,72,153,.32)}100%{box-shadow:0 0 0 16px rgba(236,72,153,0)}}" +
  ".dq-backdrop{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:14px;opacity:0;transition:opacity .18s ease;}" +
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
  ".dq-spin{width:34px;height:34px;border-radius:999px;border:3px solid rgba(15,15,20,.14);border-top-color:#7c3aed;animation:dqspin 1s linear infinite;}" +
  "@keyframes dqspin{to{transform:rotate(360deg);}}" +
  ".dq-processing-inner{display:flex;flex-direction:column;align-items:center;gap:14px;min-height:4.5rem;justify-content:center;}" +
  ".dq-processing-text{font:900 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;text-align:center;max-width:420px;padding:0 16px;}" +
  ".dq-processing-msg{animation:dq-msg-in .42s ease both;}" +
  "@keyframes dq-msg-in{0%{opacity:0;transform:translateY(8px) scale(.99)}100%{opacity:1;transform:translateY(0) scale(1)}}" +
  ".dq-progress{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;height:10px;border-radius:999px;background:rgba(15,15,20,.10);overflow:hidden;display:none;}" +
  ".dq-progress.is-on{display:block;}" +
  ".dq-progress>span{display:block;height:100%;width:0%;background:linear-gradient(135deg,#7c3aed,#c084fc 45%,#ec4899 100%);background-size:200% 100%;transition:width .12s ease;position:relative;animation:dq-bar-pulse 1.9s ease-in-out infinite;}" +
  "@keyframes dq-bar-pulse{0%,100%{background-position:0% 50%;filter:brightness(1)}50%{background-position:100% 50%;filter:brightness(1.12)}}" +
  ".dq-row{display:flex;gap:10px;flex-wrap:wrap;}" +
  ".dq-choice{flex:1;min-width:160px;display:flex;align-items:center;gap:10px;justify-content:center;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-choice:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-ico{width:18px;height:18px;display:inline-block;opacity:.92;}" +
  ".dq-primary{appearance:none;border:0;cursor:pointer;border-radius:16px;padding:12px 12px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 16px 34px rgba(124,58,237,.18),0 12px 30px rgba(236,72,153,.14);transition:transform .16s ease, filter .16s ease, box-shadow .16s ease;}" +
  ".dq-primary:hover{transform:translateY(-1px) scale(1.01);filter:saturate(1.05);}" +
  ".dq-primary:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none;}" +
  ".dq-save{appearance:none;border:1px solid rgba(15,15,20,.12);background:#fff;color:#0f0f14;cursor:pointer;border-radius:16px;padding:12px 12px;font:900 13px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.06);transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-save:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-brand{padding:12px 12px;border-top:1px solid rgba(15,15,20,.08);display:flex;align-items:center;justify-content:flex-start;background:#fff;}" +
  ".dq-brand span{font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f0f14;letter-spacing:.25px;}" +
  ".dq-brand small{margin-left:8px;font:700 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:rgba(15,15,20,.55);}" +
  ".dq-cam-row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch;}" +
  ".dq-flip{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:12px 14px;border-radius:16px;border:1px solid rgba(15,15,20,.10);background:#fff;color:#0f0f14;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.06);font:900 12px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;transition:transform .16s ease, box-shadow .16s ease;}" +
  ".dq-flip:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(0,0,0,.09);}" +
  ".dq-flip:disabled{opacity:.55;cursor:not-allowed;transform:none;}" +
  ".dq-cam-row .dq-primary{flex:1;min-width:0;}" +
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
        "[disquant] browser: about to fetch POST /api/tryon (one successful log per try-on; if you see 2+ per click, the client is firing more than one request before the in-flight ref blocks it)",
        { tryOnTrace },
      );
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: reqHeaders,
        body: fd,
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
        if (
          res.status === 403 &&
          "code" in data &&
          data.code === "USAGE_LIMIT" &&
          data.keyKind === "demo"
        ) {
          setWearError(
            "You've explored all our demo try-ons! Ready to bring this to your store? Contact us at hello@disqant.com to get started",
          );
          setWearProcessing(false);
          setWearShowProgress(false);
          return;
        }
        if (res.status === 403 && "code" in data && data.code === "USAGE_LIMIT") {
          setWearError("Virtual try-on temporarily unavailable. Please try again later");
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
      const fileName = `disqant-tryon.${ext}`;

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
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
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
              <span>Disqant</span>
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

      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
          Virtual try-on demo
        </h1>
        <p className="mt-4 text-zinc-400">
          Tap <span className="font-semibold text-zinc-100">Wear Me ✨</span> on a sample product, then upload your
          photo in the modal (gallery or camera), generate, and download your try-on.
        </p>

        <div
          className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          {!openCatalog ? (
            <>
              <p className="text-sm font-medium text-zinc-200">Product catalog</p>
              <p className="mt-1 text-xs text-zinc-500">Choose a category, then pick a product to try on.</p>
              <ul
                className="mt-6 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                role="list"
              >
                {DEMO_CATALOG.map((cat) => {
                  const Icon = cat.Icon;
                  return (
                    <li key={cat.id} className="w-full">
                      <button
                        type="button"
                        onClick={() => openProductCatalog(cat.id)}
                        className="group flex w-full flex-col items-center text-center"
                      >
                        <div
                          className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-zinc-700/90 bg-gradient-to-b from-zinc-800/95 to-zinc-950/90 p-0 shadow-md shadow-black/40 transition group-hover:border-accent/45 group-hover:shadow-lg group-hover:shadow-violet-900/20"
                        >
                          <div className="flex items-center justify-center border-b border-zinc-700/80 bg-zinc-800/80 py-2">
                            <Folder className="h-4 w-4 text-zinc-500" strokeWidth={2} aria-hidden />
                            <span className="ml-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                              Category
                            </span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8">
                            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/80 text-violet-300 ring-1 ring-zinc-600/60">
                              <Icon className="h-8 w-8" strokeWidth={1.8} aria-hidden />
                            </span>
                            <p className="text-sm font-medium text-zinc-300">{cat.line}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-base font-semibold tracking-tight text-zinc-100">{cat.title}</p>
                        <span className="text-xs text-zinc-500">Open folder</span>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                  All categories
                </button>
                {openCatalogDef ? (
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-medium text-zinc-200">Sample products</p>
                    <p className="text-xs text-zinc-500">
                      {openCatalogDef.title} — {openCatalogDef.line}
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Highlighted card is your current selection for try-on.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {visiblePresets.map((p) => {
                  const selected = p.id === selectedPresetId;
                  return (
                    <article
                      key={p.id}
                      className={`group overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                        selected
                          ? "border-accent/50 bg-zinc-900 ring-2 ring-accent/25"
                          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:shadow-md"
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
                            className="dq-wear-btn pointer-events-auto shadow-lg"
                            aria-label="Wear Me"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openWearMe(p);
                            }}
                          >
                            Wear Me ✨
                          </button>
                        </div>
                      </div>
                      <div
                        role="presentation"
                        className="cursor-pointer border-t border-zinc-800 p-4"
                        onClick={() => setSelectedPresetId(p.id)}
                      >
                        <p className="text-sm font-semibold text-zinc-100">{p.name}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-400">{p.label}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

