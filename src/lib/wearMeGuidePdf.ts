import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Public folder PDFs: `/public/guides/fitroom-{platform}-guide.pdf`
 * e.g. `fitroom-shopify-guide.pdf`, `fitroom-custom-guide.pdf`.
 */
export type WearMePdfPlatformSlug = "shopify" | "wordpress" | "wix" | "squarespace" | "custom";

export function wearMeGuidePdfFilename(platform: WearMePdfPlatformSlug): string {
  return `fitroom-${platform}-guide.pdf`;
}

export async function readWearMeGuidePdfFile(
  platform: WearMePdfPlatformSlug,
): Promise<{ filename: string; buffer: Buffer }> {
  const filename = wearMeGuidePdfFilename(platform);
  const fullPath = path.join(process.cwd(), "public", "guides", filename);
  const buf = await readFile(fullPath);
  return { filename, buffer: buf };
}
