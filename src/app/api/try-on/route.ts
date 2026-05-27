import { tryOnEmbedOptionsResponse } from "@/lib/embedCors";

/** `runtime` stays here so Next applies Node.js to `/api/try-on`. */
export const runtime = "nodejs";

export { POST } from "../tryon/route";

/** Own preflight handler for this path (duplicate of `/api/tryon` OPTIONS; POST CORS merges in tryon/route). */
export function OPTIONS(request: Request) {
  return tryOnEmbedOptionsResponse(request);
}
