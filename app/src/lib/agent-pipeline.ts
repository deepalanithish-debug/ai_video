/**
 * Workflow Orchestrator
 *
 * Replaces the old hardcoded if/else pipeline with a planner-driven execution engine.
 *
 * Flow:
 *   1. Planner agent → selects workflow + tool execution plan
 *   2. Tool executor → runs each tool in the plan, passes results forward
 *   3. Evaluator → scores the output before returning
 *   4. Persist → save run, tool trace, evaluation, generation to SQLite
 *
 * No routing logic lives here. The Planner decides everything.
 *
 * Backward compat: exports WorkflowCluster, AgentStep, PipelineResult
 * with updated shapes so existing callers work unchanged.
 */

import { v4 as uuidv4 } from "uuid";
import type { BrandWorkspace } from "@/types/brand";
import type { Timeline, LineupResponse } from "@/types/timeline";
import type { GeminiClip, ClipAssignment, BrandOverrides } from "./gemini";
import { runPlanner } from "./agents/planner";
import { runEvaluator } from "./agents/evaluator";
import { interpretBrief, formatBriefForPrompt } from "./agents/brief-interpreter";
import type { StructuredBrief } from "./agents/brief-interpreter";
import { getDefaultWorkflow, getWorkflow } from "./workflows/registry";
import {
  videoAnalysisTool, hookDetectionTool, timelineGeneratorTool,
  transitionPlannerTool, captionGeneratorTool, musicSelectorTool,
} from "./tools";
import type { ToolContext } from "./tools/types";
import {
  saveGeneration, saveWorkflowRun, saveToolExecution, saveEvaluationResult,
  getSimilarGenerations,
} from "./db";

// ── Public types (backward-compatible) ───────────────────────────────────────

export type WorkflowCluster = "ugc-ads" | "travel-cinematic";

export interface AgentStep {
  stage: string;
  model: string;
  durationMs: number;
  decision?: string;
}

export interface PipelineResult {
  cluster: WorkflowCluster;
  mode: "editorial" | "concept";
  workflowId: string;
  trace: AgentStep[];
  timeline: Timeline;
  suggestions: LineupResponse["suggestions"];
  clipAssignments?: ClipAssignment[];
  evaluation?: {
    overallScore: number;
    passedQA: boolean;
    improvements: string[];
    issues: string[];
    compliments: string[];
    criteriaScores: Array<{ criterion: string; score: number; rating: string; notes: string }>;
    platformScores: Array<{ platform: string; score: number; rating: string; insight: string }>;
  };
  musicSpec?: { genre: string; searchKeywords: string[]; editorialNote: string };
  dbSaved: boolean;
}

// ── Explicit model registry (for PromptBar display + documentation) ──────────
export const MODELS = {
  PLANNER:            "gemini-2.5-flash",
  CONCEPT_GENERATOR:  "gemini-2.5-flash",
  EDITORIAL_ANALYZER: "gemini-2.5-pro",
  HOOK_DETECTOR:      "gemini-2.5-flash",
  TRANSITION_PLANNER: "gemini-2.5-flash",
  CAPTION_GENERATOR:  "gemini-2.5-flash",
  MUSIC_SELECTOR:     "gemini-2.5-flash",
  QA_VALIDATOR:       "gemini-2.5-flash",
} as const;

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function runAgentPipeline(params: {
  prompt: string;
  brand: BrandWorkspace;
  clips?: GeminiClip[];
  aspectRatio?: string;
  overrides?: BrandOverrides;
  workspaceSlug: string;
  runQA?: boolean;
}): Promise<PipelineResult> {
  const { prompt, brand, clips = [], aspectRatio, overrides, workspaceSlug } = params;
  const runId = uuidv4();
  const hasClips = clips.length > 0;
  const pipelineStart = Date.now();
  const trace: AgentStep[] = [];
  const toolsExecuted: string[] = [];

  // ── Step 1: Planner + Brief Interpreter in parallel ─────────────────────────
  // These two are independent — brief interpreter only reads the prompt text,
  // planner only reads metadata. Running together saves one round-trip latency.
  const phase1Start = Date.now();
  const [plan, briefResult] = await Promise.all([
    runPlanner({
      prompt,
      hasClips,
      clipCount: clips.length,
      workspaceSlug,
      brandName: brand.name,
      brandKeywords: brand.styleKeywords,
    }),
    interpretBrief(prompt).catch(() => null as StructuredBrief | null),
  ]);
  const phase1Ms = Date.now() - phase1Start;

  trace.push({
    stage: "Planner",
    model: MODELS.PLANNER,
    durationMs: phase1Ms,
    decision: `→ ${plan.cluster}/${plan.mode} | workflow: ${plan.workflowId} | tools: [${plan.tools.map(t => t.toolName).join(", ")}]`,
  });
  toolsExecuted.push("planner");

  const structuredBrief: StructuredBrief | undefined = briefResult ?? undefined;
  if (structuredBrief) {
    trace.push({
      stage: "Brief Interpreter",
      model: "gemini-2.5-flash",
      durationMs: phase1Ms,
      decision: `${structuredBrief.coreIntent} | pacing: ${structuredBrief.pacingIntent} | ${structuredBrief.sceneOrder.length} scene directives`,
    });
  } else {
    trace.push({ stage: "Brief Interpreter (skipped)", model: "—", durationMs: phase1Ms, decision: "fallback to raw prompt" });
  }

  const workflow = getWorkflow(plan.workflowId) ?? getDefaultWorkflow(plan.cluster);
  const ctx: ToolContext = { runId, workspaceSlug, cluster: plan.cluster, mode: plan.mode };
  const enrichedPrompt = structuredBrief
    ? `${prompt}\n\n━━━ STRUCTURED INTERPRETATION ━━━\n${formatBriefForPrompt(structuredBrief)}`
    : prompt;

  // ── Retrieve past examples from memory ─────────────────────────────────────
  const pastGens = getSimilarGenerations({ workspaceSlug, cluster: plan.cluster, workflowId: workflow.id, limit: 2 });
  const pastExamples = pastGens.length > 0
    ? pastGens.map((g, i) => `Example ${i + 1} (score ${g.eval_score ?? g.qa_score ?? "?"}): "${g.prompt_text.slice(0, 80)}…"`).join("\n")
    : undefined;

  // ── Step 3: Execute tool plan ──────────────────────────────────────────────
  let videoAnalysisResult = undefined;
  let hookResult = undefined;
  let timeline: Timeline | null = null;
  let suggestions: LineupResponse["suggestions"] = undefined;
  let clipAssignments: ClipAssignment[] = [];
  let musicSpec = undefined;

  for (const { toolName, reason } of plan.tools) {
    let t0 = Date.now();

    try {
      if (toolName === "video-analysis" && hasClips) {
        const result = await videoAnalysisTool.execute({ clips }, ctx);
        saveToolExecution({ runId, toolName, modelUsed: result.modelUsed, durationMs: result.durationMs, success: result.success, errorMsg: result.error });
        if (result.success && result.data) videoAnalysisResult = result.data;
        trace.push({
          stage: "Video Analysis",
          model: result.modelUsed ?? MODELS.EDITORIAL_ANALYZER,
          durationMs: result.durationMs,
          decision: result.data ? `${result.data.editableClipCount} usable clips | quality: ${result.data.overallQuality} | ${result.data.suggestedCluster}` : "fallback metadata",
        });
        toolsExecuted.push(toolName);

      } else if (toolName === "hook-detection") {
        const result = await hookDetectionTool.execute({
          videoAnalysis: videoAnalysisResult,
          brief: enrichedPrompt,
          platform: plan.platform,
          cluster: plan.cluster,
        }, ctx);
        saveToolExecution({ runId, toolName, modelUsed: result.modelUsed, durationMs: result.durationMs, success: result.success });
        if (result.success && result.data) hookResult = result.data;
        trace.push({
          stage: "Hook Detection",
          model: result.modelUsed ?? MODELS.HOOK_DETECTOR,
          durationMs: result.durationMs,
          decision: result.data ? `${result.data.recommendedHook.hookType} | score: ${result.data.recommendedHook.engagementScore} | "${result.data.recommendedHook.captionSuggestion}"` : reason,
        });
        toolsExecuted.push(toolName);

      } else if (toolName === "timeline-generator") {
        const result = await timelineGeneratorTool.execute({
          prompt: enrichedPrompt,
          brand,
          aspectRatio,
          overrides,
          clips: hasClips ? clips : undefined,
          hookResult,
          videoAnalysis: videoAnalysisResult,
          clusterConfig: { ...workflow.clusterConfig, clusterId: workflow.cluster },
          pastExamples,
          classification: {
            cluster: plan.cluster,
            mode: plan.mode,
            intent: plan.intent,
            tone: plan.tone,
            platform: plan.platform,
          },
        }, ctx);
        saveToolExecution({ runId, toolName, modelUsed: result.modelUsed, durationMs: result.durationMs, success: result.success, errorMsg: result.error });
        if (!result.success || !result.data) throw new Error(result.error ?? "Timeline generation failed");
        timeline = result.data.timeline;
        suggestions = result.data.suggestions;
        clipAssignments = result.data.clipAssignments;

        if (hasClips && timeline.scenes) {
          // Guard A: deduplicate scene IDs — model sometimes writes the same UUID twice.
          // If two scenes share an ID, the second one gets a fresh UUID and its
          // clipAssignment entry (if any) is updated to the new ID.
          const seenSceneIds = new Set<string>();
          for (const scene of timeline.scenes) {
            if (seenSceneIds.has(scene.id)) {
              const oldId = scene.id;
              const newId = uuidv4();
              scene.id = newId;
              // patch clipAssignments that referenced the old duplicate ID
              for (const a of clipAssignments) {
                if (a.sceneId === oldId && !seenSceneIds.has(newId)) a.sceneId = newId;
              }
            }
            seenSceneIds.add(scene.id);
          }

          // Guard B: fix duplicate clipIndex — model sometimes assigns the same clip to
          // multiple scenes. Reassign each duplicate to the next unused clip index.
          const usedClipIndices = new Set<number>();
          for (const a of clipAssignments) {
            if (!usedClipIndices.has(a.clipIndex)) {
              usedClipIndices.add(a.clipIndex);
            } else {
              let next = 0;
              while (usedClipIndices.has(next) && next < clips.length) next++;
              if (next < clips.length) { a.clipIndex = next; usedClipIndices.add(next); }
            }
          }

          // Guard C: ensure EVERY scene has exactly one clipAssignment.
          // If a scene is missing from clipAssignments, assign the next available clip.
          const availableClipIndices = clips.map((_, i) => i).filter(i => !usedClipIndices.has(i));
          for (const scene of timeline.scenes) {
            if (!clipAssignments.some(a => a.sceneId === scene.id) && availableClipIndices.length > 0) {
              const nextIdx = availableClipIndices.shift()!;
              clipAssignments.push({ sceneId: scene.id, clipIndex: nextIdx, trimStart: scene.clipTrimStart ?? 0, trimEnd: scene.clipTrimEnd });
              usedClipIndices.add(nextIdx);
            }
          }

          // Guard 1: trim excess scenes — never more than the number of uploaded clips
          if (timeline.scenes.length > clips.length) {
            timeline.scenes = timeline.scenes.slice(0, clips.length);
          }

          // Guard 3: clamp clipTrimEnd to exact clip duration — only cap the end, preserve trimStart
          timeline.scenes.forEach((scene, sceneIdx) => {
            const assignment = clipAssignments.find(a => a.sceneId === scene.id);
            const clipIdx = assignment?.clipIndex ?? sceneIdx;
            const sourceClip = clips[clipIdx] ?? clips[sceneIdx];
            const exactDuration = sourceClip?.duration;
            if (exactDuration && exactDuration > 0) {
              const trimStart = Math.max(0, scene.clipTrimStart ?? 0);
              const trimEnd = Math.min(scene.clipTrimEnd ?? exactDuration, exactDuration);
              scene.clipTrimStart = trimStart;
              scene.clipTrimEnd = trimEnd > trimStart ? trimEnd : exactDuration;
              scene.duration = parseFloat((scene.clipTrimEnd - scene.clipTrimStart).toFixed(3));
            }
          });
          timeline.totalDuration = parseFloat(
            timeline.scenes.reduce((s, sc) => s + (sc.duration ?? 0), 0).toFixed(3)
          );
        }

        trace.push({
          stage: "Timeline Generator",
          model: result.modelUsed ?? (hasClips ? MODELS.EDITORIAL_ANALYZER : MODELS.CONCEPT_GENERATOR),
          durationMs: result.durationMs,
          decision: `${timeline.scenes?.length ?? 0} scenes | ${timeline.totalDuration}s | ${result.data.generationNotes}`,
        });
        toolsExecuted.push(toolName);

      }
      // transition-planner, caption-generator, music-selector are handled below in parallel

    } catch (toolError) {
      const errMsg = toolError instanceof Error ? toolError.message : String(toolError);
      saveToolExecution({ runId, toolName, durationMs: Date.now() - t0, success: false, errorMsg: errMsg });
      if (toolName === "timeline-generator") throw toolError;
      trace.push({ stage: `${toolName} (failed)`, model: "—", durationMs: Date.now() - t0, decision: errMsg.slice(0, 80) });
    }
  }

  if (!timeline) throw new Error("timeline-generator was not reached or failed");

  // ── Step 3b: Post-timeline polish tools — run in parallel ──────────────────
  // transition-planner, caption-generator, music-selector all read from
  // timeline but don't depend on each other, so they can run concurrently.
  const POST_TIMELINE = ["transition-planner", "caption-generator", "music-selector"] as const;
  const postTools = plan.tools.filter(t => POST_TIMELINE.includes(t.toolName as typeof POST_TIMELINE[number]));

  if (postTools.length > 0) {
    const parallelStart = Date.now();
    const sceneEnergies = (timeline.scenes ?? []).map(s => `${s.label}(${s.mood ?? "neutral"})`).join(", ");

    const postResults = await Promise.allSettled(postTools.map(async ({ toolName }) => {
      const t = Date.now();
      if (toolName === "transition-planner") {
        return { toolName, result: await transitionPlannerTool.execute({
          timeline: timeline!,
          clusterPacingStyle: workflow.clusterConfig.pacingStyle,
          platform: plan.platform, tone: plan.tone, originalPrompt: enrichedPrompt,
        }, ctx), durationMs: Date.now() - t };
      }
      if (toolName === "caption-generator") {
        return { toolName, result: await captionGeneratorTool.execute({
          timeline: timeline!,
          captionStyle: workflow.clusterConfig.captionStyle,
          maxCharsPerLine: brand.captionStyle.maxCharsPerLine,
          platform: plan.platform, tone: plan.tone, brandName: brand.name, originalPrompt: enrichedPrompt,
        }, ctx), durationMs: Date.now() - t };
      }
      if (toolName === "music-selector") {
        return { toolName, result: await musicSelectorTool.execute({
          cluster: plan.cluster, tone: plan.tone, platform: plan.platform,
          targetDuration: timeline!.totalDuration ?? 30, sceneCount: timeline!.scenes?.length ?? 0,
          energyProfile: sceneEnergies, brandName: brand.name,
        }, ctx), durationMs: Date.now() - t };
      }
      return null;
    }));

    for (const settled of postResults) {
      if (settled.status === "rejected") continue;
      const payload = settled.value;
      if (!payload) continue;
      const { toolName, result, durationMs } = payload;

      saveToolExecution({ runId, toolName, modelUsed: result.modelUsed, durationMs, success: result.success });
      toolsExecuted.push(toolName);

      if (toolName === "transition-planner") {
        const data = result.data as Awaited<ReturnType<typeof transitionPlannerTool.execute>>["data"];
        if (result.success && Array.isArray(data?.transitions) && timeline.scenes) {
          for (const t of data!.transitions) {
            const scene = timeline.scenes.find(s => s.id === t.sceneId);
            if (scene) scene.transition = { type: t.transitionType as "cut" | "fade" | "dissolve" | "cinematic-fade", duration: t.duration };
          }
        }
        trace.push({
          stage: "Transition Planner", model: result.modelUsed ?? MODELS.TRANSITION_PLANNER, durationMs,
          decision: data ? `flow score: ${data.overallFlowScore} | ${data.pacingNotes.slice(0, 60)}` : "original transitions kept",
        });
      } else if (toolName === "caption-generator") {
        const data = result.data as Awaited<ReturnType<typeof captionGeneratorTool.execute>>["data"];
        if (result.success && Array.isArray(data?.scenes) && timeline.scenes) {
          for (const sceneCaps of data!.scenes) {
            const scene = timeline.scenes.find(s => s.id === sceneCaps.sceneId);
            if (scene && Array.isArray(sceneCaps.captions) && sceneCaps.captions.length > 0) {
              scene.captions = sceneCaps.captions.map(c => ({
                ...c,
                style: (["brand-default", "highlight", "subtle", "bold"].includes(c.style ?? "") ? c.style : "brand-default") as "brand-default" | "highlight" | "subtle" | "bold" | undefined,
              }));
            }
          }
        }
        trace.push({
          stage: "Caption Generator", model: result.modelUsed ?? MODELS.CAPTION_GENERATOR, durationMs,
          decision: data ? data.captionNotes.slice(0, 80) : "original captions kept",
        });
      } else if (toolName === "music-selector") {
        const data = result.data as Awaited<ReturnType<typeof musicSelectorTool.execute>>["data"];
        if (result.success && data) {
          musicSpec = { genre: data.primary.genre, searchKeywords: data.primary.searchKeywords, editorialNote: data.primary.editorialNote };
        }
        trace.push({
          stage: "Music Selector", model: result.modelUsed ?? MODELS.MUSIC_SELECTOR, durationMs,
          decision: data ? `${data.primary.genre} | ${data.primary.tempo} | ${data.primary.searchKeywords[0]}` : "no spec",
        });
      }
    }
    console.log(`[pipeline] post-timeline parallel block: ${Date.now() - parallelStart}ms for ${postTools.length} tools`);
  }

  // ── Step 4: Evaluate ────────────────────────────────────────────────────────
  const evalStart = Date.now();
  const evalResult = await runEvaluator({ timeline, brand, workflow, originalPrompt: enrichedPrompt });
  trace.push({
    stage: "Evaluator",
    model: evalResult.evalModel,
    durationMs: Date.now() - evalStart,
    decision: `score: ${evalResult.overallScore}/100 | ${evalResult.passedQA ? "PASSED" : "FAILED"} | ${evalResult.issues.length} issue(s)`,
  });

  // ── Step 4: Persist ─────────────────────────────────────────────────────────
  let dbSaved = false;
  try {
    const totalMs = Date.now() - pipelineStart;

    saveGeneration({
      workspaceSlug, runId, prompt,
      cluster: plan.cluster,
      workflowId: workflow.id,
      aspectRatio,
      timeline, trace,
      evalScore: evalResult.overallScore,
    });

    saveWorkflowRun({
      runId, workspaceSlug,
      workflowId: workflow.id,
      cluster: plan.cluster,
      mode: plan.mode,
      prompt,
      toolsExecuted,
      totalMs,
      evalScore: evalResult.overallScore,
      passedQA: evalResult.passedQA,
    });

    saveEvaluationResult({
      runId, workspaceSlug,
      workflowId: workflow.id,
      overallScore: evalResult.overallScore,
      passedQA: evalResult.passedQA,
      criteria: evalResult.criteriaScores,
      issues: evalResult.issues,
      improvements: evalResult.improvements,
      evalModel: evalResult.evalModel,
    });

    dbSaved = true;
  } catch { /* non-fatal */ }

  return {
    cluster: plan.cluster,
    mode: plan.mode,
    workflowId: workflow.id,
    trace,
    timeline,
    suggestions,
    clipAssignments: clipAssignments.length ? clipAssignments : undefined,
    evaluation: {
      overallScore: evalResult.overallScore,
      passedQA: evalResult.passedQA,
      improvements: evalResult.improvements,
      issues: evalResult.issues,
      compliments: evalResult.compliments,
      criteriaScores: evalResult.criteriaScores.map(s => ({
        criterion: s.criterion,
        score: s.score,
        rating: s.rating,
        notes: s.notes,
      })),
      platformScores: evalResult.platformScores.map(s => ({
        platform: s.platform,
        score: s.score,
        rating: s.rating,
        insight: s.insight,
      })),
    },
    musicSpec,
    dbSaved,
  };
}
