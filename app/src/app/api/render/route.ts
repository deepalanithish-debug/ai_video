import { NextRequest, NextResponse } from "next/server";
import { renderVideo, getEngineType } from "@/lib/transcoder";
import type { SceneInput, AudioInput } from "@/lib/transcoder";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenes, audio, aspectRatio, totalDuration, outputFilename } = body as {
      scenes: SceneInput[];
      audio?: AudioInput;
      aspectRatio?: string;
      totalDuration?: number;
      outputFilename?: string;
    };

    if (!scenes?.length) {
      return NextResponse.json({ error: "No scenes provided." }, { status: 400 });
    }

    const engine = getEngineType();
    const filename = outputFilename ?? `render-${Date.now()}.mp4`;

    const result = await renderVideo({ scenes, audio, aspectRatio, totalDuration, outputFilename: filename });

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      filename: result.filename,
      engine: result.engine,
      message: engine === "cloud"
        ? "Rendered via Google Cloud Transcoder."
        : "Rendered locally with FFmpeg. Set GCS_BUCKET in .env.local to enable cloud rendering.",
    });

  } catch (error) {
    console.error("[render]", error);
    return NextResponse.json(
      { error: "Render failed.", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
