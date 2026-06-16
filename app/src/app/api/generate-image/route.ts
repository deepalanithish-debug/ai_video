import { NextRequest, NextResponse } from "next/server";
import { createVertexJWT } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio, mood, style, realism, referenceImage } = await req.json() as {
      prompt: string;
      aspectRatio?: string;
      mood?: string;
      style?: string;
      realism?: string;
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

    const fullPrompt = [
      prompt,
      mood && `Mood: ${mood}`,
      style && `Style: ${style}`,
      realism && `Visual style: ${realism}`,
      "High quality, professional commercial photography, 8K resolution",
    ].filter(Boolean).join(". ");

    const instance: Record<string, unknown> = { prompt: fullPrompt };

    if (referenceImage) {
      const base64Data = referenceImage.replace(/^data:[^;]+;base64,/, "");
      const mimeType = referenceImage.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
      instance.image = { bytesBase64Encoded: base64Data, mimeType };
    }

    const ratio = aspectRatio ?? "1:1";
    const body = {
      instances: [instance],
      parameters: { sampleCount: 1, aspectRatio: ratio },
    };

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
    const token = createVertexJWT();

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        (errData as { error?: { message?: string } }).error?.message ??
          `Vertex Imagen API error: ${res.status}`
      );
    }

    const data = await res.json() as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };

    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      return NextResponse.json({ error: "No image in response" }, { status: 500 });
    }

    const mime = prediction.mimeType ?? "image/png";
    const imageUrl = `data:${mime};base64,${prediction.bytesBase64Encoded}`;

    return NextResponse.json({ imageUrl, url: imageUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    console.error("generate-image error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
