/**
 * Music Selector Tool
 *
 * Purpose:  Recommend a music style (tempo, genre, energy) that matches the
 *           video's cluster, tone, and platform. Since we don't integrate a
 *           licensed music library yet, this outputs a specification that can
 *           be used to search any music library (Artlist, Epidemic Sound, etc.)
 *
 * Input:    Cluster, tone, platform, target duration, scene energy profile
 * Output:   Music specification — tempo, genre, energy curve, search keywords
 * Model:    gemini-2.5-flash
 *
 * Failure cases:
 *   - Unknown cluster → defaults to upbeat electronic
 */

import { geminiRequest } from "@/lib/gemini";
import type { Tool, ToolContext, ToolResult } from "./types";
import { getModel } from "@/lib/ai-router";

const MODEL = getModel("chat");

export interface MusicSelectorInput {
  cluster: string;
  tone: string;
  platform: string;
  targetDuration: number;
  sceneCount: number;
  energyProfile?: string;
  brandName: string;
}

export interface MusicSpec {
  genre: string;
  subgenre: string;
  tempo: "slow" | "medium" | "upbeat" | "fast";
  bpm: [number, number];
  energy: "low" | "medium" | "high";
  mood: string;
  instruments: string[];
  searchKeywords: string[];
  avoidKeywords: string[];
  audioLayers: {
    type: "bgm";
    volume: number;
    fadeIn: number;
    fadeOut: number;
    loopable: boolean;
  };
  editorialNote: string;
}

export interface MusicSelectorOutput {
  primary: MusicSpec;
  alternatives: MusicSpec[];
  musicStrategy: string;
}

export const musicSelectorTool: Tool<MusicSelectorInput, MusicSelectorOutput> = {
  name: "music-selector",
  description: "Recommends a music specification matching the video cluster, tone, and platform energy",
  purpose: "Music selection is 50% of the emotional impact — match it to the edit, not the other way around",
  inputs: "Cluster, tone, platform, duration, scene count, energy profile, brand name",
  outputs: "Primary music spec + 2 alternatives with search keywords for any licensed music library",
  modelsUsed: [MODEL],
  failureCases: [
    "Unknown cluster → defaults to upbeat electronic",
    "Very short videos (<10s) → high-energy no-intro tracks only",
  ],
  knownLimitations: [
    "Does not integrate with a music library — outputs specifications only",
    "Cannot detect spoken audio in clips — assumes music is the primary audio layer",
  ],

  async execute(input: MusicSelectorInput, ctx: ToolContext): Promise<ToolResult<MusicSelectorOutput>> {
    void ctx;
    const start = Date.now();

    try {
      const prompt = `You are a music supervisor for ${input.brandName} videos.

VIDEO CONTEXT:
- Cluster: ${input.cluster}
- Tone: ${input.tone}
- Platform: ${input.platform}
- Duration: ${input.targetDuration}s
- Scene count: ${input.sceneCount}
- Energy profile: ${input.energyProfile ?? "unknown"}

Cluster music guidance:
- ugc-ads: upbeat, modern, commercial — poppy electronic, hip-hop influenced, trend-forward
- travel-cinematic: atmospheric, emotional, cinematic orchestral or indie acoustic

Return ONLY JSON:
{
  "primary": {
    "genre": "electronic",
    "subgenre": "chillwave",
    "tempo": "medium",
    "bpm": [100, 115],
    "energy": "medium",
    "mood": "confident, aspirational",
    "instruments": ["synth", "soft drums", "pad"],
    "searchKeywords": ["corporate motivational", "product launch", "uplifting electronic"],
    "avoidKeywords": ["melancholic", "minor key", "slow piano"],
    "audioLayers": { "type": "bgm", "volume": 0.65, "fadeIn": 1.0, "fadeOut": 1.5, "loopable": true },
    "editorialNote": "Start at the drop — do not use the intro which has 8s of no beat"
  },
  "alternatives": [
    {
      "genre": "pop", "subgenre": "indie pop", "tempo": "upbeat", "bpm": [118, 128],
      "energy": "high", "mood": "energetic, fun",
      "instruments": ["guitar", "drums", "bass"],
      "searchKeywords": ["summer vibes", "lifestyle brand", "feel good"],
      "avoidKeywords": ["sad", "dark"],
      "audioLayers": { "type": "bgm", "volume": 0.7, "fadeIn": 0.5, "fadeOut": 1.0, "loopable": true },
      "editorialNote": "Good for high-energy sections — may overpower dialogue if added later"
    }
  ],
  "musicStrategy": "Lead with the beat on scene 1 — music introduces the energy before the product appears"
}`;

      const data = await geminiRequest(MODEL, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1.0, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 1500 } },
      });

      const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const result = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as MusicSelectorOutput;

      return { success: true, data: result, durationMs: Date.now() - start, modelUsed: MODEL };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), durationMs: Date.now() - start };
    }
  },
};
