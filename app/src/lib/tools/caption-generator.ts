/**
 * Caption Generator Tool
 *
 * Purpose:  Review and improve captions across all scenes.
 *           Cluster-aware: UGC/Ads → punchy ALL-CAPS; Travel → storytelling narrative.
 *           Enforces brand character limits.
 *
 * Input:    Timeline JSON, cluster caption style, brand caption config
 * Output:   Updated captions per scene
 * Model:    gemini-2.5-flash
 *
 * Failure cases:
 *   - Model error → original captions preserved (non-fatal)
 *   - Caption too long → truncated to brand max chars
 */

import { geminiRequest } from "@/lib/gemini";
import type { Timeline } from "@/types/timeline";
import type { Tool, ToolContext, ToolResult } from "./types";

const MODEL = "gemini-2.5-pro";

export interface CaptionGeneratorInput {
  timeline: Timeline;
  captionStyle: "punchy" | "storytelling" | "minimal";
  maxCharsPerLine: number;
  platform: string;
  tone: string;
  brandName: string;
  originalPrompt?: string;
}

export interface SceneCaptions {
  sceneId: string;
  captions: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    style: string;
  }>;
}

export interface CaptionGeneratorOutput {
  scenes: SceneCaptions[];
  captionNotes: string;
}

export const captionGeneratorTool: Tool<CaptionGeneratorInput, CaptionGeneratorOutput> = {
  name: "caption-generator",
  description: "Generates and refines captions per scene, cluster-aware and brand-compliant",
  purpose: "Ensure captions match the video style and platform — UGC uses punchy hooks, cinematic uses narrative",
  inputs: "Timeline JSON, caption style, max chars, platform, tone, brand name",
  outputs: "Updated captions per scene with correct timing and brand-compliant length",
  modelsUsed: [MODEL],
  failureCases: [
    "Model error → original captions preserved",
    "Caption too long → auto-truncated to max chars",
    "Missing timing → defaults to first 2s of scene",
  ],
  knownLimitations: [
    "Cannot detect spoken words from audio — captions are visual text only",
    "Emoji support depends on render engine",
  ],

  async execute(input: CaptionGeneratorInput, ctx: ToolContext): Promise<ToolResult<CaptionGeneratorOutput>> {
    void ctx;
    const start = Date.now();
    const scenes = input.timeline.scenes ?? [];

    if (!scenes.length) {
      return {
        success: true,
        data: { scenes: [], captionNotes: "No scenes" },
        durationMs: Date.now() - start,
        modelUsed: MODEL,
      };
    }

    try {
      const sceneList = scenes.map((s, i) =>
        `Scene ${i + 1} (id: ${s.id}): "${s.label}" — ${s.duration}s\n  Existing captions: ${(s.captions ?? []).map(c => `"${c.text}"`).join(", ") || "none"}\n  Description: ${(s.description ?? "").slice(0, 120)}`
      ).join("\n\n");

      const styleGuide = {
        punchy: "ALL CAPS, max 4 words, no filler words. Examples: 'THIS IS IT.', 'MADE FOR YOU.', 'THE DIFFERENCE.'",
        storytelling: "Sentence case, 6-10 words, narrative voice. Examples: 'Crafted for those who appreciate quality.', 'A journey worth taking.'",
        minimal: "1-3 words max. Brand name or key message only. Examples: 'Asaya.', 'Crafted.', 'Yours.'",
      }[input.captionStyle];

      const briefSection = input.originalPrompt
        ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nORIGINAL USER BRIEF (this defines the caption tone — follow it exactly):\n${input.originalPrompt}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        : "";

      const prompt = `You are a caption writer for ${input.brandName} videos.
${briefSection}
PLATFORM: ${input.platform}
TONE: ${input.tone}
CLUSTER DEFAULT STYLE: ${input.captionStyle} — ${styleGuide}
MAX CHARS PER LINE: ${input.maxCharsPerLine}

CRITICAL: The original brief above defines the actual caption style. If the brief asks for natural, conversational, or narrative captions — write those, regardless of the cluster default. Only use the cluster default style if the brief doesn't specify a tone.

SCENES:
${sceneList}

Write captions that match the brief's tone and what actually happens in each scene. Each scene gets 0-2 captions max.
Captions appear at the scene's emotional peak, not at 0s unless it's the hook.

Return ONLY JSON:
{
  "scenes": [
    {
      "sceneId": "<scene id>",
      "captions": [
        {
          "id": "<uuid>",
          "text": "<caption — max ${input.maxCharsPerLine} chars>",
          "startTime": 0.5,
          "endTime": 2.5,
          "style": "brand-default"
        }
      ]
    }
  ],
  "captionNotes": "Brief explanation of the caption strategy used"
}`;

      const data = await geminiRequest(MODEL, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      });

      const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const result = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as CaptionGeneratorOutput;

      // Enforce max char limit
      for (const scene of result.scenes ?? []) {
        for (const cap of scene.captions ?? []) {
          if (cap.text.length > input.maxCharsPerLine) {
            cap.text = cap.text.slice(0, input.maxCharsPerLine - 1) + "…";
          }
        }
      }

      return { success: true, data: result, durationMs: Date.now() - start, modelUsed: MODEL };
    } catch (e) {
      // Non-fatal — original captions preserved
      return {
        success: true,
        data: {
          scenes: scenes.map(s => ({
            sceneId: s.id,
            captions: s.captions?.map(c => ({
              id: c.id, text: c.text, startTime: c.startTime, endTime: c.endTime, style: c.style ?? "brand-default",
            })) ?? [],
          })),
          captionNotes: `Caption generation error: ${e instanceof Error ? e.message : String(e)}`,
        },
        durationMs: Date.now() - start,
        modelUsed: MODEL,
        error: "Used original captions",
      };
    }
  },
};
