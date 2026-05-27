/**
 * Cross-origin embeds: opaque (`Origin: null`, e.g. file://) and local dev hosts must be
 * echoed in `Access-Control-Allow-Origin`; `*` is invalid for `null` in many browsers.
 * Other storefront origins keep `*` so we do not maintain a full retailer allowlist.
 */
const EMBED_CORS_REFLECT_ORIGINS = new Set<string>(["null", "http://localhost:8080"]);

/** Value for `Access-Control-Allow-Origin` on this response. */
export function resolveEmbedCorsAllowOrigin(originHeader: string | null): string {
  const o = originHeader?.trim() ?? "";
  if (EMBED_CORS_REFLECT_ORIGINS.has(o)) return o;
  return "*";
}

/** Omit `Allow-Origin` — set dynamically (see `resolveEmbedCorsAllowOrigin`). Shared by `/api/tryon` and `/api/try-on`. */
export const TRY_ON_EMBED_CORS_BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-tryon-trace",
};

/** CORS preflight for POST try-on (`FormData` + custom headers triggers browser OPTIONS). */
export function tryOnEmbedOptionsResponse(request: Request): Response {
  const allowOrigin = resolveEmbedCorsAllowOrigin(request.headers.get("Origin"));
  return new Response(null, {
    status: 204,
    headers: {
      ...TRY_ON_EMBED_CORS_BASE_HEADERS,
      "Access-Control-Allow-Origin": allowOrigin,
    },
  });
}
