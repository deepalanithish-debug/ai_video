import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, motion, style, referenceImage } = await req.json() as {
      prompt: string;
      duration?: string;
      aspectRatio?: string;
      motion?: string;
      style?: string;
      referenceImage?: string; // base64 data URL
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use Veo model for video generation
    const model = genAI.getGenerativeModel({ model: "veo-2.0-generate-001" });

    const durationSecs = duration ? parseInt(duration, 10) : 5;
    const fullPrompt = [
      prompt,
      motion && `Camera motion: ${motion}`,
      style && `Visual style: ${style}`,
      aspectRatio && `Aspect ratio: ${aspectRatio}`,
      "Cinematic quality, professional commercial production",
    ].filter(Boolean).join(". ");

    const requestBody: Record<string, unknown> = {
      model: "veo-2.0-generate-001",
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        durationSeconds: Math.min(durationSecs, 8),
        aspectRatio: aspectRatio ?? "9:16",
      },
    };

    if (referenceImage) {
      const base64Data = referenceImage.replace(/^data:[^;]+;base64,/, "");
      const mimeType = referenceImage.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
      (requestBody.contents as { role: string; parts: unknown[] }[])[0].parts.push(
        { inlineData: { data: base64Data, mimeType } }
      );
    }

    // Veo uses a polling-based approach via the Operations API
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!initRes.ok) {
      const errData = await initRes.json().catch(() => ({}));
      throw new Error((errData as { error?: { message?: string } }).error?.message ?? `Veo API error: ${initRes.status}`);
    }

    const operation = await initRes.json() as { name?: string; done?: boolean; response?: { videos?: { uri?: string }[] } };

    if (!operation.name) {
      throw new Error("No operation name returned from Veo API");
    }

    // Poll until done (max 120s)
    const operationName = operation.name;
    const deadline = Date.now() + 120_000;
    let videoUrl: string | null = null;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
      );
      const poll = await pollRes.json() as { done?: boolean; response?: { videos?: { uri?: string }[] }; error?: { message?: string } };
      if (poll.error) throw new Error(poll.error.message ?? "Veo operation failed");
      if (poll.done) {
        videoUrl = poll.response?.videos?.[0]?.uri ?? null;
        break;
      }
    }

    if (!videoUrl) {
      return NextResponse.json({ error: "Video generation timed out" }, { status: 504 });
    }

    return NextResponse.json({ videoUrl, url: videoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Video generation failed";
    console.error("generate-video error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
