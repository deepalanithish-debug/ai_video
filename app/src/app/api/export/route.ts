import { NextRequest, NextResponse } from "next/server";
import { TimelineSchema } from "@/types/timeline";

// Generates an FFmpeg command string from a timeline JSON
// In production this would invoke fluent-ffmpeg on a server with FFmpeg installed.
// This route returns the command plan for preview/debugging purposes.
function buildFFmpegCommand(timeline: ReturnType<typeof TimelineSchema.parse>, outputPath: string): string {
  const { scenes, audioLayers, aspectRatio, totalDuration } = timeline;

  const [w, h] = aspectRatio === "9:16" ? [1080, 1920]
    : aspectRatio === "16:9" ? [1920, 1080]
    : aspectRatio === "1:1" ? [1080, 1080]
    : aspectRatio === "4:5" ? [1080, 1350]
    : [1080, 1440]; // 3:4

  const lines: string[] = ["ffmpeg \\"];

  // Input files (placeholder)
  scenes.forEach((scene, i) => {
    const src = scene.clipSrc ?? `scene_${i}_placeholder.mp4`;
    lines.push(`  -i "${src}" \\`);
  });

  // Audio inputs
  audioLayers.forEach((layer, i) => {
    if (layer.src) {
      lines.push(`  -i "${layer.src}" \\`);
    }
  });

  // Filter complex for transitions + overlays
  const filterParts: string[] = [];
  scenes.forEach((scene, i) => {
    // Scale each clip to target resolution
    filterParts.push(`[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
  });

  // Concatenate with transitions
  let concatInputs = "";
  scenes.forEach((scene, i) => {
    const transType = scene.transition?.type ?? "cut";
    const transDur = scene.transition?.duration ?? 0.5;

    if (i < scenes.length - 1 && transType !== "cut") {
      filterParts.push(
        `[v${i}][v${i + 1}]xfade=transition=${mapTransition(transType)}:duration=${transDur}:offset=${
          scenes.slice(0, i + 1).reduce((acc, s) => acc + s.duration, 0) - transDur
        }[xf${i}]`
      );
      concatInputs += `[xf${i}]`;
    } else {
      concatInputs += `[v${i}]`;
    }
  });

  filterParts.push(`${concatInputs}concat=n=${scenes.length}:v=1:a=0[outv]`);

  lines.push(`  -filter_complex "${filterParts.join("; \\\n    ")}" \\`);
  lines.push(`  -map "[outv]" \\`);

  if (audioLayers.length > 0) {
    lines.push(`  -map ${scenes.length}:a \\`);
    lines.push(`  -c:a aac -b:a 192k \\`);
  }

  lines.push(`  -c:v libx264 -preset slow -crf 18 \\`);
  lines.push(`  -t ${totalDuration} \\`);
  lines.push(`  -movflags +faststart \\`);
  lines.push(`  "${outputPath}"`);

  return lines.join("\n");
}

function mapTransition(type: string): string {
  const map: Record<string, string> = {
    "fade": "fade",
    "dissolve": "dissolve",
    "wipe-left": "wipeleft",
    "wipe-right": "wiperight",
    "zoom-in": "zoom",
    "zoom-out": "zoom",
    "slide-left": "slideleft",
    "slide-right": "slideright",
    "cinematic-fade": "fade",
  };
  return map[type] ?? "fade";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timeline, outputFilename = "export.mp4" } = body;

    const validation = TimelineSchema.safeParse(timeline);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid timeline schema.", details: validation.error.issues },
        { status: 400 }
      );
    }

    const validTimeline = validation.data;
    const outputPath = `/exports/${outputFilename}`;
    const command = buildFFmpegCommand(validTimeline, outputPath);

    const sceneBreakdown = validTimeline.scenes.map((scene) => ({
      id: scene.id,
      label: scene.label,
      duration: `${scene.duration}s`,
      captions: scene.captions.length,
      transition: scene.transition?.type ?? "cut",
      mood: scene.mood,
    }));

    return NextResponse.json({
      success: true,
      exportPlan: {
        outputPath,
        totalDuration: `${validTimeline.totalDuration}s`,
        aspectRatio: validTimeline.aspectRatio,
        sceneCount: validTimeline.scenes.length,
        captionCount: validTimeline.scenes.reduce((acc, s) => acc + s.captions.length, 0),
        audioLayers: validTimeline.audioLayers.length,
        sceneBreakdown,
      },
      ffmpegCommand: command,
      note: "FFmpeg command generated. Run on a server with FFmpeg installed to produce the final video.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Export plan generation failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
