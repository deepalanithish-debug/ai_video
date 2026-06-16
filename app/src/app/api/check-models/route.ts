import { NextResponse } from "next/server";
import { createVertexJWT } from "@/lib/gemini";

const PROJECT = process.env.GOOGLE_PROJECT_ID!;
const LOCATION = process.env.GOOGLE_LOCATION ?? "us-central1";
const BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models`;

async function checkGemini(token: string, model: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
    });
    const j = await res.json() as { candidates?: unknown[]; error?: { message?: string; status?: string } };
    if (j.candidates) return "✅ available";
    return `❌ ${j.error?.status ?? j.error?.message ?? res.status}`;
  } catch (e) { return `❌ ${String(e).slice(0, 60)}`; }
}

async function checkVeo(token: string, model: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/${model}:predictLongRunning`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt: "a red ball" }], parameters: { sampleCount: 1, durationSeconds: 5 } }),
    });
    const j = await res.json() as { name?: string; error?: { message?: string; status?: string } };
    // If we get a long-running operation name back, it's available
    if (j.name) return "✅ available (job started)";
    return `❌ ${j.error?.status ?? j.error?.message ?? res.status}`;
  } catch (e) { return `❌ ${String(e).slice(0, 60)}`; }
}

async function checkImagen(token: string, model: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/${model}:predict`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt: "a red circle" }], parameters: { sampleCount: 1 } }),
    });
    const j = await res.json() as { predictions?: unknown[]; error?: { message?: string; status?: string } };
    if (j.predictions) return "✅ available";
    return `❌ ${j.error?.status ?? j.error?.message ?? res.status}`;
  } catch (e) { return `❌ ${String(e).slice(0, 60)}`; }
}

export async function GET() {
  try {
    const token = createVertexJWT();
    const [
      pro, flash, proPreview, flashPreview,
      veo2, veo3, veo3fast,
      img3, img4, img4ultra,
    ] = await Promise.all([
      checkGemini(token, "gemini-2.5-pro"),
      checkGemini(token, "gemini-2.5-flash"),
      checkGemini(token, "gemini-2.5-pro-preview-06-05"),
      checkGemini(token, "gemini-2.5-flash-preview-05-20"),
      checkVeo(token, "veo-2.0-generate-001"),
      checkVeo(token, "veo-3.0-generate-001"),
      checkVeo(token, "veo-3.0-fast-generate-001"),
      checkImagen(token, "imagen-3.0-generate-001"),
      checkImagen(token, "imagen-4.0-generate-001"),
      checkImagen(token, "imagen-4.0-ultra-001"),
    ]);

    return NextResponse.json({
      gemini: {
        "gemini-2.5-pro": pro,
        "gemini-2.5-pro-preview-06-05": proPreview,
        "gemini-2.5-flash": flash,
        "gemini-2.5-flash-preview-05-20": flashPreview,
      },
      veo: {
        "veo-2.0-generate-001": veo2,
        "veo-3.0-generate-001": veo3,
        "veo-3.0-fast-generate-001": veo3fast,
      },
      imagen: {
        "imagen-3.0-generate-001": img3,
        "imagen-4.0-generate-001": img4,
        "imagen-4.0-ultra-001": img4ultra,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
