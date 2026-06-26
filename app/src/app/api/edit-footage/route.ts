import { NextRequest, NextResponse } from "next/server";
import { geminiRequest } from "@/lib/gemini";

export const maxDuration = 60;

const MODEL = "gemini-2.5-pro";

const SYSTEM_PROMPT = `You are a production-grade AI video editor. You receive video clips WITH VISUAL FRAMES attached to each clip. Follow the creative brief EXACTLY — no approximations, no deviations.

━━━ MANDATORY PROCESS ━━━

STEP 1 — VISUAL ANALYSIS (required — inspect every frame):
For each clip, look at the frames and note:
• Who appears: gender, age, distinguishing features (sunglasses, hat, specific clothing)
• What is happening
• Write ALL findings in "reasoning"

STEP 2 — MAP PROMPT TO PLAN:
A. CLIP ORDERING — match people from visual analysis to prompt instructions:
   • "start with girl/woman" → find the clip where a girl/woman appears, put her clip FIRST in sceneOrder
   • "end with guy in sunglasses" → find the clip where someone wears sunglasses, put that clip LAST
   • Honour every position mentioned in the prompt

B. TRANSITIONS — when prompt says "zoom-out transition" or "add transitions":
   • Add a transitions entry for EVERY boundary between clips (that is: sceneOrder.length - 1 entries)
   • afterClipIndex = the ORIGINAL clip index from the input "Clip X" list — NOT the position in sceneOrder
   • Example: if sceneOrder = [2, 0, 1, 3], add transitions afterClipIndex 2, afterClipIndex 0, afterClipIndex 1 (skip the last)

C. BRIGHTNESS — map natural language to exposure values:
   • "increase 20% brightness" → exposure: 0.2
   • "increase 30% brightness" → exposure: 0.3
   • "darker" / "decrease brightness 20%" → exposure: -0.2
   • Exposure range: -1.0 to +1.0

D. AUDIO MUTING — when prompt says "remove audio", "mute clips", "no original sound":
   • Set "muteSourceAudio": true

E. TRIM — when prompt says "cut pauses" or "remove repeats":
   • Set trimStart > 0 to skip silence at the beginning of the clip

STEP 3 — VALIDATE (before outputting):
□ sceneOrder contains every clip index exactly once
□ transitions has exactly (sceneOrder.length - 1) entries, covering all boundaries
□ globalColorAdjustments.exposure matches the brightness request
□ muteSourceAudio is set correctly

━━━ OUTPUT (strict JSON, NO markdown, NO extra text) ━━━
{
  "reasoning": "Clip 0: man in grey shirt. Clip 1: GIRL in blue dress — goes FIRST. Clip 2: man with SUNGLASSES — goes LAST. Clip 3: another man.",
  "sceneOrder": [1, 0, 3, 2],
  "transitions": [
    {"afterClipIndex": 1, "type": "zoom-out", "duration": 0.8},
    {"afterClipIndex": 0, "type": "zoom-out", "duration": 0.8},
    {"afterClipIndex": 3, "type": "zoom-out", "duration": 0.8}
  ],
  "globalColorAdjustments": {
    "exposure": 0.2,
    "contrast": 0,
    "saturation": 0,
    "temperature": 0,
    "tint": 0,
    "highlights": 0,
    "shadows": 0
  },
  "muteSourceAudio": false,
  "trimInstructions": [
    {"clipIndex": 0, "trimStart": 0, "trimEnd": null},
    {"clipIndex": 1, "trimStart": 0, "trimEnd": null},
    {"clipIndex": 2, "trimStart": 0, "trimEnd": null},
    {"clipIndex": 3, "trimStart": 0, "trimEnd": null}
  ],
  "targetDuration": null
}

Valid transition types: "cut" "fade" "dissolve" "wipe-left" "wipe-right" "zoom-in" "zoom-out" "cross-zoom" "slide-left" "slide-right" "cinematic-fade" "glitch" "blur" "whip" "light-leak" "flash"`;

interface ClipInfo {
  index: number;
  name: string;
  duration: number;
  frames?: string[]; // base64 JPEG data URLs for Gemini Vision
}

interface EditPlan {
  reasoning: string;
  sceneOrder: number[];
  trimInstructions: Array<{
    clipIndex: number;
    trimStart: number;
    trimEnd: number | null;
    note?: string;
  }>;
  transitions: Array<{
    afterClipIndex: number;
    type: string;
    duration: number;
  }>;
  globalColorAdjustments: {
    exposure: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
    highlights: number;
    shadows: number;
  };
  captions: unknown[];
  targetDuration: number | null;
  muteSourceAudio?: boolean;
}

function defaultPlan(clips: ClipInfo[]): EditPlan {
  return {
    reasoning: "Using default ordering due to AI unavailability.",
    sceneOrder: clips.map(c => c.index),
    trimInstructions: clips.map(c => ({ clipIndex: c.index, trimStart: 0, trimEnd: null, note: "" })),
    transitions: clips.slice(0, -1).map(c => ({ afterClipIndex: c.index, type: "fade", duration: 0.5 })),
    globalColorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
    captions: [],
    targetDuration: null,
    muteSourceAudio: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, clips }: { prompt: string; clips: ClipInfo[] } = await req.json();

    if (!prompt || !clips?.length) {
      return NextResponse.json({ error: "prompt and clips are required" }, { status: 400 });
    }

    const clipList = clips
      .map(c => `  - Clip ${c.index}: "${c.name}" (${c.duration.toFixed(1)}s)`)
      .join("\n");

    // Build multimodal parts: text + image frames for each clip
    type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
    const userParts: GeminiPart[] = [];

    userParts.push({ text: `USER PROMPT: ${prompt}\n\nUPLOADED CLIPS:\n${clipList}\n\nTotal clips: ${clips.length}\nTotal footage duration: ${clips.reduce((s, c) => s + c.duration, 0).toFixed(1)}s\n\nBelow are sample frames from each clip so you can identify who is in them and what they look like:\n` });

    for (const clip of clips) {
      if (clip.frames && clip.frames.length > 0) {
        userParts.push({ text: `\n--- Clip ${clip.index}: "${clip.name}" (${clip.duration.toFixed(1)}s) ---` });
        for (const frame of clip.frames) {
          const base64 = frame.replace(/^data:image\/\w+;base64,/, "");
          if (base64) {
            userParts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
          }
        }
      }
    }

    userParts.push({ text: "\nNow return the JSON edit plan exactly as specified." });

    let plan: EditPlan;

    try {
      const response = await geminiRequest(MODEL, {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const raw = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
        ?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Strip markdown fences if present
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      plan = JSON.parse(cleaned) as EditPlan;

      // Ensure muteSourceAudio defaults to false if not provided
      if (plan.muteSourceAudio === undefined) {
        plan.muteSourceAudio = false;
      }

      // Validate sceneOrder contains all clip indices
      const inputIndices = new Set(clips.map(c => c.index));
      const outputIndices = new Set(plan.sceneOrder);
      const missing = [...inputIndices].filter(i => !outputIndices.has(i));
      if (missing.length) {
        // Append any missing clips at the end
        plan.sceneOrder = [...plan.sceneOrder, ...missing];
      }

      // Validate transitions — auto-fill missing boundaries
      const expectedTransitions = plan.sceneOrder.length - 1;
      if (plan.transitions.length < expectedTransitions) {
        // Find the most common transition type in the plan, or fall back to "fade"
        const typeCounts = new Map<string, number>();
        for (const t of plan.transitions) {
          typeCounts.set(t.type, (typeCounts.get(t.type) ?? 0) + 1);
        }
        let mostCommon = "fade";
        let maxCount = 0;
        for (const [type, count] of typeCounts) {
          if (count > maxCount) { maxCount = count; mostCommon = type; }
        }

        const coveredIndices = new Set(plan.transitions.map(t => t.afterClipIndex));
        // The boundaries that need transitions are: sceneOrder[0..n-2] (all except last)
        for (let i = 0; i < plan.sceneOrder.length - 1; i++) {
          const origIdx = plan.sceneOrder[i];
          if (!coveredIndices.has(origIdx)) {
            console.warn(`[edit-footage] Auto-filling missing transition after clip index ${origIdx} with "${mostCommon}"`);
            plan.transitions.push({ afterClipIndex: origIdx, type: mostCommon, duration: 0.8 });
            coveredIndices.add(origIdx);
          }
        }
      }
    } catch (aiErr) {
      console.error("[edit-footage] AI error, using default plan:", aiErr);
      plan = defaultPlan(clips);
    }

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    console.error("[edit-footage] route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
