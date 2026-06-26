/**
 * Planner Agent
 *
 * The brain of the pipeline. Given a user brief, it:
 *   1. Classifies the content type → selects a workflow cluster
 *   2. Detects whether footage is available → editorial vs concept mode
 *   3. Selects the appropriate workflow from the registry
 *   4. Outputs a tool execution plan (ordered list of tools to run)
 *   5. Identifies missing information (clarifying questions)
 *
 * NO hardcoded if/else routing. The model reasons about which tools to use.
 * Adding a new workflow = register it; the planner will discover and use it.
 *
 * Model: gemini-2.5-flash (fast intent parsing, doesn't need Pro)
 */

import { geminiRequest } from "@/lib/gemini";
import { listWorkflows, getDefaultWorkflow } from "@/lib/workflows/registry";
import type { ExecutionPlan, WorkflowCluster, EditMode } from "@/lib/tools/types";
import type { ToolName } from "@/lib/tools";

const MODEL = "gemini-2.5-pro";

export interface PlannerInput {
  prompt: string;
  hasClips: boolean;
  clipCount: number;
  workspaceSlug: string;
  brandName: string;
  brandKeywords: string[];
}

export interface PlannerOutput extends ExecutionPlan {
  workflowName: string;
  confidence: number;
  planningNotes: string;
}

export async function runPlanner(input: PlannerInput): Promise<PlannerOutput> {
  const start = Date.now();
  const workflows = listWorkflows();
  const workflowList = workflows.map(w => `  - id: "${w.id}" | cluster: "${w.cluster}" | description: "${w.description}"`).join("\n");

  const prompt = `You are a video production planner. Your job:
1. Understand the user's brief
2. Select the right workflow from the registry
3. Build an ordered tool execution plan
4. Identify any missing information

REGISTERED WORKFLOWS:
${workflowList}

TOOL REGISTRY:
  - "video-analysis"    → analyze uploaded video clips (only if hasClips=true)
  - "hook-detection"    → find best opening segment
  - "timeline-generator" → generate the full edit plan (ALWAYS required)
  - "transition-planner" → improve transition choices
  - "caption-generator" → refine captions
  - "music-selector"    → recommend music spec

CONTEXT:
Brand: ${input.brandName} (${input.brandKeywords.slice(0, 4).join(", ")})
Has clips: ${input.hasClips} (${input.clipCount} clip${input.clipCount !== 1 ? "s" : ""})
Brief: "${input.prompt}"

RULES:
1. If hasClips=true, mode MUST be "editorial". Always include "video-analysis" as first tool.
2. If hasClips=false, mode MUST be "concept". Skip "video-analysis".
3. "timeline-generator" is ALWAYS in the plan.
4. For ugc-ads: always include "hook-detection" (hooks matter most for ads).
5. For travel-cinematic: include "hook-detection" only if footage is present.
6. Always include "caption-generator" for final polish.
7. Include "music-selector" if duration > 20s.
8. isComplete=false if brief is <15 words OR missing platform/tone/duration context.

Return ONLY valid JSON:
{
  "cluster": "ugc-ads",
  "mode": "concept",
  "workflowId": "ugc-ads-standard",
  "workflowName": "UGC / Ads Standard",
  "intent": "one sentence: what this video should achieve",
  "tone": "luxury",
  "platform": "instagram",
  "tools": [
    { "toolName": "hook-detection", "reason": "UGC ads always need a strong hook brief" },
    { "toolName": "timeline-generator", "reason": "Core: generate concept edit plan" },
    { "toolName": "caption-generator", "reason": "Polish punchy captions for the ad" },
    { "toolName": "music-selector", "reason": "30s video needs music spec" }
  ],
  "clarifyingQuestions": [],
  "isComplete": true,
  "confidence": 0.91,
  "planningNotes": "Short brief but platform and duration are clear. UGC/Ads cluster. Concept mode."
}

clarifyingQuestions: list any genuinely missing information (empty array if brief is clear enough).
Cluster must be exactly "ugc-ads" or "travel-cinematic".
Mode must be exactly "editorial" or "concept".
tools[].toolName must be valid tool names from the registry above.`;

  try {
    const data = await geminiRequest(MODEL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 1.0, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 2000 } },
    });

    const raw = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()) as PlannerOutput;

    // Ensure tools is always a valid array regardless of model output
    if (!Array.isArray(parsed.tools) || parsed.tools.length === 0) {
      parsed.tools = buildDefaultTools(input.hasClips, parsed.cluster ?? "ugc-ads");
    }

    // Safety: if hasClips but mode was set to concept, correct it
    if (input.hasClips && parsed.mode !== "editorial") {
      parsed.mode = "editorial";
      if (!parsed.tools.find(t => t.toolName === "video-analysis")) {
        parsed.tools.unshift({ toolName: "video-analysis" as ToolName, reason: "Clips detected — analyze before editing" });
      }
    }

    // Ensure timeline-generator is always present
    if (!parsed.tools.find(t => t.toolName === "timeline-generator")) {
      parsed.tools.push({ toolName: "timeline-generator" as ToolName, reason: "Core generation step" });
    }

    console.log(`[planner] ${parsed.cluster}/${parsed.mode} → ${parsed.workflowId} | tools: [${parsed.tools.map(t => t.toolName).join(", ")}] | ${Date.now() - start}ms`);

    return parsed;
  } catch (e) {
    // Fallback: use safe defaults — detect cinematic/travel from brief keywords
    const cinematicKeywords = /\b(travel|cinematic|landscape|scenic|journey|documentary|film|narrative|story|storytelling|lifestyle|vlog|nature|mountain|beach|explore|adventure|wanderlust|slow|breathe|atmosphere)\b/i;
    const cluster: WorkflowCluster = cinematicKeywords.test(input.prompt) ? "travel-cinematic" : "ugc-ads";
    const mode: EditMode = input.hasClips ? "editorial" : "concept";
    const defaultWorkflow = getDefaultWorkflow(cluster);
    console.warn("[planner] fallback plan due to error:", e instanceof Error ? e.message : String(e));

    const tools: Array<{ toolName: ToolName; reason: string }> = [];
    if (input.hasClips) tools.push({ toolName: "video-analysis", reason: "Analyze uploaded clips" });
    tools.push({ toolName: "hook-detection", reason: "Find best hook" });
    tools.push({ toolName: "timeline-generator", reason: "Generate edit plan" });
    tools.push({ toolName: "caption-generator", reason: "Polish captions" });

    return {
      cluster,
      mode,
      workflowId: defaultWorkflow.id,
      workflowName: defaultWorkflow.name,
      intent: input.prompt.slice(0, 100),
      tone: "luxury",
      platform: "instagram",
      tools,
      clarifyingQuestions: [],
      isComplete: input.prompt.length > 20,
      confidence: 0.5,
      planningNotes: "Fallback plan used due to planner error",
    };
  }
}

function buildDefaultTools(hasClips: boolean, cluster: string): Array<{ toolName: ToolName; reason: string }> {
  const tools: Array<{ toolName: ToolName; reason: string }> = [];
  if (hasClips) tools.push({ toolName: "video-analysis", reason: "Analyze uploaded clips" });
  if (cluster === "ugc-ads" || hasClips) tools.push({ toolName: "hook-detection", reason: "Find best hook" });
  tools.push({ toolName: "timeline-generator", reason: "Generate edit plan" });
  tools.push({ toolName: "transition-planner", reason: "Refine transitions" });
  tools.push({ toolName: "caption-generator", reason: "Polish captions" });
  return tools;
}
