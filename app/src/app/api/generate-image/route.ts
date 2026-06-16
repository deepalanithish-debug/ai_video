import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio, mood, style, realism, referenceImage } = await req.json() as {
      prompt: string;
      aspectRatio?: string;
      mood?: string;
      style?: string;
      realism?: string;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

    const fullPrompt = [
      prompt,
      aspectRatio && `Aspect ratio: ${aspectRatio}`,
      mood && `Mood: ${mood}`,
      style && `Style: ${style}`,
      realism && `Visual style: ${realism}`,
      "High quality, professional commercial photography, 8K resolution",
    ].filter(Boolean).join(". ");

    const parts: { text?: string; inlineData?: { data: string; mimeType: string } }[] = [{ text: fullPrompt }];

    if (referenceImage) {
      // Strip data URL prefix
      const base64Data = referenceImage.replace(/^data:[^;]+;base64,/, "");
      const mimeType = referenceImage.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
      parts.push({ inlineData: { data: base64Data, mimeType } });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts: parts as never[] }] });
    const response = result.response;

    // Extract image from response
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const imagePart = candidate.content.parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);
    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image in response" }, { status: 500 });
    }

    const { data, mimeType } = imagePart.inlineData;
    const imageUrl = `data:${mimeType};base64,${data}`;

    return NextResponse.json({ imageUrl, url: imageUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    console.error("generate-image error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
