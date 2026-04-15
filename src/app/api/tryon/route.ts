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

async function startPrediction(params: {
  apiKey: string;
  modelName: "tryon-v1.6" | "tryon-max";
  mode: string;
  outputFormat: string;
  returnBase64: boolean;
  modelImage: string;
  garmentOrProductImage: string;
}) {
  const { apiKey, modelName, mode, outputFormat, returnBase64, modelImage, garmentOrProductImage } =
    params;

  const baseUrl = "https://api.fashn.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const isMax = modelName === "tryon-max";
  const body = isMax
    ? {
        model_name: "tryon-max",
        inputs: {
          model_image: modelImage,
          product_image: garmentOrProductImage,
          generation_mode: mode === "quality" ? "quality" : "balanced",
          resolution: "1k",
          output_format: outputFormat,
          return_base64: returnBase64,
        },
      }
    : {
        model_name: "tryon-v1.6",
        inputs: {
          model_image: modelImage,
          garment_image: garmentOrProductImage,
          mode,
          output_format: outputFormat,
          return_base64: returnBase64,
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
  return { ok: true as const, id, headers, baseUrl, isMax };
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
  const tryOnTypeRaw = String(form.get("tryOnType") || "clothing");
  const tryOnType = tryOnTypeRaw === "shoes" ? "shoes" : "clothing";
  const mode = String(form.get("mode") || "balanced");
  const outputFormat = String(form.get("outputFormat") || "png");
  const returnBase64 = String(form.get("returnBase64") || "true") === "true";

  if (!(modelFile instanceof File) || !(garmentFile instanceof File)) {
    return Response.json(
      { error: "Please upload both a person photo and a garment image." },
      { status: 400 },
    );
  }

  const modelImage = await fileToDataUrl(modelFile);
  const garmentImage = await fileToDataUrl(garmentFile);

  const firstModel: "tryon-v1.6" | "tryon-max" =
    tryOnType === "shoes" ? "tryon-max" : "tryon-v1.6";
  const secondModel: "tryon-v1.6" | "tryon-max" =
    firstModel === "tryon-v1.6" ? "tryon-max" : "tryon-v1.6";

  const first = await startPrediction({
    apiKey: client.fashnApiKey,
    modelName: firstModel,
    mode,
    outputFormat,
    returnBase64,
    modelImage,
    garmentOrProductImage: garmentImage,
  });

  if (!first.ok) {
    // Shoes must stay on Try-On Max (foot placement). Clothing can fall back to Max if v1.6 fails.
    if (tryOnType === "shoes") {
      return Response.json({ error: first.error }, { status: 502 });
    }
    const second = await startPrediction({
      apiKey: client.fashnApiKey,
      modelName: secondModel,
      mode,
      outputFormat,
      returnBase64,
      modelImage,
      garmentOrProductImage: garmentImage,
    });
    if (!second.ok) return Response.json({ error: second.error }, { status: 502 });

    const result = await pollUntilDone({
      id: second.id,
      headers: second.headers,
      baseUrl: second.baseUrl,
      timeoutMs: second.isMax ? 150_000 : 90_000,
      pollMs: second.isMax ? 2000 : 1200,
      tryOnType,
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

  const result = await pollUntilDone({
    id: first.id,
    headers: first.headers,
    baseUrl: first.baseUrl,
    timeoutMs: first.isMax ? 150_000 : 90_000,
    pollMs: first.isMax ? 2000 : 1200,
    tryOnType,
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
  tryOnType: "shoes" | "clothing";
}): Promise<{ ok: true; response: Response } | { ok: false; response: Response }> {
  const { id, headers, baseUrl, timeoutMs, pollMs, tryOnType } = params;
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
        response: Response.json({ id, output: statusData.output, tryOnType }),
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


