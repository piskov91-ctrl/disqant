import { cookies } from "next/headers";
import { DEMO_AUTH_COOKIE, isDemoAuthorizedCookieValue } from "@/lib/demoAuth";

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

export async function POST(req: Request) {
  const jar = await cookies();
  if (!isDemoAuthorizedCookieValue(jar.get(DEMO_AUTH_COOKIE)?.value)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing FASHN_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const modelFile = form.get("model");
  const garmentFile = form.get("garment");
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

  const baseUrl = "https://api.fashn.ai/v1";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const runRes = await fetch(`${baseUrl}/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model_name: "tryon-v1.6",
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        mode,
        output_format: outputFormat,
        return_base64: returnBase64,
      },
    }),
  });

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    return Response.json(
      { error: `FASHN /run failed (${runRes.status}). ${text || ""}`.trim() },
      { status: 502 },
    );
  }

  const runData = (await runRes.json()) as FashnRunResponse;
  const id = runData.id;
  if (!id) {
    return Response.json({ error: "FASHN did not return a prediction id." }, { status: 502 });
  }

  const startedAt = Date.now();
  const timeoutMs = 90_000;

  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      return Response.json(
        { error: "Timed out waiting for try-on result. Please try again." },
        { status: 504 },
      );
    }

    const statusRes = await fetch(`${baseUrl}/status/${id}`, { headers });
    if (!statusRes.ok) {
      const text = await statusRes.text().catch(() => "");
      return Response.json(
        { error: `FASHN /status failed (${statusRes.status}). ${text || ""}`.trim() },
        { status: 502 },
      );
    }

    const statusData = (await statusRes.json()) as FashnStatusResponse;
    if (statusData.status === "completed") {
      const out = statusData.output?.[0];
      if (!out) {
        return Response.json({ error: "FASHN completed but returned no output." }, { status: 502 });
      }
      return Response.json({ id, output: statusData.output });
    }

    if (statusData.status === "failed") {
      return Response.json(
        { error: statusData.error || "Try-on failed." },
        { status: 502 },
      );
    }

    await sleep(1200);
  }
}

