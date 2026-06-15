/**
 * Timeline Generator Tool
 *
 * Purpose:  Generate the full timeline JSON from a brief + analysis context.
 *           Cluster-aware: UGC/Ads uses fast-paced cuts; Travel uses cinematic pacing.
 *           Mode-aware: Editorial assembles from clips; Concept writes directions.
 *
 * Input:    Brief, brand context, cluster config, hook result, clip analysis
 * Output:   Full Timeline JSON + clip assignments + editorial suggestions
 * Models:   editorial → gemini-2.5-pro (multimodal); concept → gemini-2.5-flash
 *
 * Failure cases:
 *   - Empty scenes returned → caller falls back to demo lineup
 *   - Duration mismatch > 20% → logged as QA issue, not fatal
 */

import { geminiRequest, validateAndSanitizeLineup } from "@/lib/gemini";
import type { GeminiClip, ClipAssignment, BrandOverrides } from "@/lib/gemini";
import type { BrandWorkspace } from "@/types/brand";
import type { Timeline, LineupResponse } from "@/types/timeline";
import type { Tool, ToolContext, ToolResult } from "./types";
import type { HookDetectionOutput } from "./hook-detection";
import type { VideoAnalysisOutput } from "./video-analysis";

const MODELS = {
  editorial: "gemini-2.5-pro",
  concept:   "gemini-2.5-pro",
} as const;

export interface TimelineGeneratorInput {
  prompt: string;
  brand: BrandWorkspace;
  aspectRatio?: string;
  overrides?: BrandOverrides;
  clips?: GeminiClip[];
  hookResult?: HookDetectionOutput;
  videoAnalysis?: VideoAnalysisOutput;
  clusterConfig: ClusterConfig;
  pastExamples?: string;
  classification: {
    cluster: string;
    mode: string;
    intent: string;
    tone: string;
    platform: string;
  };
}

export interface ClusterConfig {
  clusterId: string;
  pacingStyle: "fast-cuts" | "medium-paced" | "cinematic-slow";
  defaultTransitions: string[];
  captionStyle: "punchy" | "storytelling" | "minimal";
  colorGradeDefault: string;
  sceneCountRange: [number, number];
  systemPrompt: string;
}

export interface TimelineGeneratorOutput {
  timeline: Timeline;
  suggestions?: LineupResponse["suggestions"];
  clipAssignments: ClipAssignment[];
  generationNotes: string;
}

export const timelineGeneratorTool: Tool<TimelineGeneratorInput, TimelineGeneratorOutput> = {
  name: "timeline-generator",
  description: "Generates the complete timeline JSON using cluster-specific prompts and multi-model routing",
  purpose: "Produce an edit plan that matches professional output for the target cluster and platform",
  inputs: "Brief, brand workspace, cluster config, hook result, video analysis, past examples",
  outputs: "Timeline JSON, clip assignments, editorial suggestions, generation notes",
  modelsUsed: [MODELS.editorial, MODELS.concept],
  failureCases: [
    "Empty scenes → caller falls back to demo lineup",
    "Duration mismatch >20% → QA issue logged",
    "JSON parse failure → retry with stricter prompt",
  ],
  knownLimitations: [
    "Cannot access external references or style videos",
    "Clip trim precision is limited by model token window",
    "Very long targets (>120s) may produce uneven scene distribution",
  ],

  async execute(input: TimelineGeneratorInput, ctx: ToolContext): Promise<ToolResult<TimelineGeneratorOutput>> {
    void ctx;
    const start = Date.now();
    const model = input.clips?.length ? MODELS.editorial : MODELS.concept;

    try {
      const ratio = input.aspectRatio ?? input.brand.defaultAspectRatio;
      const overrideLines = buildOverrideLines(input.overrides);
      const hookSection = input.hookResult
        ? `HOOK GUIDANCE:\n  Strategy: ${input.hookResult.hookStrategy}\n  Opening clip: ${input.hookResult.recommendedHook.clipIndex ?? "concept"} @ ${input.hookResult.recommendedHook.trimStart}s–${input.hookResult.recommendedHook.trimEnd}s\n  Caption: "${input.hookResult.recommendedHook.captionSuggestion}"\n`
        : "";
      if (input.clips?.length) {
        return await generateEditorial(input, model, ratio, overrideLines, hookSection, start);
      } else {
        return await generateConcept(input, model, ratio, overrideLines, hookSection, start);
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
    }
  },
};

async function generateConcept(
  input: TimelineGeneratorInput,
  model: string,
  ratio: string,
  overrideLines: string,
  hookSection: string,
  start: number,
): Promise<ToolResult<TimelineGeneratorOutput>> {
  const { sceneCountRange, pacingStyle, defaultTransitions, captionStyle, colorGradeDefault } = input.clusterConfig;
  const pastSection = input.pastExamples
    ? `\nSUCCESSFUL PAST EXAMPLES (match this quality):\n${input.pastExamples}\n`
    : "";

  const prompt = `${input.clusterConfig.systemPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER'S EXACT REQUEST (follow this precisely):
${input.prompt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every scene description, caption, and structural choice MUST directly reflect the brief above.
Do not generate generic content. If the brief mentions specific products, tones, actions, or styles — they MUST appear in the output.
BRAND: ${input.brand.name}
Style keywords: ${input.brand.styleKeywords.join(", ")}
Prohibited: ${input.brand.prohibitedElements.join(", ")}
Aspect ratio: ${ratio}
Color grade: ${input.overrides?.colorGrade ?? colorGradeDefault ?? input.brand.colorGrade.name}
Caption position: ${input.brand.captionStyle.position}, max ${input.brand.captionStyle.maxCharsPerLine} chars/line
${overrideLines}
CLUSTER DEFAULTS (starting point only — the brief above overrides these):
  Style: ${pacingStyle} | Transitions: ${defaultTransitions.join(", ")} | Captions: ${captionStyle}
  Typical range: ${sceneCountRange[0]}–${sceneCountRange[1]} scenes — use only as many as the brief ACTUALLY needs

BRIEF-DRIVEN PACING (derive from the brief above, not the defaults):
  - slow / cinematic / atmospheric / narrative brief → scenes 4-8s, let shots breathe, fewer cuts
  - fast / energetic / punchy / ad / reel brief → scenes 2-4s, snappy cuts
  - neutral brief → apply ${pacingStyle} default
  - NEVER add scenes just to fill a range. Fewer intentional scenes beats more generic ones.
  - Each scene must serve a distinct, specific purpose from the brief.

CLASSIFIED INTENT: ${input.classification.intent}
TONE: ${input.classification.tone} | PLATFORM: ${input.classification.platform}

${hookSection}${pastSection}

Generate DIRECTORIAL scene descriptions that directly serve the brief.
Each scene description must be specific: camera angle, subject, action, lighting — not generic.

Return ONLY this JSON:
{
  "timeline": {
    "id": "<uuid>", "title": "<title>", "brandWorkspaceId": "${input.brand.id}",
    "createdAt": "<ISO>", "updatedAt": "<ISO>",
    "totalDuration": <number>, "aspectRatio": "${ratio}",
    "targetPlatform": "${input.classification.platform}",
    "scenes": [{
      "id": "<uuid>", "order": 0, "label": "<scene name>",
      "description": "<DIRECTORIAL: exact shot — camera angle, subject, action, lighting>",
      "duration": <sec>,
      "transition": {"type": "<${defaultTransitions[0]}>", "duration": 0.5},
      "captions": [{"id":"<uuid>","text":"<${captionStyle === "punchy" ? "SHORT PUNCHY CAPS" : "narrative caption"}>","startTime":0,"endTime":2,"style":"brand-default"}],
      "overlays": [], "motionStyle": "<slow-pan|ken-burns|static>", "mood": "${input.classification.tone}"
    }],
    "audioLayers": [{"id":"<uuid>","type":"bgm","startTime":0,"endTime":<total>,"volume":0.6,"fadeIn":1,"fadeOut":2}],
    "globalColorGrade": "${input.overrides?.colorGrade ?? colorGradeDefault ?? input.brand.colorGrade.name}",
    "meta": {"generatedBy":"${model}","promptUsed":"${input.prompt.replace(/"/g, "'")}","brandWorkspaceId":"${input.brand.id}","version":1,"cluster":"${input.clusterConfig.clusterId}"},
    "isLocked": false
  },
  "clipAssignments": [],
  "suggestions": {
    "captionTiming": "...", "transitionRationale": "...", "brandNotes": "...", "improvements": []
  }
}`;

  const data = await geminiRequest(model, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.45, topP: 0.88 },
  });

  const raw = extractText(data);
  const parsed = JSON.parse(cleanJson(raw)) as Record<string, unknown>;
  const sanitized = validateAndSanitizeLineup(parsed, input.brand, input.aspectRatio);

  return {
    success: true,
    data: {
      timeline: sanitized.timeline,
      suggestions: sanitized.suggestions,
      clipAssignments: [],
      generationNotes: `Concept mode — ${sanitized.timeline.scenes?.length ?? 0} scenes at ${model}`,
    },
    durationMs: Date.now() - start,
    modelUsed: model,
  };
}

async function generateEditorial(
  input: TimelineGeneratorInput,
  model: string,
  ratio: string,
  overrideLines: string,
  hookSection: string,
  start: number,
): Promise<ToolResult<TimelineGeneratorOutput>> {
  const clips = input.clips!;
  const { pacingStyle, defaultTransitions, captionStyle, colorGradeDefault } = input.clusterConfig;
  const clipList = clips.map(c => `  Clip ${c.index}: "${c.name}"${c.duration ? ` (${c.duration.toFixed(2)}s — clipTrimEnd max: ${c.duration.toFixed(2)})` : ""}`).join("\n");

  const analysisSummary = input.videoAnalysis?.clips?.length
    ? `\nCLIP ANALYSIS (use this to identify who/what is in each clip):\n${input.videoAnalysis.clips.map(c => {
        const sceneDescs = c.scenes?.map(s => s.description).filter(Boolean).join(" → ") ?? "";
        return `  Clip ${c.clipIndex}: ${sceneDescs || c.suggestedUse} | best segment: ${c.bestSegmentStart}–${c.bestSegmentEnd}s | quality: ${c.quality}`;
      }).join("\n")}\n`
    : "";

  const prompt = `You are a video editor. Read the brief and build ONLY what it describes — nothing extra.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER'S EXACT REQUEST — the only authority:
${input.prompt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE RULES:
1. Create ONLY the scenes the brief explicitly describes. DO NOT add any scene not mentioned.
2. ONE scene per clip — never split one clip into multiple scenes.
3. DO NOT add extra scenes at the end. If the brief ends with "end with X" — that is the LAST scene. Stop there.
4. clipTrimEnd MUST be ≤ the clip's exact duration shown in CLIP INVENTORY — exceeding it causes looping.
5. For "complete / natural / full answer" — clipTrimStart=0.0, clipTrimEnd=<exact clip duration as a double/decimal e.g. 8.53, NOT 9>.
6. ALL time values (clipTrimStart, clipTrimEnd, duration) MUST be doubles/decimals — never integers. Write 8.53 not 9, write 12.07 not 12.
7. Match each person/subject in the brief to a clip number using the frames and clip analysis.
8. Scene order must exactly follow the brief.
9. SPEED: If the brief specifies a playback speed (e.g. "2x", "slow motion"), set "playbackSpeed" on EVERY scene AND set duration = (clipTrimEnd - clipTrimStart) / playbackSpeed.
10. EFFECTS: If the brief specifies a visual effect or filter, set "visualEffect" on EVERY scene to the effect name (e.g. "black-and-white", "vignette", "warm", "cinematic").
11. TRANSITIONS: If the brief specifies transitions, set "transition.type" accordingly — valid values: "cut","fade","dissolve","wipe-left","wipe-right","zoom-in","zoom-out","slide-left","slide-right","cinematic-fade".

CLIP INVENTORY:
${clipList}
${analysisSummary}
BRAND: ${input.brand.name} | Aspect ratio: ${ratio} | Color grade: ${input.overrides?.colorGrade ?? colorGradeDefault ?? input.brand.colorGrade.name}
Captions: ${input.brand.captionStyle.position}, max ${input.brand.captionStyle.maxCharsPerLine} chars/line
${overrideLines}
TONE: ${input.classification.tone} | PLATFORM: ${input.classification.platform}
${hookSection}

Return ONLY this JSON. The scenes array must contain ONLY what the brief asks for — no extras:
{
  "timeline": {
    "id":"<uuid>","title":"<title>","brandWorkspaceId":"${input.brand.id}",
    "createdAt":"<ISO>","updatedAt":"<ISO>",
    "totalDuration":<sum of scene durations>,"aspectRatio":"${ratio}","targetPlatform":"${input.classification.platform}",
    "scenes": [
      {
        "id":"<uuid>","order":0,
        "label":"<who is in this clip>",
        "description":"<what happens in this clip>",
        "duration":<(clipTrimEnd - clipTrimStart) divided by playbackSpeed if speed≠1, else clipTrimEnd - clipTrimStart>,
        "clipTrimStart":0.0,"clipTrimEnd":<exact clip duration as double e.g. 8.53 — copy from CLIP INVENTORY, never round to integer>,
        "playbackSpeed":<1.0 normally; use speed from brief if specified e.g. 2.0 for 2x>,
        "visualEffect":<"effect-name" if brief specifies one, else null>,
        "transition":{"type":"<cut by default; use brief's transition type if specified>","duration":0.3},
        "captions":[{"id":"<uuid>","text":"<caption>","startTime":0.5,"endTime":2.5,"style":"brand-default"}],
        "overlays":[],"motionStyle":"static","mood":"${input.classification.tone}"
      }
    ],
    "audioLayers":[{"id":"<uuid>","type":"bgm","startTime":0,"endTime":<total>,"volume":0.5,"fadeIn":1,"fadeOut":2}],
    "globalColorGrade":"${input.overrides?.colorGrade ?? colorGradeDefault ?? input.brand.colorGrade.name}",
    "meta":{"generatedBy":"${model}","promptUsed":"${input.prompt.slice(0, 120).replace(/"/g, "'")}","brandWorkspaceId":"${input.brand.id}","version":1,"cluster":"${input.clusterConfig.clusterId}"},
    "isLocked":false
  },
  "clipAssignments":[{"sceneId":"<uuid>","clipIndex":<0-based>,"trimStart":0,"trimEnd":<exact clip duration>}],
  "suggestions":{"captionTiming":"...","transitionRationale":"...","brandNotes":"...","improvements":[]}
}`;

  const parts: Record<string, unknown>[] = [];
  for (const clip of clips) {
    parts.push({ text: `Clip ${clip.index}: "${clip.name}"${clip.duration ? ` (${clip.duration.toFixed(1)}s total)` : ""}` });
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
  parts.push({ text: prompt });

  const data = await geminiRequest(model, {
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.3, topP: 0.85 },
  });

  const raw = extractText(data);
  const parsed = JSON.parse(cleanJson(raw)) as Record<string, unknown>;

  const clipAssignments: ClipAssignment[] = Array.isArray(parsed.clipAssignments)
    ? (parsed.clipAssignments as ClipAssignment[])
    : [];

  const sanitized = validateAndSanitizeLineup(parsed, input.brand, input.aspectRatio);

  if (clipAssignments.length && sanitized.timeline.scenes?.length) {
    sanitized.timeline.scenes = sanitized.timeline.scenes.map(scene => {
      const a = clipAssignments.find(ca => ca.sceneId === scene.id);
      return a ? { ...scene, clipTrimStart: a.trimStart ?? scene.clipTrimStart, clipTrimEnd: a.trimEnd ?? scene.clipTrimEnd } : scene;
    });
  }

  return {
    success: true,
    data: {
      timeline: sanitized.timeline,
      suggestions: sanitized.suggestions,
      clipAssignments,
      generationNotes: `Editorial mode — ${sanitized.timeline.scenes?.length ?? 0} scenes from ${clips.length} clips at ${model}`,
    },
    durationMs: Date.now() - start,
    modelUsed: model,
  };
}

function buildOverrideLines(overrides?: BrandOverrides): string {
  if (!overrides) return "";
  const lines = [
    overrides.primaryColor && `Primary color override: ${overrides.primaryColor}`,
    overrides.fontFamily   && `Font override: ${overrides.fontFamily}`,
    overrides.logoPosition && `Logo position override: ${overrides.logoPosition}`,
    overrides.colorGrade   && `Color grade override: ${overrides.colorGrade}`,
  ].filter(Boolean);
  return lines.length ? `BRAND OVERRIDES:\n${lines.join("\n")}` : "";
}

function extractText(data: Record<string, unknown>): string {
  return (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    .candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function cleanJson(raw: string): string {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
