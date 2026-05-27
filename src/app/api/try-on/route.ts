export { OPTIONS, POST } from "../tryon/route";

/** `runtime` stays here so Next applies Node.js to `/api/try-on`; handlers live in `tryon/route.ts`. */
export const runtime = "nodejs";

