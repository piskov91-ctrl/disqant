import { cookies } from "next/headers";
import { assertClientCanUseByApiKey, incrementUsageOrThrow, listClientKeys } from "@/lib/apiKeyStore";

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
 * Client garment hint for our JSON response only.
 * Try-On Max (`/v1/run`) does not document a `category` input; product type is inferred from images.
 * @see https://docs.fashn.ai/api-reference/tryon-max
 */
type GarmentCategoryHint = "tops" | "shoes" | "bottoms";

function resolveGarmentCategoryHint(form: FormData): GarmentCategoryHint {
  const fromForm = String(form.get("category") || "")
    .trim()
    .toLowerCase();
  if (fromForm === "shoes") return "shoes";
  if (fromForm === "bottoms") return "bottoms";

  const tryOn = String(form.get("tryOnType") || "").trim().toLowerCase();
  if (tryOn === "shoes") return "shoes";
  if (tryOn === "bottoms") return "bottoms";

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
}) {
  const { apiKey, modelImage, productImage, generationMode } = params;

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

  const runRes = await fetch(`${baseUrl}/run`, {
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
  });
  if (result.ok) {
    try {
      await incrementUsageOrThrow(client.id);
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
}): Promise<{ ok: true; response: Response } | { ok: false; response: Response }> {
  const { id, headers, baseUrl, timeoutMs, pollMs, category } = params;
  const startedAt = Date.now();

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

    const statusRes = await fetch(`${baseUrl}/status/${id}`, { headers });
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


