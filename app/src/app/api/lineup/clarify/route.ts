/**
 * Clarifying questions endpoint.
 *
 * Implements the "project manager" prompt strategy:
 *   - Ask for missing context instead of guessing
 *   - Only return questions when the brief is genuinely incomplete
 *   - Returns 0–3 targeted questions, never a questionnaire
 */
import { NextRequest, NextResponse } from "next/server";
import { geminiRequest } from "@/lib/gemini";
import { MODELS } from "@/lib/agent-pipeline";
import { getWorkspace } from "@/lib/workspaces/asaya";

export const maxDuration = 30;

export interface ClarifyQuestion {
  id: string;
  question: string;
  why: string;           // short reason shown to user: "helps Gemini pick the right tone"
  type: "text" | "choice" | "multichoice";
  choices?: string[];
  placeholder?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, hasClips = false, workspaceSlug } = await req.json() as {
      prompt: string;
      hasClips?: boolean;
      workspaceSlug: string;
    };

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json({ questions: [] });
    }

    const workspace = getWorkspace(workspaceSlug);
    const brandName = workspace?.name ?? "the brand";

    const systemPrompt = `You are a pre-production assistant. Your job is to identify the 0–3 most important missing pieces of information from a video brief.

RULES:
1. If the brief is detailed enough to generate a good video, return questions = [].
2. Only ask about things that genuinely change the output — tone, audience, CTA, platform.
3. Never ask more than 3 questions.
4. Never ask what the user has already told you.
5. Return ONLY valid JSON. No markdown.`;

    const userPrompt = `Brand: ${brandName}
Has uploaded clips: ${hasClips}
Brief: "${prompt.trim()}"

Identify what's missing. Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "<specific question>",
      "why": "<one short phrase: why this matters for the video>",
      "type": "text" | "choice" | "multichoice",
      "choices": ["<option>"],   // only for choice/multichoice
      "placeholder": "<example answer>"  // only for text
    }
  ]
}

Common gaps to check for (only ask if actually missing):
- Target audience (if not clear)
- Core message or CTA (if not mentioned)
- Platform (if not mentioned and matters)
- Tone (if contradicts brand defaults and brief is vague)
- Reference style or "feel like" (if brief is very short)`;

    const data = await geminiRequest("gemini-2.5-flash", {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(clean) as { questions: ClarifyQuestion[] };

    return NextResponse.json({
      questions: (parsed.questions ?? []).slice(0, 3),
    });
  } catch (e) {
    console.error("[clarify]", e);
    // Never block generation — if clarify fails, return empty
    return NextResponse.json({ questions: [] });
  }
}
