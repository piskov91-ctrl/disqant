import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { assertClientCanUseByApiKey, getClientKeyRecordById, incrementUsageOrThrow } from "@/lib/apiKeyStore";
import {
  DEMO_ANALYTICS_SESSION_COOKIE,
  getRequestClientIp,
  recordTryOnCompleted,
} from "@/lib/platformAnalytics";
import { recordTryOnProductUsage } from "@/lib/tryOnAnalytics";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { retailerHasActiveSubscriptionForAds } from "@/lib/retailerWidgetAd";
import {
  resolveEmbedCorsAllowOrigin,
  TRY_ON_EMBED_CORS_BASE_HEADERS,
  tryOnEmbedOptionsResponse,
} from "@/lib/embedCors";
import { recordTryOnErrorLog } from "@/lib/tryOnErrorLogStore";

export const runtime = "nodejs";

/** Multipart body limit for model + garment uploads — configured in next.config.ts (`50mb`). */

export function OPTIONS(request: Request) {
  return tryOnEmbedOptionsResponse(request);
}

function withTryOnCors(response: Response, allowOrigin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  for (const [k, v] of Object.entries(TRY_ON_EMBED_CORS_BASE_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Fashn virtual try-on: Try-On Max (higher fidelity than v1.6; higher credit use). @see https://docs.fashn.ai/api-reference/tryon-max */
const FASHN_TRYON_MODEL = "tryon-max" as const;

type FashnRunResponse = {
  id?: string;
  error?: unknown;
};

type FashnStatusResponse = {
  id: string;
  status: "starting" | "in_queue" | "processing" | "completed" | "failed" | string;
  output?: string[];
  error?: unknown;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  // Node.js: Buffer is available in the route runtime.
  return Buffer.from(buffer).toString("base64");
}

async function fileToDataUrl(file: File) {
  const mime = file.type || "image/jpeg";
  const base64 = arrayBufferToBase64(await file.arrayBuffer());
  return `data:${mime};base64,${base64}`;
}

/**
 * Coerced hint for our JSON only (`/api/tryon` response). Try-On Max does not take this field; it is for clients/legacy embeds.
 * Map legacy `"shoes"` to `"bottoms"` so we never label a run with a separate shoe "category" (some UIs/keys may still POST `shoes` from old embeds).
 */
type GarmentCategoryHint = "tops" | "bottoms";

type TryOnMaxResolution = "1k" | "2k" | "4k";

function serializeFashnError(err: unknown): string {
  if (err == null) return "Try-on failed.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Try-on failed.";
  }
}

function logTryOnFailure(message: string, apiKey: string | null, statusCode: number) {
  void recordTryOnErrorLog({
    message,
    apiKey: apiKey?.trim() || "(none)",
    statusCode,
  }).catch((err) => {
    console.error("[fit-room][tryOnErrorLog] failed to persist", {
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

function tryOnErrorJson(
  error: string,
  status: number,
  apiKey: string | null,
  corsAllowOrigin: string,
  extra?: Record<string, unknown>,
) {
  logTryOnFailure(error, apiKey, status);
  return withTryOnCors(Response.json({ error, ...extra }, { status }), corsAllowOrigin);
}

function resolveGarmentCategoryHint(form: FormData): GarmentCategoryHint {
  const fromForm = String(form.get("category") || "")
    .trim()
    .toLowerCase();
  if (fromForm === "shoes" || fromForm === "bottoms") return "bottoms";

  const tryOn = String(form.get("tryOnType") || "").trim().toLowerCase();
  if (tryOn === "shoes" || tryOn === "bottoms") return "bottoms";

  return "tops";
}

function parseGenerationMode(form: FormData): "balanced" | "quality" {
  const raw = String(form.get("generationMode") || form.get("mode") || "balanced")
    .trim()
    .toLowerCase();
  return raw === "quality" ? "quality" : "balanced";
}

function parseResolution(form: FormData): TryOnMaxResolution {
  const raw = String(form.get("resolution") || "1k").trim().toLowerCase();
  if (raw === "2k") return "2k";
  if (raw === "4k") return "4k";
  return "1k";
}

async function startPrediction(params: {
  apiKey: string;
  /** Person image (Try-On Max `model_image`). */
  modelImage: string;
  /** Garment / product image (Try-On Max `product_image`). */
  productImage: string;
  generationMode: "balanced" | "quality";
  resolution: TryOnMaxResolution;
  serverTrace: string;
}) {
  const { apiKey, modelImage, productImage, generationMode, resolution, serverTrace } = params;

  const baseUrl = "https://api.fashn.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Try-On Max: `product_image` + `model_image`, optional `resolution`, `generation_mode`.
  // @see https://docs.fashn.ai/api-reference/tryon-max
  const body = {
    model_name: FASHN_TRYON_MODEL,
    inputs: {
      product_image: productImage,
      model_image: modelImage,
      resolution,
      generation_mode: generationMode,
    },
  };

  const runUrl = `${baseUrl}/run`;
  // Billing: Fashn credits are consumed per /v1/run (not per /status poll).
  console.log("[fit-room][Fashn] about to call POST (creates one prediction job / charges credits)", {
    runUrl,
    serverTrace,
  });
  const runRes = await fetch(runUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    return { ok: false as const, error: `FASHN /run failed (${runRes.status}). ${text || ""}`.trim() };
  }

  const runData = (await runRes.json()) as FashnRunResponse;
  const id = runData.id;
  if (!id) return { ok: false as const, error: "FASHN did not return a prediction id." };
  return { ok: true as const, id, headers, baseUrl };
}

type ResolvedTryOnApiKey =
  | { ok: true; apiKey: string; isRetailerTryOn: boolean; usedAnonymousDemoKey: boolean }
  | { ok: false; error: string; status: number; apiKeyForLog: string | null };

async function resolveTryOnClientApiKey(req: Request): Promise<ResolvedTryOnApiKey> {
  const headerApiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("x-fit-room-api-key") ||
    req.headers.get("x-disquant-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice("Bearer ".length)
      : null);

  const sessionUser = await getRetailerSessionUser();
  if (sessionUser) {
    if (!retailerHasActiveSubscriptionForAds(sessionUser)) {
      return {
        ok: false,
        error: "Your subscription is not active. Subscribe or renew to run try-ons on your account.",
        status: 403,
        apiKeyForLog: headerApiKey?.trim() || null,
      };
    }

    const linkedId = sessionUser.clientId?.trim() || "";
    if (!linkedId) {
      return {
        ok: false,
        error: "No API key is linked to your account. Subscribe or contact support.",
        status: 403,
        apiKeyForLog: headerApiKey?.trim() || null,
      };
    }

    const client = await getClientKeyRecordById(linkedId);
    const linkedKey = client?.key?.trim() || "";
    if (!linkedKey || client?.deletedAt) {
      return {
        ok: false,
        error: "Your account API key is unavailable. Please contact support.",
        status: 403,
        apiKeyForLog: headerApiKey?.trim() || null,
      };
    }

    return {
      ok: true,
      apiKey: linkedKey,
      isRetailerTryOn: true,
      usedAnonymousDemoKey: false,
    };
  }

  const trimmedHeader = headerApiKey?.trim() || "";
  if (trimmedHeader) {
    return {
      ok: true,
      apiKey: trimmedHeader,
      isRetailerTryOn: true,
      usedAnonymousDemoKey: false,
    };
  }

  const demoKey = process.env.DEMO_API_KEY?.trim() || "";
  if (!demoKey) {
    return {
      ok: false,
      error: "Try It Free is not configured. Set DEMO_API_KEY for this environment.",
      status: 503,
      apiKeyForLog: null,
    };
  }

  return {
    ok: true,
    apiKey: demoKey,
    isRetailerTryOn: false,
    usedAnonymousDemoKey: true,
  };
}

export async function POST(req: Request) {
  const corsAllowOrigin = resolveEmbedCorsAllowOrigin(req.headers.get("Origin"));
  const serverTrace = randomUUID();
  const clientTrace = req.headers.get("x-tryon-trace")?.trim() || null;
  console.log("[fit-room][tryon] /api/tryon (or /api/try-on) handler invoked (HTTP POST) — if you see 2 of these for one user click, the client (or a proxy) sent duplicate requests", {
    serverTrace,
    clientTrace,
  });

  const resolved = await resolveTryOnClientApiKey(req);
  if (!resolved.ok) {
    return tryOnErrorJson(resolved.error, resolved.status, resolved.apiKeyForLog, corsAllowOrigin);
  }

  const effectiveClientApiKey = resolved.apiKey;
  const isRetailerTryOn = resolved.isRetailerTryOn;
  const usedAnonymousDemoKey = resolved.usedAnonymousDemoKey;

  let client: Awaited<ReturnType<typeof assertClientCanUseByApiKey>>;
  try {
    client = await assertClientCanUseByApiKey(effectiveClientApiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized.";
    const isUsage = msg === "Try-on limit exceeded.";
    if (isUsage) {
      return withTryOnCors(
        Response.json(
          {
            error: msg,
            code: "USAGE_LIMIT",
            keyKind: usedAnonymousDemoKey ? "demo" : "client",
          },
          { status: 403 },
        ),
        corsAllowOrigin,
      );
    }
    return tryOnErrorJson(msg, 401, effectiveClientApiKey, corsAllowOrigin);
  }

  // Note: /demo page itself is still access-code gated, but this API now requires a client API key.
  const cookieJar = await cookies();
  const demoSessionId = cookieJar.get(DEMO_ANALYTICS_SESSION_COOKIE)?.value?.trim() || null;
  const demoIp = getRequestClientIp(req);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return tryOnErrorJson("Invalid form data.", 400, effectiveClientApiKey, corsAllowOrigin);
  }

  const modelFile = form.get("model");
  const garmentFile = form.get("garment");
  /** Source product image URL when the garment is not only a user upload (e.g. preset or catalog URL). */
  const productImageUrlField = String(form.get("productImageUrl") ?? form.get("garmentUrl") ?? "")
    .trim()
    .slice(0, 4000);
  const category = resolveGarmentCategoryHint(form);
  const generationMode = parseGenerationMode(form);
  const resolution = parseResolution(form);

  if (!(modelFile instanceof File) || !(garmentFile instanceof File)) {
    return tryOnErrorJson(
      "Please upload both a person photo and a garment image.",
      400,
      effectiveClientApiKey,
      corsAllowOrigin,
    );
  }

  const modelImage = await fileToDataUrl(modelFile);
  const productImage = await fileToDataUrl(garmentFile);

  const first = await startPrediction({
    apiKey: client.fashnApiKey || process.env.FASHN_API_KEY || "",
    modelImage,
    productImage,
    generationMode,
    resolution,
    serverTrace,
  });

  if (!first.ok) {
    return tryOnErrorJson(first.error, 502, effectiveClientApiKey, corsAllowOrigin);
  }

  const result = await pollUntilDone({
    id: first.id,
    headers: first.headers,
    baseUrl: first.baseUrl,
    timeoutMs: 180_000,
    pollMs: 1200,
    category,
    serverTrace,
    corsAllowOrigin,
    clientApiKey: effectiveClientApiKey,
  });
  if (result.ok) {
    const at = new Date().toISOString();
    try {
      await incrementUsageOrThrow(client.id);
      void recordTryOnProductUsage({
        clientId: client.id,
        productImageUrl: productImageUrlField,
        at,
      });
    } catch {
      // Usage enforcement is checked before starting; ignore rare race here.
    }
    void recordTryOnCompleted({
      isRetailer: isRetailerTryOn,
      clientId: client.id,
      clientName: client.clientName,
      demoSessionId,
      demoIp,
    });
  }
  return withTryOnCors(result.response, corsAllowOrigin);
}

async function pollUntilDone(params: {
  id: string;
  headers: Record<string, string>;
  baseUrl: string;
  timeoutMs: number;
  pollMs: number;
  category: GarmentCategoryHint;
  serverTrace: string;
  corsAllowOrigin: string;
  clientApiKey: string;
}): Promise<{ ok: true; response: Response } | { ok: false; response: Response }> {
  const { id, headers, baseUrl, timeoutMs, pollMs, category, serverTrace, corsAllowOrigin, clientApiKey } =
    params;
  const startedAt = Date.now();
  let pollN = 0;
  const isDev = process.env.NODE_ENV === "development";

  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      return {
        ok: false,
        response: tryOnErrorJson(
          "Timed out waiting for try-on result. Please try again.",
          504,
          clientApiKey,
          corsAllowOrigin,
        ),
      };
    }

    pollN += 1;
    const statusUrl = `${baseUrl}/status/${id}`;
    if (isDev || pollN === 1) {
      console.log("[fit-room][Fashn] about to call GET (status poll; not the billed /run call)", {
        statusUrl,
        id,
        serverTrace,
        pollN,
      });
    }
    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      const text = await statusRes.text().catch(() => "");
      return {
        ok: false,
        response: tryOnErrorJson(
          `FASHN /status failed (${statusRes.status}). ${text || ""}`.trim(),
          502,
          clientApiKey,
          corsAllowOrigin,
        ),
      };
    }

    const statusData = (await statusRes.json()) as FashnStatusResponse;
    if (statusData.status === "completed") {
      const out = statusData.output?.[0];
      if (!out) {
        return {
          ok: false,
          response: tryOnErrorJson(
            "FASHN completed but returned no output.",
            502,
            clientApiKey,
            corsAllowOrigin,
          ),
        };
      }
      return {
        ok: true,
        response: withTryOnCors(
          Response.json({ id, output: statusData.output, category }),
          corsAllowOrigin,
        ),
      };
    }

    if (statusData.status === "failed") {
      return {
        ok: false,
        response: tryOnErrorJson(
          serializeFashnError(statusData.error),
          502,
          clientApiKey,
          corsAllowOrigin,
        ),
      };
    }

    await sleep(pollMs);
  }
}


