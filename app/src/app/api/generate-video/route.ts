import { NextRequest, NextResponse } from "next/server";
import { createVertexJWT, createStorageJWT } from "@/lib/gemini";

export const maxDuration = 300;

type VeoVideo = {
  uri?: string;
  bytesBase64Encoded?: string;
  mimeType?: string;
};

type PollResponse = {
  done?: boolean;
  error?: { message?: string; code?: number };
  response?: {
    videos?: VeoVideo[];
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string; gcsUri?: string }>;
    generatedSamples?: Array<{ video?: VeoVideo }>;
  };
};

async function safeJson(res: Response): Promise<{ ok: true; data: unknown } | { ok: false; text: string }> {
  const text = await res.text();
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, text: text.slice(0, 300) };
  }
}

async function gcsUriToDataUrl(uri: string): Promise<string | null> {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, object] = match;
  const downloadUrl = `https://storage.googleapis.com/download/storage/v1/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
  try {
    const token = createStorageJWT();
    const gcsRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!gcsRes.ok) return null;
    const buffer = await gcsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:video/mp4;base64,${base64}`;
  } catch {
    return null;
  }
}

function extractVideo(response: PollResponse["response"]): { b64?: string; mime?: string; uri?: string } | null {
  if (!response) return null;
  const v = response.videos?.[0];
  if (v?.bytesBase64Encoded) return { b64: v.bytesBase64Encoded, mime: v.mimeType };
  if (v?.uri) return { uri: v.uri };
  const p = response.predictions?.[0];
  if (p?.bytesBase64Encoded) return { b64: p.bytesBase64Encoded, mime: p.mimeType };
  if (p?.gcsUri) return { uri: p.gcsUri };
  const s = response.generatedSamples?.[0]?.video;
  if (s?.bytesBase64Encoded) return { b64: s.bytesBase64Encoded, mime: s.mimeType };
  if (s?.uri) return { uri: s.uri };
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, motion, style, referenceImage } = await req.json() as {
      prompt: string;
      duration?: string;
      aspectRatio?: string;
      motion?: string;
      style?: string;
      referenceImage?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const project = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION ?? "us-central1";
    if (!project) {
      return NextResponse.json({ error: "GOOGLE_PROJECT_ID not configured" }, { status: 500 });
    }

    // Veo only supports 5–8 s output; snap the requested duration into that range.
    // (Scene durations are often 3–4 s, which the model rejects with an "Unsupported
    // output video duration" error — silently leaving the scene with no generated clip.)
    const durationSecs = Math.max(5, Math.min(duration ? parseInt(duration, 10) : 8, 8));
    const ratio = aspectRatio ?? "9:16";

    const fullPrompt = [
      prompt,
      motion && `Camera motion: ${motion}`,
      style && `Visual style: ${style}`,
      "Cinematic quality, professional commercial production",
    ].filter(Boolean).join(". ");

    const instance: Record<string, unknown> = { prompt: fullPrompt };
    if (referenceImage) {
      const base64Data = referenceImage.replace(/^data:[^;]+;base64,/, "");
      const mimeType = referenceImage.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
      instance.image = { bytesBase64Encoded: base64Data, mimeType };
    }

    const requestBody = {
      instances: [instance],
      parameters: { aspectRatio: ratio, durationSeconds: durationSecs },
    };

    // Try Veo 3.0 first, fall back to Veo 2
    const models = ["veo-3.0-generate-preview", "veo-2.0-generate-001"];
    let operationName: string | null = null;
    let usedModel = "";
    let lastError = "";

    for (const model of models) {
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predictLongRunning`;
      const token = createVertexJWT();

      const initRes = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      });

      const parsed = await safeJson(initRes);
      if (!parsed.ok) {
        lastError = `${model} returned non-JSON (status ${initRes.status}): ${parsed.text}`;
        continue;
      }

      const body = parsed.data as { name?: string; error?: { message?: string; code?: number } };

      if (body.error) {
        const code = body.error.code ?? initRes.status;
        if (code === 404 || code === 400) { lastError = `${model}: ${body.error.message}`; continue; }
        throw new Error(`${model}: ${body.error.message ?? `API error ${code}`}`);
      }

      if (!initRes.ok) {
        lastError = `${model}: HTTP ${initRes.status}`;
        if (initRes.status === 404 || initRes.status === 400) continue;
        throw new Error(lastError);
      }

      if (body.name) { operationName = body.name; usedModel = model; break; }
      lastError = `${model}: no operation name in response`;
    }

    if (!operationName) {
      throw new Error(`No Veo model available. ${lastError}`);
    }

    // Veo on Vertex AI uses fetchPredictOperation — NOT the generic /operations/ endpoint
    const fetchOpUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${usedModel}:fetchPredictOperation`;
    const deadline = Date.now() + 180_000;
    let videoUrl: string | null = null;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const freshToken = createVertexJWT();
      const pollRes = await fetch(fetchOpUrl, {
        method: "POST",
        headers: { "Authorization": `Bearer ${freshToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
        cache: "no-store",
      });

      const pollParsed = await safeJson(pollRes);
      if (!pollParsed.ok) throw new Error(`Poll returned non-JSON: ${pollParsed.text}`);

      const poll = pollParsed.data as PollResponse;
      if (poll.error) throw new Error(poll.error.message ?? "Veo operation failed");

      if (poll.done) {
        const extracted = extractVideo(poll.response);
        if (extracted?.b64) {
          videoUrl = `data:${extracted.mime ?? "video/mp4"};base64,${extracted.b64}`;
        } else if (extracted?.uri) {
          videoUrl = await gcsUriToDataUrl(extracted.uri);
          if (!videoUrl) throw new Error("Video stored in GCS but download failed — ensure the service account has Storage Object Viewer role.");
        }
        break;
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: "Video generation timed out after 3 minutes" }, { status: 504 });
    }

    return NextResponse.json({ videoUrl, url: videoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Video generation failed";
    console.error("generate-video error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
