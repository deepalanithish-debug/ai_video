/**
 * Transition Planner Tool
 *
 * Purpose:  Given a timeline, improve transition choices scene-by-scene.
 *           Mirrors what an editor does when reviewing the rough cut: refining
 *           cuts based on energy, pacing, and storytelling flow.
 *
 * Input:    Timeline JSON + cluster config
 * Output:   Updated transition plan (scene ID → transition type + duration)
 * Model:    gemini-2.5-flash
 *
 * Failure cases:
 *   - Empty timeline → returns empty plan (no-op)
 *   - Model error → returns original transitions (no-op, non-fatal)
 */

import { geminiRequest } from "@/lib/gemini";
import type { Timeline } from "@/types/timeline";
import type { Tool, ToolContext, ToolResult } from "./types";

const MODEL = "gemini-2.5-pro";

export interface TransitionPlannerInput {
  timeline: Timeline;
  clusterPacingStyle: string;
  platform: string;
  tone: string;
  originalPrompt?: string;
}

export interface SceneTransition {
  sceneId: string;
  transitionType: "cut" | "fade" | "dissolve" | "cinematic-fade" | "whip-pan" | "dip-to-black";
  duration: number;
  rationale: string;
}

export interface TransitionPlannerOutput {
  transitions: SceneTransition[];
  overallFlowScore: number;
  pacingNotes: string;
}

export const transitionPlannerTool: Tool<TransitionPlannerInput, TransitionPlannerOutput> = {
  name: "transition-planner",
  description: "Reviews and improves transition choices across all scenes for pacing and storytelling flow",
  purpose: "Replicate the rough-cut review step where an editor refines cuts based on energy and narrative",
  inputs: "Timeline JSON, cluster pacing style, platform, tone",
  outputs: "Per-scene transition type and duration, overall flow score, pacing notes",
  modelsUsed: [MODEL],
  failureCases: [
    "Empty timeline → no-op, returns empty plan",
    "Model error → original transitions preserved (non-fatal)",
  ],
  knownLimitations: [
    "Cannot hear audio — transition choices are visual-only",
    "Whip-pan and match-cut detection requires visual similarity analysis",
  ],

  async execute(input: TransitionPlannerInput, ctx: ToolContext): Promise<ToolResult<TransitionPlannerOutput>> {
    void ctx;
    const start = Date.now();
    const scenes = input.timeline.scenes ?? [];

    if (!scenes.length) {
      return {
        success: true,
        data: { transitions: [], overallFlowScore: 0, pacingNotes: "No scenes to plan" },
        durationMs: Date.now() - start,
        modelUsed: MODEL,
      };
    }

    try {
      const sceneList = scenes.map((s, i) =>
        `Scene ${i + 1} (id: ${s.id}): "${s.label}" — ${s.duration}s, mood: ${s.mood ?? "neutral"}, motion: ${s.motionStyle ?? "unknown"}`
      ).join("\n");

      const briefSection = input.originalPrompt
        ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nORIGINAL USER BRIEF (let this guide your transition choices):\n${input.originalPrompt}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        : "";

      const prompt = `You are a professional video editor reviewing transitions.
${briefSection}CLUSTER DEFAULT PACING: ${input.clusterPacingStyle}
PLATFORM: ${input.platform}
TONE: ${input.tone}

SCENES:
${sceneList}

Assign the best transition FROM each scene to the next based on the brief above.
Rules:
- Last scene → no transition needed (set "cut")
- If brief is conversational/interview/natural → prefer simple "cut" between speakers
- fast-cuts brief → "cut" or "whip-pan"
- cinematic/atmospheric brief → "cinematic-fade" or "dissolve"
- Emotional moments: "dissolve" or "cinematic-fade"
- Default to "cut" when in doubt — clean cuts are always better than over-produced transitions

Return ONLY JSON:
{
  "transitions": [
    {
      "sceneId": "<scene id>",
      "transitionType": "cut",
      "duration": 0.3,
      "rationale": "Energy spike from product reveal to lifestyle shot"
    }
  ],
  "overallFlowScore": 0.82,
  "pacingNotes": "Pacing builds well from calm intro to energetic middle — tighten last scene"
}`;

      const data = await geminiRequest(MODEL, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.25 },
      });

      const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const result = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as TransitionPlannerOutput;

      return { success: true, data: result, durationMs: Date.now() - start, modelUsed: MODEL };
    } catch (e) {
      // Non-fatal — original transitions are fine
      return {
        success: true,
        data: {
          transitions: scenes.map(s => ({
            sceneId: s.id,
            transitionType: (s.transition?.type ?? "cut") as SceneTransition["transitionType"],
            duration: s.transition?.duration ?? 0.3,
            rationale: "Original transition preserved (planner error)",
          })),
          overallFlowScore: 0.6,
          pacingNotes: `Transition planning error: ${e instanceof Error ? e.message : String(e)}`,
        },
        durationMs: Date.now() - start,
        modelUsed: MODEL,
        error: "Used original transitions",
      };
    }
  },
};
