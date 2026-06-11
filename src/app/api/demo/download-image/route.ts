import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin download proxy for try-on result images.
 *
 * The try-on output is hosted cross-origin (FASHN CDN), so a client-side
 * `fetch(url, { mode: "cors" })` for a download blob is blocked by the browser.
 * Streaming the bytes through our own origin with `Content-Disposition: attachment`
 * makes the download reliable for every flow (catalogue + "Try your own items").
 *
 * Host allowlist prevents this endpoint from being abused as an open SSRF proxy.
 */
const ALLOWED_HOST_SUFFIXES = [
  "fashn.ai",
  "fal.media",
  "fal.ai",
  "amazonaws.com",
  "cloudfront.net",
  "r2.dev",
  "r2.cloudflarestorage.com",
  "blob.core.windows.net",
  "storage.googleapis.com",
  "googleusercontent.com",
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function sanitizeFilename(raw: string | null): string {
  const base = (raw ?? "fit-room-tryon").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
  return base.length > 0 ? base : "fit-room-tryon";
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid url." }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return Response.json({ error: "Only https URLs are allowed." }, { status: 400 });
  }
  if (!isAllowedHost(target.hostname)) {
    return Response.json({ error: "URL host is not allowed." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), { redirect: "follow" });
  } catch {
    return Response.json({ error: "Could not fetch the image." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Could not fetch the image." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return Response.json({ error: "Resource is not an image." }, { status: 415 });
  }

  const filename = `${sanitizeFilename(req.nextUrl.searchParams.get("filename"))}.${extensionForContentType(contentType)}`;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "private, no-store");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(upstream.body, { status: 200, headers });
}
