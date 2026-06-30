import type { MetadataRoute } from "next";

function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "https://fit-room.com";
}

/** Public marketing pages included in /sitemap.xml */
const PUBLIC_PATHS: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/demo", priority: 0.9 },
  { path: "/subscriptions", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/about-us", priority: 0.8 },
  { path: "/contact", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
