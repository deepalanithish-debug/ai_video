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
    const {
      prompt, workspaceSlug, runQA = false, aspectRatio, geminiClips, brandOverrides, existingTimeline,
      // C1 — user-selected controls forwarded from the workspace UI. Folded into the
      // prompt below so they actually influence generation (no agent-pipeline refactor).
      duration, workflow, platform, stylePreset,
    } = body;
    const hasClips = Array.isArray(geminiClips) && geminiClips.length > 0;
    const overrides = brandOverrides as BrandOverrides | undefined;
    const isRefinement = Boolean(existingTimeline);

    // C1 — build a directive line from the user's controls and inject it into the
    // model input. Only includes fields that were actually provided.
    const directiveParts: string[] = [];
    if (typeof platform === "string" && platform.trim()) directiveParts.push(`Target platform: ${platform.trim()}.`);
    if (typeof duration === "number" && duration > 0) directiveParts.push(`Target total duration: ${duration}s.`);
    if (typeof stylePreset === "string" && stylePreset.trim()) directiveParts.push(`Visual style: ${stylePreset.trim()}.`);
    if (typeof workflow === "string" && workflow.trim()) directiveParts.push(`Workflow / format: ${workflow.trim()}.`);
    const controlDirective = directiveParts.length ? `${directiveParts.join(" ")}\n\n` : "";

    if (!prompt || typeof prompt !== "string" || (!isRefinement && prompt.trim().length < 10)) {
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

    const refinedPrompt = isRefinement
      ? `REFINEMENT REQUEST — modify the existing timeline below based on the user's instruction. Preserve scene IDs, overall mood, style, and structure unless explicitly asked to change them. Only change what was requested.\n\nEXISTING TIMELINE:\n${JSON.stringify(existingTimeline, null, 2)}\n\n${controlDirective}USER INSTRUCTION: ${prompt.trim()}`
      : `${controlDirective}${prompt.trim()}`;

    try {
      const result = await runAgentPipeline({
        prompt: refinedPrompt,
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
      console.error("[lineup] pipeline error:", msg);
      const reason = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")
        ? "Gemini API quota not available. Showing a pre-built demo lineup."
        : msg.includes("403") || msg.includes("401") || msg.includes("permission") || msg.includes("PERMISSION_DENIED")
          ? "API auth issue. Showing demo lineup."
          : `Pipeline error: ${msg.slice(0, 80)}. Showing demo lineup.`;
      return demoResponse(prompt, workspace, reason);
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
