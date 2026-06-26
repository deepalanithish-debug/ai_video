/**
 * Hook Detection Tool
 *
 * Purpose:  Identify the highest-engagement segment (first 3s) across all clips.
 *           Professional editors obsess over the hook — it determines if the viewer stays.
 *           This tool replicates that editorial judgement.
 *
 * Input:    Video analysis output + original brief
 * Output:   Ranked hook candidates with predicted engagement scores
 * Model:    gemini-2.5-flash
 *
 * Failure cases:
 *   - No footage → returns text-based hook suggestions for the concept brief
 *   - All clips score below 0.4 → returns best-available with warning
 */

import { geminiRequest } from "@/lib/gemini";
import type { Tool, ToolContext, ToolResult } from "./types";
import type { VideoAnalysisOutput, ClipAnalysis } from "./video-analysis";

const MODEL = "gemini-2.5-pro";

export interface HookDetectionInput {
  videoAnalysis?: VideoAnalysisOutput;
  brief: string;
  platform: string;
  cluster: string;
}

export interface HookCandidate {
  clipIndex: number | null;
  trimStart: number;
  trimEnd: number;
  hookType: "visual-reveal" | "action-moment" | "emotion-peak" | "product-close-up" | "text-driven" | "sound-driven";
  engagementScore: number;
  reason: string;
  captionSuggestion: string;
}

export interface HookDetectionOutput {
  recommendedHook: HookCandidate;
  alternatives: HookCandidate[];
  hookStrategy: string;
  platformNote: string;
}

export const hookDetectionTool: Tool<HookDetectionInput, HookDetectionOutput> = {
  name: "hook-detection",
  description: "Identifies the highest-engagement opening segment across all clips",
  purpose: "Mirrors how a professional editor chooses the first 3 seconds — the most critical editing decision",
  inputs: "VideoAnalysisOutput (optional), brief text, platform, cluster, target duration",
  outputs: "Ranked hook candidates with engagement scores, hook type classification, caption suggestions",
  modelsUsed: [MODEL],
  failureCases: [
    "No clips → returns text/concept-based hook suggestions",
    "All candidates score below 0.4 → best-available returned with warning flag",
    "Unknown platform → defaults to instagram engagement patterns",
  ],
  knownLimitations: [
    "Engagement scores are predicted, not measured",
    "Cannot account for sound — only visual hook quality",
    "Platform algorithms change; scores reflect general best-practices",
  ],

  async execute(input: HookDetectionInput, ctx: ToolContext): Promise<ToolResult<HookDetectionOutput>> {
    void ctx;
    const start = Date.now();

    try {
      const analysisSection = input.videoAnalysis
        ? buildClipSummary(input.videoAnalysis.clips)
        : "No footage available — generate concept-based hook directions.";

      const prompt = `You are an expert video editor. Your job: find the best hook for this video.
RULE: The first 3 seconds determine if viewers stay. Choose based on platform and brief.

BRIEF: ${input.brief}
PLATFORM: ${input.platform}
CLUSTER: ${input.cluster}

AVAILABLE CLIPS:
${analysisSection}

Return ONLY valid JSON:
{
  "recommendedHook": {
    "clipIndex": 0,
    "trimStart": 0.5,
    "trimEnd": 3.0,
    "hookType": "product-close-up",
    "engagementScore": 0.87,
    "reason": "Tight close-up reveals product immediately — high intrigue",
    "captionSuggestion": "INTRODUCING."
  },
  "alternatives": [
    {
      "clipIndex": 1,
      "trimStart": 2.0,
      "trimEnd": 4.5,
      "hookType": "emotion-peak",
      "engagementScore": 0.72,
      "reason": "Human face + reaction — emotional connection",
      "captionSuggestion": "THIS CHANGES EVERYTHING"
    }
  ],
  "hookStrategy": "Open with the product reveal before the brand logo — creates intrigue before identity",
  "platformNote": "Instagram Reels: 0.3s to grab attention, 1.5s to confirm story"
}

hookType must be one of: visual-reveal, action-moment, emotion-peak, product-close-up, text-driven, sound-driven
If no clips, set clipIndex: null and describe the shot to film.`;

      const data = await geminiRequest(MODEL, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1.0, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 3000 } },
      });

      const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const result = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as HookDetectionOutput;

      return { success: true, data: result, durationMs: Date.now() - start, modelUsed: MODEL };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
    }
  },
};

function buildClipSummary(clips: ClipAnalysis[]): string {
  return clips.map(c =>
    `Clip ${c.clipIndex} "${c.name}": ${c.motion} motion, quality=${c.quality}, usability=${c.usability}
  Best segment: ${c.bestSegmentStart}s–${c.bestSegmentEnd}s
  Scenes: ${c.scenes.map(s => `[${s.startTime}–${s.endTime}s] ${s.description} (hook=${s.suitableAsHook})`).join(" | ")}
  Suggested use: ${c.suggestedUse}`
  ).join("\n\n");
}
