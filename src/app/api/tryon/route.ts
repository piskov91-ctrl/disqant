import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { assertClientCanUseByApiKey, incrementUsageOrThrow, listClientKeys } from "@/lib/apiKeyStore";
import { recordTryOnProductUsage } from "@/lib/tryOnAnalytics";

export const runtime = "nodejs";

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
 * Coerced hint for our JSON only (`/api/tryon` response). We do **not** send this to Fashn:
 * `tryon-max` public inputs are `model_image`, `product_image`, and optional `generation_mode`, etc. — no `garment_type` in our body.
 * Map legacy `"shoes"` to `"bottoms"` so we never label a run with a separate shoe "category" (some UIs/keys may still POST `shoes` from old embeds).
 * @see https://docs.fashn.ai/api-reference/tryon-max
 */
type GarmentCategoryHint = "tops" | "bottoms";

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

async function startPrediction(params: {
  apiKey: string;
  modelImage: string;
  productImage: string;
  generationMode: "balanced" | "quality";
  serverTrace: string;
}) {
  const { apiKey, modelImage, productImage, generationMode, serverTrace } = params;

  const baseUrl = "https://api.fashn.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Try-On Max: required `model_image`, `product_image`; optional `generation_mode`, etc.
  const body = {
    model_name: "tryon-max",
    inputs: {
      model_image: modelImage,
      product_image: productImage,
      generation_mode: generationMode,
    },
  };

  const runUrl = `${baseUrl}/run`;
  // Billing: Fashn credits are consumed per /v1/run (not per /status poll).
  console.log("[disquant][Fashn] about to call POST (creates one prediction job / charges credits)", {
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

export async function POST(req: Request) {
  const serverTrace = randomUUID();
  const clientTrace = req.headers.get("x-tryon-trace")?.trim() || null;
  console.log("[disquant][tryon] /api/tryon (or /api/try-on) handler invoked (HTTP POST) — if you see 2 of these for one user click, the client (or a proxy) sent duplicate requests", {
    serverTrace,
    clientTrace,
  });

  const clientApiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("x-disquant-api-key") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice("Bearer ".length)
      : null);

  let effectiveClientApiKey = clientApiKey || process.env.DISQUANT_DEMO_TEST_CLIENT_KEY || null;
  if (!effectiveClientApiKey) {
    // Final fallback for /demo: use the newest key in the DB so the demo works
    // without exposing keys in the UI or URL.
    const keys = await listClientKeys();
    effectiveClientApiKey = keys[0]?.key ?? null;
  }
  if (!effectiveClientApiKey) {
    return Response.json({ error: "Missing client API key." }, { status: 401 });
  }

  let client: Awaited<ReturnType<typeof assertClientCanUseByApiKey>>;
  try {
    client = await assertClientCanUseByApiKey(effectiveClientApiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized.";
    const isUsage = msg === "Usage limit exceeded.";
    if (isUsage) {
      return Response.json(
        {
          error: msg,
          code: "USAGE_LIMIT",
          keyKind: clientApiKey ? "client" : "demo",
        },
        { status: 403 },
      );
    }
    return Response.json({ error: msg }, { status: 401 });
  }

  // Note: /demo page itself is still access-code gated, but this API now requires a client API key.
  await cookies();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const modelFile = form.get("model");
  const garmentFile = form.get("garment");
  /** Source product image URL when the garment is not only a user upload (e.g. preset or catalog URL). */
  const productImageUrlField = String(form.get("productImageUrl") ?? form.get("garmentUrl") ?? "")
    .trim()
    .slice(0, 4000);
  const category = resolveGarmentCategoryHint(form);
  const generationMode = parseGenerationMode(form);

  if (!(modelFile instanceof File) || !(garmentFile instanceof File)) {
    return Response.json(
      { error: "Please upload both a person photo and a garment image." },
      { status: 400 },
    );
  }

  const modelImage = await fileToDataUrl(modelFile);
  const productImage = await fileToDataUrl(garmentFile);

  const first = await startPrediction({
    apiKey: client.fashnApiKey || process.env.FASHN_API_KEY || "",
    modelImage,
    productImage,
    generationMode,
    serverTrace,
  });

  if (!first.ok) {
    return Response.json({ error: first.error }, { status: 502 });
  }

  const result = await pollUntilDone({
    id: first.id,
    headers: first.headers,
    baseUrl: first.baseUrl,
    timeoutMs: 120_000,
    pollMs: 1200,
    category,
    serverTrace,
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
  }
  return result.response;
}

async function pollUntilDone(params: {
  id: string;
  headers: Record<string, string>;
  baseUrl: string;
  timeoutMs: number;
  pollMs: number;
  category: GarmentCategoryHint;
  serverTrace: string;
}): Promise<{ ok: true; response: Response } | { ok: false; response: Response }> {
  const { id, headers, baseUrl, timeoutMs, pollMs, category, serverTrace } = params;
  const startedAt = Date.now();
  let pollN = 0;
  const isDev = process.env.NODE_ENV === "development";

  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      return {
        ok: false,
        response: Response.json(
        { error: "Timed out waiting for try-on result. Please try again." },
        { status: 504 },
        ),
      };
    }

    pollN += 1;
    const statusUrl = `${baseUrl}/status/${id}`;
    if (isDev || pollN === 1) {
      console.log("[disquant][Fashn] about to call GET (status poll; not the billed /run call)", {
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
        response: Response.json(
        { error: `FASHN /status failed (${statusRes.status}). ${text || ""}`.trim() },
        { status: 502 },
        ),
      };
    }

    const statusData = (await statusRes.json()) as FashnStatusResponse;
    if (statusData.status === "completed") {
      const out = statusData.output?.[0];
      if (!out) {
        return {
          ok: false,
          response: Response.json(
            { error: "FASHN completed but returned no output." },
            { status: 502 },
          ),
        };
      }
      return {
        ok: true,
        response: Response.json({ id, output: statusData.output, category }),
      };
    }

    if (statusData.status === "failed") {
      return {
        ok: false,
        response: Response.json(
          { error: statusData.error || "Try-on failed." },
          { status: 502 },
        ),
      };
    }

    await sleep(pollMs);
  }
}


