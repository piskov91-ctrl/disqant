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
