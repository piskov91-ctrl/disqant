import { readFile } from "node:fs/promises";
import path from "node:path";

/** Platform keys matched to dropdown in admin Send Email (+ retailer Custom). */
export type WearMePdfPlatformSlug = "shopify" | "wordpress" | "wix" | "squarespace" | "custom";

/**
 * Attachment basename for each integration email — matches files in `/public/`
 * (`https://your-domain/fitroom-….pdf`).
 */
export function wearMeGuidePdfFilename(platform: WearMePdfPlatformSlug): string {
  switch (platform) {
    case "shopify":
      return "fitroom-shopify-simple.pdf";
    case "wordpress":
      return "fitroom-wordpress-guide.pdf";
    case "wix":
      return "fitroom-wix-guide.pdf";
    case "squarespace":
      return "fitroom-squarespace-guide.pdf";
    case "custom":
      return "fitroom-custom-guide.pdf";
  }
}

export async function readWearMeGuidePdfFile(
  platform: WearMePdfPlatformSlug,
): Promise<{ filename: string; buffer: Buffer }> {
  const filename = wearMeGuidePdfFilename(platform);
  const fullPath = path.join(process.cwd(), "public", filename);
  const buf = await readFile(fullPath);
  return { filename, buffer: buf };
}
