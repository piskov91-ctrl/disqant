"use client";

import {
  Gem,
  Glasses,
  Shirt,
  Snowflake,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { GarmentCategoryHint } from "@/lib/wearMeShared";

export type GarmentPreset = {
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

export const GARMENT_PRESETS: GarmentPreset[] = [
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

export const PRESET_BY_ID = Object.fromEntries(GARMENT_PRESETS.map((p) => [p.id, p])) as Record<
  GarmentPreset["id"],
  GarmentPreset
>;

export const PRESET_ID_SET = new Set<string>(GARMENT_PRESETS.map((p) => p.id));

export type DemoCatalogId = "clothing" | "accessories" | "winter" | "swimwear" | "eyewear";

export const DEMO_CATALOG: readonly {
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
    Icon: Gem,
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

export const DEMO_CATALOG_IDS = new Set<DemoCatalogId>(DEMO_CATALOG.map((c) => c.id));

/**
 * Browsers back/forward do not know about React `openCatalog`. We push a same-URL `history` entry
 * with `{ demoCatalog }` so Back returns to the category list instead of leaving `/demo`.
 */
export function catalogIdFromHistoryState(state: unknown): DemoCatalogId | null {
  if (state == null || typeof state !== "object" || !("demoCatalog" in state)) return null;
  const id = (state as { demoCatalog?: unknown }).demoCatalog;
  if (typeof id !== "string" || !DEMO_CATALOG_IDS.has(id as DemoCatalogId)) return null;
  return id as DemoCatalogId;
}

export function wearCameraFromHistoryState(state: unknown): boolean {
  if (state == null || typeof state !== "object" || !("wearCamera" in state)) return false;
  return (state as { wearCamera?: unknown }).wearCamera === true;
}

export function wearModalFromHistoryState(state: unknown): boolean {
  if (state == null || typeof state !== "object") return false;
  return (state as { wearModal?: unknown }).wearModal === true;
}

export function wearPresetIdFromHistoryState(state: unknown): GarmentPreset["id"] | null {
  if (state == null || typeof state !== "object") return null;
  const id = (state as { wearPresetId?: unknown }).wearPresetId;
  if (typeof id !== "string" || !PRESET_ID_SET.has(id)) return null;
  return id as GarmentPreset["id"];
}

/** How many history steps to pop to leave try-on (modal ± camera) and land on the catalog grid. */
export function wearTryOnPopCount(state: unknown): number {
  if (wearCameraFromHistoryState(state)) return 2;
  if (wearModalFromHistoryState(state)) return 1;
  return 0;
}

export function cloneHistoryStatePatch(state: unknown): Record<string, unknown> {
  if (state != null && typeof state === "object" && !Array.isArray(state)) {
    return { ...(state as Record<string, unknown>) };
  }
  return {};
}

