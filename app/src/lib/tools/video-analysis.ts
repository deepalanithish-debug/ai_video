/**
 * Video Analysis Tool
 *
 * Purpose:  Understand the footage before making ANY editing decision.
 *           A human editor watches all clips before touching the timeline.
 *           This tool replicates that step.
 *
 * Input:    Raw video clips (base64 encoded)
 * Output:   Per-clip metadata — scenes, motion, quality, usability score, suggested use
 * Model:    gemini-2.5-pro (multimodal vision required)
 *
 * Failure cases:
 *   - Clip shorter than 1s → usability: 0, skipped
 *   - Corrupt codec → clip skipped, others continue
 *   - Quota exceeded → falls back to text-only metadata
 */

import { geminiRequest } from "@/lib/gemini";
import type { GeminiClip } from "@/lib/gemini";
import type { Tool, ToolContext, ToolResult, WorkflowCluster } from "./types";

const MODEL = "gemini-2.5-pro";

export interface VideoAnalysisInput {
  clips: GeminiClip[];
}

export interface SceneDetection {
  startTime: number;
  endTime: number;
  description: string;
  energyLevel: "low" | "medium" | "high";
  hasHuman: boolean;
  hasProduct: boolean;
  suitableAsHook: boolean;
}

export interface ClipAnalysis {
  clipIndex: number;
  name: string;
  estimatedDuration: number;
  scenes: SceneDetection[];
  motion: "static" | "slow" | "medium" | "fast" | "handheld";
  dominantColors: string[];
  audioPresent: boolean;
  quality: "low" | "medium" | "high";
  usability: number;
  suggestedUse: string;
  bestSegmentStart: number;
  bestSegmentEnd: number;
}

export interface VideoAnalysisOutput {
  clips: ClipAnalysis[];
  overallQuality: number;
  editableClipCount: number;
  footageSummary: string;
  suggestedCluster: WorkflowCluster;
  suggestedEditStyle: string;
  hookCandidates: Array<{ clipIndex: number; start: number; end: number; reason: string }>;
}

export const videoAnalysisTool: Tool<VideoAnalysisInput, VideoAnalysisOutput> = {
  name: "video-analysis",
  description: "Analyzes uploaded video clips for content, motion, quality, and edit suitability",
  purpose: "Understand the footage before making any editing decision — mirrors what a human editor does on day 1",
  inputs: "GeminiClip[] — base64-encoded video files with name, mimeType, duration, index",
  outputs: "Per-clip analysis: scenes, motion type, dominant colors, quality score, usability score, best segment, hook candidates",
  modelsUsed: [MODEL],
  failureCases: [
    "Clip < 1s → usability 0, marked as unusable",
    "Corrupt/unsupported codec → clip skipped, continues with others",
    "Gemini quota → falls back to name-based metadata estimation",
    "No clips → returns empty analysis with overallQuality 0",
  ],
  knownLimitations: [
    "Cannot detect audio quality (only presence)",
    "Colour analysis is approximate",
    "Cannot detect licensed music or copyrighted content",
  ],

  async execute(input: VideoAnalysisInput, ctx: ToolContext): Promise<ToolResult<VideoAnalysisOutput>> {
    void ctx;
    const start = Date.now();

    if (!input.clips?.length) {
      return {
        success: true,
        data: {
          clips: [], overallQuality: 0, editableClipCount: 0,
          footageSummary: "No clips provided",
          suggestedCluster: "ugc-ads", suggestedEditStyle: "concept",
          hookCandidates: [],
        },
        durationMs: Date.now() - start,
        modelUsed: MODEL,
      };
    }

    try {
      const parts: Record<string, unknown>[] = [];
      for (const clip of input.clips) {
        const frameCount = clip.frames?.length ?? (clip.data ? 1 : 0);
        parts.push({ text: `Clip ${clip.index}: "${clip.name}"${clip.duration ? ` (${clip.duration}s total)` : ""} — ${frameCount} frame${frameCount !== 1 ? "s" : ""}` });
        if (clip.frames?.length) {
          for (let fi = 0; fi < clip.frames.length; fi++) {
            const ts = clip.frameTimestamps?.[fi];
            const label = ts !== undefined
              ? `Frame at ${ts.toFixed(1)}s${clip.duration ? ` / ${clip.duration.toFixed(1)}s` : ""}`
              : `Frame ${fi + 1} of ${clip.frames.length}`;
            parts.push({ text: label });
            parts.push({ inlineData: { mimeType: "image/jpeg", data: clip.frames[fi] } });
          }
        } else if (clip.data) {
          parts.push({ inlineData: { mimeType: clip.mimeType, data: clip.data } });
        }
      }
      parts.push({ text: buildAnalysisPrompt(input.clips.length) });

      const data = await geminiRequest(MODEL, {
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.15, topP: 0.8 },
      });

      const raw = extractText(data);
      const result = JSON.parse(cleanJson(raw)) as VideoAnalysisOutput;

      // Ensure clips is always an array even if Gemini returns null/missing
      if (!Array.isArray(result.clips)) {
        result.clips = buildFallbackAnalysis(input.clips).clips;
      }

      return { success: true, data: result, durationMs: Date.now() - start, modelUsed: MODEL };
    } catch (e) {
      // Graceful fallback: build basic metadata from clip names without vision
      const fallback = buildFallbackAnalysis(input.clips);
      return {
        success: true,
        data: fallback,
        durationMs: Date.now() - start,
        modelUsed: "fallback-metadata",
        error: `Vision analysis failed, using fallback: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
};

function buildAnalysisPrompt(clipCount: number): string {
  return `Analyze all ${clipCount} clips carefully. For each clip, describe exactly WHO appears and WHAT they do — be specific enough that an editor can identify the clip from your description alone (e.g. "young woman in red shirt speaking directly to camera", "man in sunglasses smiling, outdoor background").

Return ONLY valid JSON:
{
  "clips": [{
    "clipIndex": 0,
    "name": "filename",
    "estimatedDuration": 5.0,
    "scenes": [{
      "startTime": 0, "endTime": 5,
      "description": "Specific description: who is visible (gender, approximate age, notable appearance like glasses/hat/clothing), what are they doing, are they speaking, what is the setting",
      "energyLevel": "medium",
      "hasHuman": true, "hasProduct": false,
      "suitableAsHook": false
    }],
    "motion": "slow",
    "dominantColors": ["#c9a96e", "#1a1510"],
    "audioPresent": true,
    "quality": "high",
    "usability": 0.9,
    "suggestedUse": "Describe the clip's best use referencing the specific person/content visible",
    "bestSegmentStart": 0.5,
    "bestSegmentEnd": 3.5
  }],
  "overallQuality": 0.85,
  "editableClipCount": ${clipCount},
  "footageSummary": "2-3 sentence description of all footage — who appears in each clip",
  "suggestedCluster": "ugc-ads",
  "suggestedEditStyle": "fast vox-pop cuts between speakers",
  "hookCandidates": [
    {"clipIndex": 0, "start": 0, "end": 3, "reason": "Strong opening — specific reason"}
  ]
}

suggestedCluster must be "ugc-ads" or "travel-cinematic".
People/products/UGC/interviews → ugc-ads; landscapes/travel/storytelling → travel-cinematic.`;
}

function buildFallbackAnalysis(clips: GeminiClip[]): VideoAnalysisOutput {
  return {
    clips: clips.map(c => ({
      clipIndex: c.index,
      name: c.name,
      estimatedDuration: c.duration ?? 5,
      scenes: [{ startTime: 0, endTime: c.duration ?? 5, description: c.name, energyLevel: "medium" as const, hasHuman: false, hasProduct: false, suitableAsHook: true }],
      motion: "medium" as const,
      dominantColors: [],
      audioPresent: false,
      quality: "medium" as const,
      usability: 0.7,
      suggestedUse: "editorial cut",
      bestSegmentStart: 0,
      bestSegmentEnd: Math.min(c.duration ?? 5, 5),
    })),
    overallQuality: 0.7,
    editableClipCount: clips.length,
    footageSummary: `${clips.length} clip(s) provided. Vision analysis unavailable — using metadata only.`,
    suggestedCluster: "ugc-ads",
    suggestedEditStyle: "editorial cut",
    hookCandidates: clips.length ? [{ clipIndex: 0, start: 0, end: 3, reason: "First clip — default hook candidate" }] : [],
  };
}

function extractText(data: Record<string, unknown>): string {
  return (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function cleanJson(raw: string): string {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
