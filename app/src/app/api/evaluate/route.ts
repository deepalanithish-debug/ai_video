/**
 * Standalone evaluation endpoint.
 *
 * Allows evaluating any timeline against any workflow's criteria —
 * useful for re-scoring past generations or comparing alternatives.
 *
 * POST /api/evaluate
 * Body: { timeline, workflowId, workspaceSlug, originalPrompt, targetDuration? }
 */

import { NextRequest, NextResponse } from "next/server";
import { runEvaluator } from "@/lib/agents/evaluator";
import { getWorkflow, getDefaultWorkflow } from "@/lib/workflows/registry";
import { getWorkspace } from "@/lib/workspaces/asaya";
import { saveEvaluationResult } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { Timeline } from "@/types/timeline";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timeline, workflowId, workspaceSlug, originalPrompt } = body as {
      timeline: Timeline;
      workflowId?: string;
      workspaceSlug: string;
      originalPrompt: string;
      targetDuration?: number;
    };

    if (!timeline?.scenes?.length) {
      return NextResponse.json({ error: "timeline with scenes is required." }, { status: 400 });
    }
    if (!workspaceSlug || !originalPrompt) {
      return NextResponse.json({ error: "workspaceSlug and originalPrompt are required." }, { status: 400 });
    }

    const workspace = getWorkspace(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: `No workspace found: ${workspaceSlug}` }, { status: 404 });
    }

    const workflow = workflowId ? (getWorkflow(workflowId) ?? getDefaultWorkflow("ugc-ads")) : getDefaultWorkflow("ugc-ads");

    const result = await runEvaluator({ timeline, brand: workspace, workflow, originalPrompt });

    await saveEvaluationResult({
      runId: uuidv4(),
      workspaceSlug,
      workflowId: workflow.id,
      overallScore: result.overallScore,
      passedQA: result.passedQA,
      criteria: result.criteriaScores,
      issues: result.issues,
      improvements: result.improvements,
      evalModel: result.evalModel,
    });

    return NextResponse.json({
      success: true,
      evaluation: result,
      workflowId: workflow.id,
      workflowName: workflow.name,
      cluster: workflow.cluster,
    });

  } catch (error) {
    console.error("[evaluate]", error);
    return NextResponse.json(
      { error: "Evaluation failed.", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
