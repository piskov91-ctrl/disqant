import { readFile } from "node:fs/promises";
import path from "node:path";

/** Matches filenames in `/public/guides/wear-me-{slug}.pdf`. */
export type WearMePdfPlatformSlug = "shopify" | "wordpress" | "wix" | "squarespace" | "custom";

export function wearMeGuidePdfFilename(platform: WearMePdfPlatformSlug): string {
  return `wear-me-${platform}.pdf`;
}

export async function readWearMeGuidePdfFile(
  platform: WearMePdfPlatformSlug,
): Promise<{ filename: string; buffer: Buffer }> {
  const filename = wearMeGuidePdfFilename(platform);
  const fullPath = path.join(process.cwd(), "public", "guides", filename);
  const buf = await readFile(fullPath);
  return { filename, buffer: buf };
}
