import { GoogleAuth } from "google-auth-library";
import type { BrandWorkspace } from "@/types/brand";
import type { Timeline, LineupResponse } from "@/types/timeline";
import { v4 as uuidv4 } from "uuid";

const GEMINI_MODEL = "gemini-2.5-pro";
const GEMINI_PRO_MODEL = "gemini-2.5-pro";

// Vertex AI endpoint — uses GOOGLE_PROJECT_ID + GOOGLE_LOCATION from .env.local
function vertexUrl(model: string) {
  const project = process.env.GOOGLE_PROJECT_ID!;
  const location = process.env.GOOGLE_LOCATION ?? "us-central1";
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

export interface BrandOverrides {
  primaryColor?: string;
  fontFamily?: string;
  logoPosition?: string;
  colorGrade?: string;
}

export interface GeminiClip {
  data?: string;               // base64-encoded file bytes (legacy — single file)
  frames?: string[];           // preferred — base64 JPEG keyframes extracted client-side
  frameTimestamps?: number[];  // timestamp in seconds for each frame in frames[]
  mimeType: string;
  name: string;
  duration?: number;
  index: number;
}

export interface ClipAssignment {
  sceneId: string;
  clipIndex: number;
  trimStart?: number;
  trimEnd?: number;
}

export function getAuthClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  return new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId: process.env.GOOGLE_PROJECT_ID,
  });
}

export async function geminiRequest(
  model: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const auth = getAuthClient();
  const token = await auth.getAccessToken();

  const res = await fetch(vertexUrl(model), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 400)}`);
  }

  return res.json();
}

const LINEUP_SYSTEM_PROMPT = `You are an expert AI video editor and creative director specializing in brand-safe advertising content. Your task is to analyze a creative brief and generate a precise, structured video edit plan (called a "lineup") in JSON format.

CRITICAL RULES:
1. You MUST output ONLY valid JSON — no markdown code fences, no explanations, no extra text. Just raw JSON.
2. Your response MUST be a single JSON object with exactly two top-level keys: "timeline" and "suggestions".
3. You MUST respect all brand settings provided — never override locked brand colors, fonts, or logo rules.
4. If a REQUIRED TOTAL DURATION is specified, scene durations MUST sum to exactly that number. Never deviate.
5. Caption text must be short, punchy, and brand-appropriate.
6. Transitions must match the tone: luxury brands use fades/dissolves, energetic brands use cuts/zooms.
7. Scene IDs and caption IDs must be unique UUID strings.
8. Never suggest prohibited brand elements.
9. ALWAYS wrap the response as: { "timeline": { ... }, "suggestions": { ... } }`;

function buildPromptContext(userPrompt: string, brand: BrandWorkspace, aspectRatio?: string, targetDuration?: number, overrides?: BrandOverrides): string {
  const ratio = aspectRatio ?? brand.defaultAspectRatio;
  const durLine = targetDuration
    ? `REQUIRED TOTAL DURATION: ${targetDuration} seconds exactly. Scene durations MUST sum to exactly ${targetDuration}s.`
    : "";

  const overrideLines = overrides
    ? [
        overrides.primaryColor && `- Primary color: ${overrides.primaryColor} (use this instead of brand default)`,
        overrides.fontFamily   && `- Font family: ${overrides.fontFamily} (use this instead of brand default)`,
        overrides.logoPosition && `- Logo position: ${overrides.logoPosition} (use this instead of brand default)`,
        overrides.colorGrade   && `- Color grade: ${overrides.colorGrade} (use this instead of brand default — set globalColorGrade to this value)`,
      ].filter(Boolean).join("\n")
    : "";
  const overrideSection = overrideLines
    ? `\nBRAND OVERRIDES (these OVERRIDE workspace defaults — apply them):\n${overrideLines}\n`
    : "";

  const colorGradeName = overrides?.colorGrade ?? brand.colorGrade.name;
  const logoPos        = overrides?.logoPosition ?? brand.logo.defaultPosition;

  return `${durLine}
BRAND CONTEXT:
Brand: ${brand.name}
Style keywords: ${brand.styleKeywords.join(", ")}
Prohibited elements: ${brand.prohibitedElements.join(", ")}
Selected aspect ratio: ${ratio} (use this exactly in the output)
Caption style: ${brand.captionStyle.position} alignment, max ${brand.captionStyle.maxCharsPerLine} chars per line, ${brand.captionStyle.animationIn} animation
Color grade: ${colorGradeName} (warmth: ${brand.colorGrade.warmth}, contrast: ${brand.colorGrade.contrast}, vignette: ${brand.colorGrade.vignette})
Logo position: ${logoPos}, allowed on: ${brand.logo.allowedOnScenes}${overrideSection}

USER BRIEF:
${userPrompt}

Generate a complete timeline JSON object following this structure:
{
  "id": "<uuid>",
  "title": "<descriptive title>",
  "brandWorkspaceId": "${brand.id}",
  "createdAt": "<ISO datetime>",
  "updatedAt": "<ISO datetime>",
  "totalDuration": <number in seconds>,
  "aspectRatio": "${ratio}",
  "targetPlatform": "<instagram|tiktok|youtube|reels|facebook|generic>",
  "scenes": [
    {
      "id": "<uuid>",
      "order": <0-based index>,
      "label": "<short scene name>",
      "description": "<what happens in this scene>",
      "duration": <seconds>,
      "transition": { "type": "<cut|fade|dissolve|wipe-left|wipe-right|zoom-in|zoom-out|slide-left|slide-right|cinematic-fade>", "duration": <0.3-1.5> },
      "captions": [
        {
          "id": "<uuid>",
          "text": "<caption text>",
          "startTime": <seconds from scene start>,
          "endTime": <seconds from scene start>,
          "style": "<brand-default|highlight|subtle|bold>"
        }
      ],
      "overlays": [],
      "motionStyle": "<static|slow-pan|fast-cut|ken-burns|zoom-pulse>",
      "mood": "<luxury|energetic|calm|dramatic|playful>"
    }
  ],
  "audioLayers": [
    {
      "id": "<uuid>",
      "type": "bgm",
      "startTime": 0,
      "endTime": <totalDuration>,
      "volume": 0.6,
      "fadeIn": 1.0,
      "fadeOut": 2.0
    }
  ],
  "globalColorGrade": "${brand.colorGrade.name}",
  "meta": {
    "generatedBy": "gemini-2.5-flash",
    "promptUsed": "${userPrompt.replace(/"/g, "'")}",
    "brandWorkspaceId": "${brand.id}",
    "version": 1
  },
  "isLocked": false
}

Also return a "suggestions" object with:
- captionTiming: brief note on caption pacing decisions
- transitionRationale: why you chose these transitions
- brandNotes: how the lineup aligns with brand identity
- improvements: array of 2-3 optional enhancement suggestions

Wrap everything in: { "timeline": {...}, "suggestions": {...} }`;
}

export async function generateLineup(
  userPrompt: string,
  brand: BrandWorkspace,
  aspectRatio?: string,
  targetDuration?: number,
  overrides?: BrandOverrides
): Promise<LineupResponse> {
  const contextPrompt = buildPromptContext(userPrompt, brand, aspectRatio, targetDuration, overrides);

  const data = await geminiRequest(GEMINI_MODEL, {
    system_instruction: { parts: [{ text: LINEUP_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      topP: 0.85,
    },
  });

  const rawText =
    (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) throw new Error("Gemini returned an empty response.");

  let parsed: unknown;
  try {
    const clean = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${rawText.slice(0, 300)}`);
  }

  return validateAndSanitizeLineup(parsed, brand, aspectRatio);
}

export async function qaReviewLineup(
  lineup: Timeline,
  brand: BrandWorkspace
): Promise<{ score: number; notes: string; issues: string[] }> {
  const prompt = `You are a QA reviewer for a video ad production system. Review this lineup JSON and check:
1. Does it match brand "${brand.name}" style keywords: ${brand.styleKeywords.join(", ")}?
2. Are prohibited elements avoided: ${brand.prohibitedElements.join(", ")}?
3. Are scene durations summing to ~${lineup.totalDuration}s?
4. Are captions under ${brand.captionStyle.maxCharsPerLine} chars per line?
5. Are transitions appropriate for brand tone?

Lineup: ${JSON.stringify(lineup)}

Return JSON only: { "score": <0-100>, "notes": "<overall assessment>", "issues": ["<issue1>"] }`;

  const data = await geminiRequest(GEMINI_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const rawText =
    (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const clean = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(clean);
}

const CLIP_SYSTEM_PROMPT = `You are an expert AI video editor. You will be given uploaded video clips to analyze and edit into a professional video ad.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown code fences, no extra text. Raw JSON only.
2. Response MUST be a single JSON object with exactly three top-level keys: "timeline", "clipAssignments", "suggestions".
3. EVERY scene in the timeline MUST have a corresponding entry in the "clipAssignments" array.
4. "clipIndex" in clipAssignments refers to the 0-based index matching the CLIP INVENTORY shown.
5. "trimStart" and "trimEnd" must be valid timestamps (seconds) within the actual clip duration shown.
6. scene.duration MUST equal (trimEnd - trimStart).
7. If a clip has multiple strong moments, you may use the same clip for multiple scenes with different trim ranges.
8. Write captions based on what you actually SEE happening in the video — not generic descriptions.
9. Respect all brand settings provided — never override locked brand colors, fonts, or logo rules.
10. Scene IDs and caption IDs must be unique UUID strings.
11. ALWAYS wrap as: { "timeline": {...}, "clipAssignments": [{sceneId, clipIndex, trimStart, trimEnd}], "suggestions": {...} }`;

function buildClipContextPrompt(
  userPrompt: string,
  clips: GeminiClip[],
  brand: BrandWorkspace,
  aspectRatio?: string,
  targetDuration?: number,
  overrides?: BrandOverrides
): string {
  const ratio = aspectRatio ?? brand.defaultAspectRatio;
  const clipList = clips
    .map((c) => `  - Clip ${c.index}: "${c.name}"${c.duration ? ` (${c.duration}s)` : ""}`)
    .join("\n");

  const durLine = targetDuration
    ? `REQUIRED TOTAL DURATION: ${targetDuration} seconds exactly. All scene durations MUST sum to exactly ${targetDuration}s. trimEnd - trimStart per scene must match scene.duration.`
    : "";

  const overrideLines = overrides
    ? [
        overrides.primaryColor && `- Primary color: ${overrides.primaryColor}`,
        overrides.fontFamily   && `- Font family: ${overrides.fontFamily}`,
        overrides.logoPosition && `- Logo position: ${overrides.logoPosition}`,
        overrides.colorGrade   && `- Color grade: ${overrides.colorGrade} (set globalColorGrade to this)`,
      ].filter(Boolean).join("\n")
    : "";
  const overrideSection = overrideLines
    ? `\nBRAND OVERRIDES (apply instead of defaults):\n${overrideLines}\n`
    : "";

  const colorGradeName = overrides?.colorGrade ?? brand.colorGrade.name;
  const logoPos        = overrides?.logoPosition ?? brand.logo.defaultPosition;

  return `${durLine}
CLIP INVENTORY:
${clipList}

BRAND CONTEXT:
Brand: ${brand.name}
Style keywords: ${brand.styleKeywords.join(", ")}
Prohibited elements: ${brand.prohibitedElements.join(", ")}
Selected aspect ratio: ${ratio}
Caption style: ${brand.captionStyle.position} alignment, max ${brand.captionStyle.maxCharsPerLine} chars per line, ${brand.captionStyle.animationIn} animation
Color grade: ${colorGradeName} (warmth: ${brand.colorGrade.warmth}, contrast: ${brand.colorGrade.contrast})
Logo position: ${logoPos}${overrideSection}

USER BRIEF:
${userPrompt}

Carefully watch each video clip. Then generate a complete edit plan:
{
  "timeline": {
    "id": "<uuid>",
    "title": "<descriptive title>",
    "brandWorkspaceId": "${brand.id}",
    "createdAt": "<ISO datetime>",
    "updatedAt": "<ISO datetime>",
    "totalDuration": <number>,
    "aspectRatio": "${ratio}",
    "targetPlatform": "<instagram|tiktok|youtube|reels|facebook|generic>",
    "scenes": [
      {
        "id": "<uuid>",
        "order": <0-based index>,
        "label": "<short scene name reflecting clip content>",
        "description": "<what actually happens in this segment>",
        "duration": <trimEnd - trimStart>,
        "clipTrimStart": <start seconds in the clip>,
        "clipTrimEnd": <end seconds in the clip>,
        "transition": { "type": "<cut|fade|dissolve|wipe-left|wipe-right|zoom-in|zoom-out|slide-left|slide-right|cinematic-fade>", "duration": <0.3-1.5> },
        "captions": [
          {
            "id": "<uuid>",
            "text": "<caption reflecting what you see>",
            "startTime": <seconds from scene start>,
            "endTime": <seconds from scene start>,
            "style": "<brand-default|highlight|subtle|bold>"
          }
        ],
        "overlays": [],
        "motionStyle": "<static|slow-pan|fast-cut|ken-burns|zoom-pulse>",
        "mood": "<luxury|energetic|calm|dramatic|playful>"
      }
    ],
    "audioLayers": [{ "id": "<uuid>", "type": "bgm", "startTime": 0, "endTime": <totalDuration>, "volume": 0.6, "fadeIn": 1.0, "fadeOut": 2.0 }],
    "globalColorGrade": "${brand.colorGrade.name}",
    "meta": { "generatedBy": "gemini-2.5-pro", "promptUsed": "${userPrompt.replace(/"/g, "'")}", "brandWorkspaceId": "${brand.id}", "version": 1 },
    "isLocked": false
  },
  "clipAssignments": [
    { "sceneId": "<same uuid as scene>", "clipIndex": <0-based clip number>, "trimStart": <seconds>, "trimEnd": <seconds> }
  ],
  "suggestions": {
    "captionTiming": "<note on caption pacing>",
    "transitionRationale": "<why these transitions>",
    "brandNotes": "<how this aligns with brand>",
    "improvements": ["<optional improvement 1>", "<optional improvement 2>"]
  }
}`;
}

export async function generateLineupFromClips(
  userPrompt: string,
  clips: GeminiClip[],
  brand: BrandWorkspace,
  aspectRatio?: string,
  targetDuration?: number,
  overrides?: BrandOverrides
): Promise<LineupResponse & { clipAssignments: ClipAssignment[] }> {
  // Build multimodal parts: interleave label + inlineData for each clip
  const parts: Record<string, unknown>[] = [];

  for (const clip of clips) {
    parts.push({ text: `Clip ${clip.index}: "${clip.name}"${clip.duration ? ` (${clip.duration}s total)` : ""}` });
    if (clip.frames?.length) {
      for (const frame of clip.frames) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: frame } });
      }
    } else if (clip.data) {
      parts.push({ inlineData: { mimeType: clip.mimeType, data: clip.data } });
    }
  }

  // Add the full context + schema prompt
  parts.push({ text: buildClipContextPrompt(userPrompt, clips, brand, aspectRatio, targetDuration, overrides) });

  const data = await geminiRequest(GEMINI_PRO_MODEL, {
    system_instruction: { parts: [{ text: CLIP_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      topP: 0.85,
    },
  });

  const rawText =
    (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) throw new Error("Gemini returned an empty response.");

  let parsed: unknown;
  try {
    const clean = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${rawText.slice(0, 300)}`);
  }

  // Extract clipAssignments before the timeline validator strips unknown keys
  const raw = parsed as Record<string, unknown>;
  const clipAssignments: ClipAssignment[] = Array.isArray(raw.clipAssignments)
    ? (raw.clipAssignments as ClipAssignment[])
    : [];

  const lineupResponse = validateAndSanitizeLineup(parsed, brand, aspectRatio);

  // Write clipTrimStart/clipTrimEnd from assignments back onto scenes (Zod strips unknown keys)
  if (clipAssignments.length && lineupResponse.timeline.scenes?.length) {
    lineupResponse.timeline.scenes = lineupResponse.timeline.scenes.map((scene) => {
      const assignment = clipAssignments.find((a) => a.sceneId === scene.id);
      if (!assignment) return scene;
      return {
        ...scene,
        clipTrimStart: assignment.trimStart ?? scene.clipTrimStart,
        clipTrimEnd: assignment.trimEnd ?? scene.clipTrimEnd,
      };
    });
  }

  return { ...lineupResponse, clipAssignments };
}

function looksLikeScene(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const scene = value as Record<string, unknown>;
  return (
    typeof scene.duration === "number" ||
    typeof scene.label === "string" ||
    Array.isArray(scene.captions)
  );
}

function looksLikeTimeline(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const timeline = value as Record<string, unknown>;
  return Array.isArray(timeline.scenes) || typeof timeline.totalDuration === "number";
}

function buildTimelineFromScenes(
  scenes: unknown[],
  brand: BrandWorkspace,
  aspectRatio?: string
): Record<string, unknown> {
  const totalDuration = scenes.reduce((sum: number, scene) => {
    if (typeof scene !== "object" || scene === null) return sum;
    const duration = (scene as Record<string, unknown>).duration;
    return sum + (typeof duration === "number" ? duration : 0);
  }, 0 as number);

  return {
    id: uuidv4(),
    title: "Generated Lineup",
    brandWorkspaceId: brand.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDuration: totalDuration > 0 ? totalDuration : 20,
    aspectRatio: aspectRatio ?? brand.defaultAspectRatio,
    targetPlatform: "instagram",
    scenes,
    audioLayers: [],
    globalColorGrade: brand.colorGrade.name,
    meta: {
      generatedBy: GEMINI_MODEL,
      brandWorkspaceId: brand.id,
      version: 1,
    },
    isLocked: false,
  };
}

/** Normalize Gemini's inconsistent JSON shapes into { timeline, suggestions }. */
function unwrapGeminiPayload(
  raw: unknown,
  brand: BrandWorkspace,
  aspectRatio?: string
): { timeline: Record<string, unknown>; suggestions?: LineupResponse["suggestions"] } {
  if (Array.isArray(raw)) {
    if (raw.length === 1) return unwrapGeminiPayload(raw[0], brand, aspectRatio);

    if (raw.every(looksLikeScene)) {
      return { timeline: buildTimelineFromScenes(raw, brand, aspectRatio) };
    }

    const wrapped = raw.find(
      (item) => typeof item === "object" && item !== null && "timeline" in item
    );
    if (wrapped) return unwrapGeminiPayload(wrapped, brand, aspectRatio);

    const timelineLike = raw.find(looksLikeTimeline) as Record<string, unknown> | undefined;
    if (timelineLike) return { timeline: timelineLike };

    throw new Error(
      `Gemini returned an array we could not parse (${raw.length} items).`
    );
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid lineup response structure");
  }

  const data = raw as Record<string, unknown>;

  if (data.timeline && typeof data.timeline === "object") {
    return {
      timeline: data.timeline as Record<string, unknown>,
      suggestions: data.suggestions as LineupResponse["suggestions"] ?? undefined,
    };
  }

  if (looksLikeTimeline(data)) {
    return { timeline: data };
  }

  const dataAny = data as Record<string, unknown>;
  const dataScenesArr = Array.isArray(dataAny.scenes) ? (dataAny.scenes as unknown[]) : null;
  if (dataScenesArr && dataScenesArr.every(looksLikeScene)) {
    return { timeline: buildTimelineFromScenes(dataScenesArr, brand, aspectRatio) };
  }

  throw new Error(
    `Missing timeline in response. Keys received: ${Object.keys(data).join(", ")}`
  );
}

export function validateAndSanitizeLineup(
  raw: unknown,
  brand: BrandWorkspace,
  aspectRatio?: string
): LineupResponse {
  const { timeline: timelineData, suggestions: suggestionsData } = unwrapGeminiPayload(
    raw,
    brand,
    aspectRatio
  );

  const timeline = timelineData;

  if (!timeline.id) timeline.id = uuidv4();
  if (!timeline.createdAt) timeline.createdAt = new Date().toISOString();
  if (!timeline.updatedAt) timeline.updatedAt = new Date().toISOString();
  if (!Array.isArray(timeline.audioLayers)) timeline.audioLayers = [];
  if (!Array.isArray(timeline.scenes)) timeline.scenes = [];
  if (timeline.isLocked === undefined) timeline.isLocked = false;

  if (Array.isArray(timeline.scenes)) {
    timeline.scenes = timeline.scenes.map((scene: unknown, idx: number) => {
      const s = scene as Record<string, unknown>;
      if (!s.id) s.id = uuidv4();
      if (!s.captions) s.captions = [];
      if (!s.overlays) s.overlays = [];
      if (s.order === undefined) s.order = idx;

      // Clamp trim values: clipTrimStart >= 0, clipTrimEnd <= duration, no looping
      const dur = typeof s.duration === "number" ? s.duration : undefined;
      if (typeof s.clipTrimStart === "number" && s.clipTrimStart < 0) s.clipTrimStart = 0;
      const trimStart = typeof s.clipTrimStart === "number" ? s.clipTrimStart : 0;
      if (dur !== undefined) {
        if (typeof s.clipTrimEnd === "number" && s.clipTrimEnd > trimStart + dur) {
          s.clipTrimEnd = trimStart + dur;
        }
      }
      if (typeof s.clipTrimEnd === "number" && s.clipTrimEnd <= trimStart) {
        s.clipTrimEnd = trimStart + (dur ?? 5);
      }

      if (Array.isArray(s.captions)) {
        s.captions = (s.captions as unknown[]).map((cap: unknown) => {
          const c = cap as Record<string, unknown>;
          if (!c.id) c.id = uuidv4();
          if (typeof c.text === "string")
            c.text = c.text.slice(0, brand.captionStyle.maxCharsPerLine * brand.captionStyle.maxLines);
          return c;
        });
      }
      return s;
    });
  }

  return {
    timeline: timeline as unknown as Timeline,
    suggestions: suggestionsData,
  };
}
