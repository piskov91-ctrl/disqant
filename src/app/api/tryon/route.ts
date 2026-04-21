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

type FashnCategory = "tops" | "bottoms" | "one-pieces" | "auto";

const FASHN_CATEGORIES = new Set<string>(["tops", "bottoms", "one-pieces", "auto"]);

function resolveFashnCategory(form: FormData): FashnCategory {
  const fromForm = String(form.get("category") || "")
    .trim()
    .toLowerCase();
  // Legacy clients / old demos (not valid on Fashn).
  if (fromForm === "shoes") return "auto";
  if (fromForm === "outerwear") return "tops";
  if (FASHN_CATEGORIES.has(fromForm)) {
    return fromForm as FashnCategory;
  }

  const tryOn = String(form.get("tryOnType") || "").trim().toLowerCase();
  if (tryOn === "shoes") return "auto";
  return "tops";
}

async function startPrediction(params: {
  apiKey: string;
  modelImage: string;
  garmentImage: string;
  category: FashnCategory;
}) {
  const { apiKey, modelImage, garmentImage, category } = params;

  const baseUrl = "https://api.fashn.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const body = {
    model_name: "tryon-v1.6",
    inputs: {
      model_image: modelImage,
      garment_image: garmentImage,
      category,
      mode: "balanced",
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
  const category = resolveFashnCategory(form);

  if (!(modelFile instanceof File) || !(garmentFile instanceof File)) {
    return Response.json(
      { error: "Please upload both a person photo and a garment image." },
      { status: 400 },
    );
  }

  const modelImage = await fileToDataUrl(modelFile);
  const garmentImage = await fileToDataUrl(garmentFile);

  const first = await startPrediction({
    apiKey: client.fashnApiKey,
    modelImage,
    garmentImage,
    category,
  });

  if (!first.ok) {
    return Response.json({ error: first.error }, { status: 502 });
  }

  const result = await pollUntilDone({
    id: first.id,
    headers: first.headers,
    baseUrl: first.baseUrl,
    timeoutMs: 90_000,
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
  category: FashnCategory;
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


