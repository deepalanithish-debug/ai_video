/**
 * Brief Interpreter Agent
 *
 * Pass 1 of the two-pass pipeline.
 * Reads the user's raw prompt and converts it into a structured creative brief
 * before any video is analyzed. This gives every downstream tool precise,
 * unambiguous instructions instead of asking them to re-interpret the prompt.
 *
 * Model: gemini-2.5-pro (text only — fast, no vision needed)
 */

import { geminiRequest } from "@/lib/gemini";

const MODEL = "gemini-2.5-pro";

export interface StructuredBrief {
  // What the user fundamentally wants this video to achieve
  coreIntent: string;

  // Ordered list of what should appear in the video — as specific as the user described
  sceneOrder: Array<{
    position: number;           // 1-based
    description: string;        // exactly what the user said should be here
    mustBeComplete: boolean;    // should this segment play uncut / in full?
    personOrSubject?: string;   // "girl speaking", "guy in sunglasses", "product", etc.
  }>;

  // Pacing
  pacingIntent: "very-fast" | "fast" | "natural" | "slow" | "cinematic";
  allowCutsWithinClip: boolean;  // false = keep each person's full answer uncut

  // Captions
  captionTone: "all-caps-punchy" | "natural-speech" | "narrative" | "minimal" | "none";
  captionStyle: string;  // free-text: "short captions", "subtitle style", etc.

  // Specific hard rules extracted from the brief
  mustHaves: string[];   // "start with the girl", "end with sunglasses guy"
  mustNots: string[];    // "don't cut mid-sentence", "no generic captions"

  // Speed & effects
  globalPlaybackSpeed?: number;    // e.g. 2 for "2x speed", 0.5 for "slow-mo"
  visualEffects?: string[];        // e.g. ["black-and-white", "vignette"]
  transitionStyle?: string;        // e.g. "fade", "dissolve", "cut"

  // Overall style
  energyLevel: "high" | "medium" | "low";
  platform: string;
  tone: string;

  // Summary for logging
  interpretationSummary: string;
}

export async function interpretBrief(prompt: string): Promise<StructuredBrief> {
  const start = Date.now();

  const systemPrompt = `You are a creative director parsing a video editing brief.
Your job: extract EXACTLY what the user wants — their specific instructions, the order they described, the people they mentioned, the style they requested.
Do not add anything they didn't say. Do not assume defaults. Capture their words precisely.`;

  const userPrompt = `Parse this video editing brief into a structured creative brief.

USER'S BRIEF:
"${prompt}"

Extract:
1. What they want in the video, in the exact order they described it
2. Whether segments should play completely uncut (e.g. "keep each answer complete")
3. The pacing and energy they described
4. Caption style implied by the brief
5. Hard rules: what MUST be in the video, what MUST NOT happen
6. Speed: if the user says "2x", "double speed", "slow motion", "0.5x", etc. — extract as a number (2.0, 0.5, etc.)
7. Visual effects/filters: if the user says "black and white", "vignette", "warm", "cinematic", "blur", etc.
8. Transition style: if the user says "fade", "dissolve", "wipe", etc.

Return ONLY valid JSON:
{
  "coreIntent": "one sentence — what this video should achieve",
  "sceneOrder": [
    {
      "position": 1,
      "description": "exact description of what should appear here, using the user's own words",
      "mustBeComplete": true,
      "personOrSubject": "girl speaking (if mentioned)"
    }
  ],
  "pacingIntent": "natural",
  "allowCutsWithinClip": false,
  "captionTone": "natural-speech",
  "captionStyle": "short subtitle-style captions matching the spoken tone",
  "mustHaves": ["start with the girl speaking", "end with the guy in sunglasses"],
  "mustNots": ["do not cut mid-answer", "do not add generic captions"],
  "globalPlaybackSpeed": 1.0,
  "visualEffects": [],
  "transitionStyle": "cut",
  "energyLevel": "medium",
  "platform": "instagram",
  "tone": "fun and casual",
  "interpretationSummary": "2-sentence summary of what was understood"
}

Speed examples: "2x speed" → globalPlaybackSpeed: 2.0, "slow motion" → 0.5, "normal" → 1.0
visualEffects examples: "black and white" → ["black-and-white"], "add vignette and warm tones" → ["vignette","warm"]
transitionStyle examples: "fade between clips" → "fade", "smooth dissolves" → "dissolve", default → "cut"

pacingIntent options: "very-fast" | "fast" | "natural" | "slow" | "cinematic"
captionTone options: "all-caps-punchy" | "natural-speech" | "narrative" | "minimal" | "none"
If the brief doesn't specify something, infer it from the overall context.`;

  try {
    const data = await geminiRequest(MODEL, {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will extract the user's exact intent without adding assumptions." }] },
        { role: "user", parts: [{ text: userPrompt }] },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, topP: 0.8 },
    });

    const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as StructuredBrief;

    console.log(`[brief-interpreter] "${parsed.coreIntent}" | pacing: ${parsed.pacingIntent} | ${parsed.sceneOrder?.length ?? 0} ordered scenes | ${Date.now() - start}ms`);
    return parsed;
  } catch (e) {
    // Fallback: minimal structured brief
    console.warn("[brief-interpreter] fallback due to error:", e instanceof Error ? e.message : String(e));
    return {
      coreIntent: prompt.slice(0, 120),
      sceneOrder: [],
      pacingIntent: "natural",
      allowCutsWithinClip: false,
      captionTone: "natural-speech",
      captionStyle: "match the tone of the brief",
      mustHaves: [],
      mustNots: [],
      globalPlaybackSpeed: 1.0,
      visualEffects: [],
      transitionStyle: "cut",
      energyLevel: "medium",
      platform: "instagram",
      tone: "casual",
      interpretationSummary: `Brief: "${prompt.slice(0, 80)}…"`,
    };
  }
}

export function formatBriefForPrompt(brief: StructuredBrief): string {
  const orderLines = brief.sceneOrder.length
    ? `REQUIRED SCENE ORDER:\n${brief.sceneOrder.map(s => `  ${s.position}. ${s.description}${s.mustBeComplete ? " [KEEP COMPLETE — do not cut]" : ""}${s.personOrSubject ? ` → subject: ${s.personOrSubject}` : ""}`).join("\n")}`
    : "";

  const mustHaveLines = brief.mustHaves.length ? `MUST HAVE:\n${brief.mustHaves.map(m => `  • ${m}`).join("\n")}` : "";
  const mustNotLines = brief.mustNots.length ? `MUST NOT:\n${brief.mustNots.map(m => `  • ${m}`).join("\n")}` : "";

  const speedLine = brief.globalPlaybackSpeed && brief.globalPlaybackSpeed !== 1
    ? `SPEED: ${brief.globalPlaybackSpeed}x — set playbackSpeed=${brief.globalPlaybackSpeed} on ALL scenes AND divide each scene duration by ${brief.globalPlaybackSpeed}`
    : "";
  const effectsLine = brief.visualEffects?.length
    ? `VISUAL EFFECTS: ${brief.visualEffects.join(", ")} — set visualEffect="${brief.visualEffects[0]}" on ALL scenes`
    : "";
  const transitionLine = brief.transitionStyle && brief.transitionStyle !== "cut"
    ? `TRANSITION STYLE: use "${brief.transitionStyle}" transitions between all scenes`
    : "";

  return [
    `INTENT: ${brief.coreIntent}`,
    orderLines,
    `PACING: ${brief.pacingIntent} | ENERGY: ${brief.energyLevel} | CUTS WITHIN CLIP: ${brief.allowCutsWithinClip ? "allowed" : "NOT allowed — use full segment"}`,
    `CAPTIONS: ${brief.captionTone} — ${brief.captionStyle}`,
    speedLine,
    effectsLine,
    transitionLine,
    mustHaveLines,
    mustNotLines,
  ].filter(Boolean).join("\n\n");
}
