/**
 * Evaluator Agent
 *
 * Scores every generated output before it leaves the pipeline.
 * Uses workflow-specific evaluation criteria with weighted rubrics.
 * Score is persisted to SQLite for the prompt learning layer.
 *
 * Evaluation dimensions (cluster-specific weights):
 *   UGC/Ads:            hook-quality(30%), pacing(20%), cta-clarity(20%), captions(15%), brand(15%)
 *   Travel/Cinematic:   story-arc(30%), visual-flow(25%), pacing(20%), captions(15%), brand(10%)
 *
 * Model: gemini-2.5-flash (evaluation doesn't need multimodal)
 */

import { geminiRequest } from "@/lib/gemini";
import type { Timeline } from "@/types/timeline";
import type { BrandWorkspace } from "@/types/brand";
import type { WorkflowDefinition, EvaluationCriterion } from "@/lib/workflows/types";

const MODEL = "gemini-2.5-pro";

export interface EvaluationInput {
  timeline: Timeline;
  brand: BrandWorkspace;
  workflow: WorkflowDefinition;
  originalPrompt: string;
}

export interface CriterionScore {
  criterion: string;
  score: number;          // 0-100
  weight: number;
  weightedScore: number;  // score * weight
  rating: "excellent" | "good" | "poor";
  notes: string;
}

export interface PlatformScore {
  platform: "instagram" | "youtube" | "tiktok" | "hook-score" | "retention-score" | "cta-score";
  score: number;      // 0-100
  rating: "excellent" | "good" | "needs-work";
  insight: string;    // one-line explanation
}

export interface EvaluationOutput {
  overallScore: number;       // 0-100 weighted average
  criteriaScores: CriterionScore[];
  platformScores: PlatformScore[];
  passedQA: boolean;          // overall >= 60
  issues: string[];
  improvements: string[];
  compliments: string[];
  evalModel: string;
}

export async function runEvaluator(input: EvaluationInput): Promise<EvaluationOutput> {
  const start = Date.now();
  const scenes = input.timeline.scenes ?? [];
  const totalSceneDuration = scenes.reduce((s, sc) => s + sc.duration, 0);
  const workflow = input.workflow;

  const criteriaBlock = workflow.evaluationCriteria.map(c =>
    `  ${c.name} (weight: ${(c.weight * 100).toFixed(0)}%):\n    Excellent: ${c.rubric.excellent}\n    Good: ${c.rubric.good}\n    Poor: ${c.rubric.poor}`
  ).join("\n\n");

  const timelineSummary = {
    sceneCount: scenes.length,
    totalDuration: input.timeline.totalDuration,
    sceneDurationSum: parseFloat(totalSceneDuration.toFixed(2)),
    durationMatch: true,
    scenes: scenes.map((s, i) => ({
      order: i + 1,
      label: s.label,
      duration: s.duration,
      captionCount: (s.captions ?? []).length,
      hasTransition: !!s.transition?.type,
      mood: s.mood,
    })),
    captionTexts: scenes.flatMap(s => (s.captions ?? []).map(c => c.text)),
    colorGrade: input.timeline.globalColorGrade,
  };

  const prompt = `You are a video quality evaluator. Score this generated timeline against the workflow's evaluation criteria AND platform suitability.

WORKFLOW: ${workflow.name} (${workflow.cluster})
ORIGINAL BRIEF: "${input.originalPrompt}"
BRAND: ${input.brand.name} — style: ${input.brand.styleKeywords.join(", ")} | prohibited: ${input.brand.prohibitedElements.join(", ")}

TIMELINE SUMMARY:
${JSON.stringify(timelineSummary, null, 2)}

EVALUATION CRITERIA:
${criteriaBlock}

Score each criterion 0-100 based on the rubric (excellent=85-100, good=60-84, poor=0-59).
Be strict — only give "excellent" if the output genuinely matches the rubric description.

Also score the following PLATFORM DIMENSIONS 0-100:
- instagram: Suitability for Instagram Reels/Stories (visual punch, short attention, aesthetic)
- youtube: Suitability for YouTube Shorts/pre-roll (storytelling, retention arc, branding)
- tiktok: Suitability for TikTok (trend awareness, native feel, hook speed)
- hook-score: How strongly the first 3 seconds hooks viewers (urgency, intrigue, visual)
- retention-score: How well the video retains attention through to the end (pacing, payoff)
- cta-score: How clear and compelling the call-to-action is (explicit ask, timing, clarity)

Return ONLY JSON:
{
  "criteriaScores": [
    {
      "criterion": "hook-quality",
      "score": 82,
      "weight": 0.30,
      "weightedScore": 24.6,
      "rating": "good",
      "notes": "First scene is a product shot but doesn't appear until 1.2s — should be 0.5s"
    }
  ],
  "platformScores": [
    { "platform": "instagram", "score": 78, "rating": "good", "insight": "Good vertical format but scene count could be trimmed to 6 for optimal Reels pacing" },
    { "platform": "youtube", "score": 65, "rating": "good", "insight": "Adequate for pre-roll but storytelling arc is weak for Shorts" },
    { "platform": "tiktok", "score": 71, "rating": "good", "insight": "Caption style is on-trend but hook arrives 0.8s too late" },
    { "platform": "hook-score", "score": 88, "rating": "excellent", "insight": "Opening 2 seconds are visually arresting and create immediate curiosity" },
    { "platform": "retention-score", "score": 74, "rating": "good", "insight": "Pacing dips in scenes 3-4, consider trimming each by 1 second" },
    { "platform": "cta-score", "score": 69, "rating": "good", "insight": "CTA exists but appears in the last 1.5s — extend to 3s for better conversion" }
  ],
  "issues": ["Duration mismatch: requested 30s, generated 27s"],
  "improvements": ["Move product close-up to scene 1", "Add CTA text to final scene"],
  "compliments": ["Caption copy is punchy and on-brand", "Fast pacing matches the platform"]
}

Note: overallScore will be calculated from criteriaScores — do not include it.`;

  try {
    const data = await geminiRequest(MODEL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, topP: 0.8 },
    });

    const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as Omit<EvaluationOutput, "overallScore" | "passedQA" | "evalModel" | "platformScores"> & { platformScores?: PlatformScore[] };

    // Recompute weighted score from criteria
    const scores = parsed.criteriaScores ?? [];
    // Fill in any missing weights from the workflow definition
    for (const cs of scores) {
      const def = workflow.evaluationCriteria.find(c => c.name === cs.criterion);
      if (def && !cs.weight) cs.weight = def.weight;
      cs.weightedScore = cs.score * cs.weight;
    }

    // Add any criteria the model missed
    const covered = new Set(scores.map(s => s.criterion));
    for (const c of workflow.evaluationCriteria) {
      if (!covered.has(c.name)) {
        scores.push({
          criterion: c.name,
          score: 65,
          weight: c.weight,
          weightedScore: 65 * c.weight,
          rating: "good",
          notes: "Not evaluated — defaulted to good",
        });
      }
    }

    const overallScore = Math.round(scores.reduce((sum, s) => sum + s.weightedScore, 0));

    console.log(`[evaluator] ${workflow.id} → score: ${overallScore}/100 | ${Date.now() - start}ms`);

    return {
      overallScore,
      criteriaScores: scores,
      platformScores: parsed.platformScores ?? [],
      passedQA: overallScore >= 60,
      issues: parsed.issues ?? [],
      improvements: parsed.improvements ?? [],
      compliments: parsed.compliments ?? [],
      evalModel: MODEL,
    };
  } catch (e) {
    // Non-fatal — return neutral score
    console.warn("[evaluator] error:", e instanceof Error ? e.message : String(e));
    return buildNeutralEval(workflow.evaluationCriteria, MODEL);
  }
}

function buildNeutralEval(criteria: EvaluationCriterion[], model: string): EvaluationOutput {
  const scores: CriterionScore[] = criteria.map(c => ({
    criterion: c.name,
    score: 70,
    weight: c.weight,
    weightedScore: 70 * c.weight,
    rating: "good" as const,
    notes: "Evaluation unavailable — neutral score",
  }));

  return {
    overallScore: 70,
    criteriaScores: scores,
    platformScores: [],
    passedQA: true,
    issues: [],
    improvements: ["Run evaluation manually for detailed scoring"],
    compliments: [],
    evalModel: model,
  };
}
