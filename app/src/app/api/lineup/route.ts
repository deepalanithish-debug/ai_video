import { NextRequest, NextResponse } from "next/server";
import { runAgentPipeline } from "@/lib/agent-pipeline";
import type { GeminiClip, BrandOverrides } from "@/lib/gemini";
import { getWorkspace } from "@/lib/workspaces/asaya";
import { BrandWorkspaceSchema } from "@/types/brand";
import { demoLineup } from "@/lib/demo-lineup";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, workspaceSlug, runQA = false, aspectRatio, geminiClips, brandOverrides } = body;
    const hasClips = Array.isArray(geminiClips) && geminiClips.length > 0;
    const overrides = brandOverrides as BrandOverrides | undefined;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
      return NextResponse.json({ error: "Prompt must be at least 10 characters." }, { status: 400 });
    }
    if (!workspaceSlug || typeof workspaceSlug !== "string") {
      return NextResponse.json({ error: "workspaceSlug is required." }, { status: 400 });
    }

    const workspace = getWorkspace(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: `No workspace found for slug: ${workspaceSlug}` }, { status: 404 });
    }
    if (!BrandWorkspaceSchema.safeParse(workspace).success) {
      return NextResponse.json({ error: "Brand workspace config is invalid." }, { status: 500 });
    }

    const clips: GeminiClip[] = hasClips
      ? (geminiClips as GeminiClip[]).map((c, i) => ({ ...c, index: i }))
      : [];

    try {
      const result = await runAgentPipeline({
        prompt: prompt.trim(),
        brand: workspace,
        clips,
        aspectRatio,
        overrides,
        workspaceSlug,
        runQA,
      });

      if (!result.timeline?.scenes?.length) {
        return demoResponse(prompt, workspace, "Gemini returned an empty scene list.");
      }

      return NextResponse.json({
        success: true,
        lineup: { timeline: result.timeline, suggestions: result.suggestions },
        clipAssignments: result.clipAssignments ?? [],
        cluster: result.cluster,
        mode: result.mode,
        workflowId: result.workflowId,
        trace: result.trace,
        evaluation: result.evaluation,
        musicSpec: result.musicSpec,
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      });

    } catch (aiError) {
      const msg = aiError instanceof Error ? aiError.message : String(aiError);
      const isQuotaOrAuth =
        msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("403") || msg.includes("401") || msg.includes("permission") ||
        msg.includes("PERMISSION_DENIED") || msg.includes("suspended");
      const isMalformed =
        msg.includes("Missing timeline") || msg.includes("invalid JSON") ||
        msg.includes("empty response") || msg.includes("Invalid lineup");

      if (isQuotaOrAuth || isMalformed) {
        return demoResponse(
          prompt, workspace,
          isQuotaOrAuth
            ? "Gemini API quota not available. Showing a pre-built demo lineup."
            : "Gemini returned an unexpected format. Showing demo lineup.",
        );
      }
      throw aiError;
    }

  } catch (error) {
    console.error("[lineup]", error);
    return NextResponse.json(
      { error: "Failed to generate lineup.", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function demoResponse(
  prompt: string,
  workspace: ReturnType<typeof getWorkspace>,
  demoReason: string,
) {
  const demo = structuredClone(demoLineup);
  demo.timeline.meta!.promptUsed = prompt.trim();
  demo.timeline.updatedAt = new Date().toISOString();
  return NextResponse.json({
    success: true,
    lineup: demo,
    clipAssignments: [],
    cluster: "ugc-ads",
    mode: "concept",
    workflowId: "ugc-ads-standard",
    trace: [],
    evaluation: null,
    musicSpec: null,
    workspace: { id: workspace!.id, name: workspace!.name, slug: workspace!.slug },
    demo: true,
    demoReason,
  });
}
