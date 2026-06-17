/**
 * Persistent MongoDB memory layer.
 *
 * Collections (all in the "vydeo" database):
 *   generations         — every successful generation (learning corpus)
 *   workflowRuns        — every pipeline run with workflow/tool trace
 *   toolExecutions      — per-tool timing and results within a run
 *   evaluationResults   — evaluation scores per run
 *   promptRefinements   — original → refined prompt pairs with outcomes
 *   workspacePreferences — workspace-level aggregate stats
 *
 * Purpose: The system should never start from zero.
 *          Past successful generations augment future prompts.
 *          Evaluation scores guide which patterns to repeat.
 */

import { getDb } from "./mongodb";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoredGeneration {
  id: string;
  workspace_slug: string;
  run_id: string | null;
  prompt_text: string;
  cluster: string;
  workflow_id: string | null;
  timeline_json: string;
  qa_score: number | null;
  eval_score: number | null;
  created_at: string;
}

export interface StoredWorkflowRun {
  run_id: string;
  workspace_slug: string;
  workflow_id: string;
  cluster: string;
  mode: string;
  prompt_text: string;
  tools_executed: string;
  total_ms: number | null;
  eval_score: number | null;
  passed_qa: number;
  created_at: string;
}

// ── Write operations ──────────────────────────────────────────────────────────

export async function saveGeneration(params: {
  workspaceSlug: string;
  runId?: string;
  prompt: string;
  cluster: string;
  workflowId?: string;
  aspectRatio?: string;
  durationSec?: number;
  timeline: unknown;
  trace?: unknown;
  qaScore?: number;
  evalScore?: number;
}): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("generations").insertOne({
      workspace_slug: params.workspaceSlug,
      run_id: params.runId ?? null,
      prompt_hash: simpleHash(params.prompt),
      prompt_text: params.prompt.slice(0, 600),
      cluster: params.cluster,
      workflow_id: params.workflowId ?? null,
      aspect_ratio: params.aspectRatio ?? null,
      duration_sec: params.durationSec ?? null,
      timeline_json: JSON.stringify(params.timeline),
      trace_json: params.trace ? JSON.stringify(params.trace) : null,
      qa_score: params.qaScore ?? null,
      eval_score: params.evalScore ?? null,
      created_at: now,
    });

    await db.collection("workspacePreferences").updateOne(
      { workspace_slug: params.workspaceSlug },
      {
        $inc: { total_generations: 1 },
        $set: { updated_at: now },
        $setOnInsert: { workspace_slug: params.workspaceSlug, total_runs: 0, preferred_cluster: null, avg_eval_score: null },
      },
      { upsert: true },
    );
  } catch (e) {
    console.warn("[db] saveGeneration:", (e as Error).message);
  }
}

export async function saveWorkflowRun(params: {
  runId: string;
  workspaceSlug: string;
  workflowId: string;
  cluster: string;
  mode: string;
  prompt: string;
  toolsExecuted: string[];
  totalMs?: number;
  evalScore?: number;
  passedQA?: boolean;
}): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection("workflowRuns").replaceOne(
      { run_id: params.runId },
      {
        run_id: params.runId,
        workspace_slug: params.workspaceSlug,
        workflow_id: params.workflowId,
        cluster: params.cluster,
        mode: params.mode,
        prompt_text: params.prompt.slice(0, 600),
        tools_executed: JSON.stringify(params.toolsExecuted),
        total_ms: params.totalMs ?? null,
        eval_score: params.evalScore ?? null,
        passed_qa: params.passedQA ? 1 : 0,
        created_at: now,
      },
      { upsert: true },
    );

    await db.collection("workspacePreferences").updateOne(
      { workspace_slug: params.workspaceSlug },
      {
        $inc: { total_runs: 1 },
        $set: { updated_at: now },
        $setOnInsert: { workspace_slug: params.workspaceSlug, total_generations: 0, preferred_cluster: null, avg_eval_score: null },
      },
      { upsert: true },
    );
  } catch (e) {
    console.warn("[db] saveWorkflowRun:", (e as Error).message);
  }
}

export async function saveToolExecution(params: {
  runId: string;
  toolName: string;
  modelUsed?: string;
  durationMs?: number;
  success: boolean;
  errorMsg?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("toolExecutions").insertOne({
      run_id: params.runId,
      tool_name: params.toolName,
      model_used: params.modelUsed ?? null,
      duration_ms: params.durationMs ?? null,
      success: params.success ? 1 : 0,
      error_msg: params.errorMsg ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[db] saveToolExecution:", (e as Error).message);
  }
}

export async function saveEvaluationResult(params: {
  runId: string;
  workspaceSlug: string;
  workflowId: string;
  overallScore: number;
  passedQA: boolean;
  criteria: unknown;
  issues?: string[];
  improvements?: string[];
  evalModel?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("evaluationResults").insertOne({
      run_id: params.runId,
      workspace_slug: params.workspaceSlug,
      workflow_id: params.workflowId,
      overall_score: params.overallScore,
      passed_qa: params.passedQA ? 1 : 0,
      criteria_json: JSON.stringify(params.criteria),
      issues_json: params.issues ? JSON.stringify(params.issues) : null,
      improvements_json: params.improvements ? JSON.stringify(params.improvements) : null,
      eval_model: params.evalModel ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[db] saveEvaluationResult:", (e as Error).message);
  }
}

export async function savePromptRefinement(params: {
  workspaceSlug: string;
  original: string;
  refined: string;
  cluster?: string;
  workflowId?: string;
  successScore?: number;
  notes?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.collection("promptRefinements").insertOne({
      workspace_slug: params.workspaceSlug,
      original_prompt: params.original.slice(0, 600),
      refined_prompt: params.refined.slice(0, 600),
      cluster: params.cluster ?? null,
      workflow_id: params.workflowId ?? null,
      success_score: params.successScore ?? null,
      notes: params.notes ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[db] savePromptRefinement:", (e as Error).message);
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

export async function getSimilarGenerations(params: {
  workspaceSlug: string;
  cluster: string;
  workflowId?: string;
  limit?: number;
}): Promise<StoredGeneration[]> {
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = {
      workspace_slug: params.workspaceSlug,
      cluster: params.cluster,
    };
    if (params.workflowId) filter.workflow_id = params.workflowId;

    const docs = await db.collection("generations")
      .find(filter)
      .sort({ eval_score: -1, created_at: -1 })
      .limit(params.limit ?? 2)
      .toArray();

    return docs.map(d => ({
      id: d._id.toString(),
      workspace_slug: d.workspace_slug,
      run_id: d.run_id,
      prompt_text: d.prompt_text,
      cluster: d.cluster,
      workflow_id: d.workflow_id,
      timeline_json: d.timeline_json,
      qa_score: d.qa_score,
      eval_score: d.eval_score,
      created_at: d.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getRecentGenerations(params: {
  workspaceSlug: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  prompt_text: string;
  cluster: string;
  timeline_json: string;
  eval_score: number | null;
  created_at: string;
  aspect_ratio: string | null;
  duration_sec: number | null;
}>> {
  try {
    const db = await getDb();
    const docs = await db.collection("generations")
      .find(
        { workspace_slug: params.workspaceSlug },
        { projection: { prompt_text: 1, cluster: 1, timeline_json: 1, eval_score: 1, created_at: 1, aspect_ratio: 1, duration_sec: 1 } },
      )
      .sort({ created_at: -1 })
      .limit(params.limit ?? 20)
      .toArray();

    return docs.map(d => ({
      id: d._id.toString(),
      prompt_text: d.prompt_text,
      cluster: d.cluster,
      timeline_json: d.timeline_json,
      eval_score: d.eval_score ?? null,
      created_at: d.created_at,
      aspect_ratio: d.aspect_ratio ?? null,
      duration_sec: d.duration_sec ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getWorkflowRunHistory(params: {
  workspaceSlug: string;
  cluster?: string;
  limit?: number;
}): Promise<StoredWorkflowRun[]> {
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = { workspace_slug: params.workspaceSlug };
    if (params.cluster) filter.cluster = params.cluster;

    const docs = await db.collection("workflowRuns")
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(params.limit ?? 10)
      .toArray();

    return docs as unknown as StoredWorkflowRun[];
  } catch {
    return [];
  }
}

export async function getWorkspaceStats(workspaceSlug: string): Promise<{
  totalGenerations: number;
  totalRuns: number;
  avgEvalScore: number | null;
}> {
  try {
    const db = await getDb();
    const doc = await db.collection("workspacePreferences").findOne(
      { workspace_slug: workspaceSlug },
      { projection: { _id: 0 } },
    );
    return {
      totalGenerations: doc?.total_generations ?? 0,
      totalRuns: doc?.total_runs ?? 0,
      avgEvalScore: doc?.avg_eval_score ?? null,
    };
  } catch {
    return { totalGenerations: 0, totalRuns: 0, avgEvalScore: null };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 200); i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
