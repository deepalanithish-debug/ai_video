/**
 * Persistent SQLite memory layer.
 *
 * Tables:
 *   generations         — every successful generation (learning corpus)
 *   workflow_runs       — every pipeline run with workflow/tool trace
 *   tool_executions     — per-tool timing and results within a run
 *   evaluation_results  — evaluation scores per run
 *   prompt_refinements  — original → refined prompt pairs with outcomes
 *   workspace_preferences — workspace-level stats
 *
 * Purpose: The system should never start from zero.
 *          Past successful generations augment future prompts.
 *          Evaluation scores guide which patterns to repeat.
 */

import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH  = path.join(DATA_DIR, "frameai.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    -- Core generations corpus
    CREATE TABLE IF NOT EXISTS generations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_slug TEXT NOT NULL,
      run_id        TEXT,
      prompt_hash   TEXT NOT NULL,
      prompt_text   TEXT NOT NULL,
      cluster       TEXT NOT NULL,
      workflow_id   TEXT,
      aspect_ratio  TEXT,
      duration_sec  INTEGER,
      timeline_json TEXT NOT NULL,
      trace_json    TEXT,
      qa_score      INTEGER,
      eval_score    INTEGER,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gen_ws_cluster  ON generations(workspace_slug, cluster);
    CREATE INDEX IF NOT EXISTS idx_gen_eval        ON generations(workspace_slug, eval_score DESC);
    CREATE INDEX IF NOT EXISTS idx_gen_run_id      ON generations(run_id);

    -- Workflow run records (one per API call)
    CREATE TABLE IF NOT EXISTS workflow_runs (
      run_id         TEXT PRIMARY KEY,
      workspace_slug TEXT NOT NULL,
      workflow_id    TEXT NOT NULL,
      cluster        TEXT NOT NULL,
      mode           TEXT NOT NULL,
      prompt_text    TEXT NOT NULL,
      tools_executed TEXT NOT NULL,   -- JSON array of tool names
      total_ms       INTEGER,
      eval_score     INTEGER,
      passed_qa      INTEGER DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_runs_ws         ON workflow_runs(workspace_slug);
    CREATE INDEX IF NOT EXISTS idx_runs_cluster    ON workflow_runs(cluster);
    CREATE INDEX IF NOT EXISTS idx_runs_score      ON workflow_runs(eval_score DESC);

    -- Per-tool execution records within a run
    CREATE TABLE IF NOT EXISTS tool_executions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id        TEXT NOT NULL,
      tool_name     TEXT NOT NULL,
      model_used    TEXT,
      duration_ms   INTEGER,
      success       INTEGER NOT NULL DEFAULT 1,
      error_msg     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tool_run_id     ON tool_executions(run_id);
    CREATE INDEX IF NOT EXISTS idx_tool_name       ON tool_executions(tool_name);

    -- Evaluation scores per run
    CREATE TABLE IF NOT EXISTS evaluation_results (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id           TEXT NOT NULL,
      workspace_slug   TEXT NOT NULL,
      workflow_id      TEXT NOT NULL,
      overall_score    INTEGER NOT NULL,
      passed_qa        INTEGER NOT NULL DEFAULT 0,
      criteria_json    TEXT NOT NULL,   -- JSON array of CriterionScore
      issues_json      TEXT,
      improvements_json TEXT,
      eval_model       TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_eval_run_id     ON evaluation_results(run_id);
    CREATE INDEX IF NOT EXISTS idx_eval_ws_score   ON evaluation_results(workspace_slug, overall_score DESC);

    -- Prompt learning layer
    CREATE TABLE IF NOT EXISTS prompt_refinements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_slug  TEXT NOT NULL,
      original_prompt TEXT NOT NULL,
      refined_prompt  TEXT NOT NULL,
      cluster         TEXT,
      workflow_id     TEXT,
      success_score   INTEGER,
      notes           TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_refine_ws       ON prompt_refinements(workspace_slug, cluster);

    -- Workspace-level aggregate stats
    CREATE TABLE IF NOT EXISTS workspace_preferences (
      workspace_slug      TEXT PRIMARY KEY,
      total_generations   INTEGER DEFAULT 0,
      total_runs          INTEGER DEFAULT 0,
      preferred_cluster   TEXT,
      avg_eval_score      REAL,
      preferences_json    TEXT,
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoredGeneration {
  id: number;
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

export function saveGeneration(params: {
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
}): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO generations
        (workspace_slug, run_id, prompt_hash, prompt_text, cluster, workflow_id, aspect_ratio, duration_sec, timeline_json, trace_json, qa_score, eval_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.workspaceSlug,
      params.runId ?? null,
      simpleHash(params.prompt),
      params.prompt.slice(0, 600),
      params.cluster,
      params.workflowId ?? null,
      params.aspectRatio ?? null,
      params.durationSec ?? null,
      JSON.stringify(params.timeline),
      params.trace ? JSON.stringify(params.trace) : null,
      params.qaScore ?? null,
      params.evalScore ?? null,
    );

    db.prepare(`
      INSERT INTO workspace_preferences (workspace_slug, total_generations, updated_at)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(workspace_slug) DO UPDATE SET
        total_generations = total_generations + 1,
        updated_at = datetime('now')
    `).run(params.workspaceSlug);
  } catch (e) {
    console.warn("[db] saveGeneration:", (e as Error).message);
  }
}

export function saveWorkflowRun(params: {
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
}): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO workflow_runs
        (run_id, workspace_slug, workflow_id, cluster, mode, prompt_text, tools_executed, total_ms, eval_score, passed_qa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.runId,
      params.workspaceSlug,
      params.workflowId,
      params.cluster,
      params.mode,
      params.prompt.slice(0, 600),
      JSON.stringify(params.toolsExecuted),
      params.totalMs ?? null,
      params.evalScore ?? null,
      params.passedQA ? 1 : 0,
    );

    db.prepare(`
      INSERT INTO workspace_preferences (workspace_slug, total_runs, updated_at)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(workspace_slug) DO UPDATE SET
        total_runs = total_runs + 1,
        updated_at = datetime('now')
    `).run(params.workspaceSlug);
  } catch (e) {
    console.warn("[db] saveWorkflowRun:", (e as Error).message);
  }
}

export function saveToolExecution(params: {
  runId: string;
  toolName: string;
  modelUsed?: string;
  durationMs?: number;
  success: boolean;
  errorMsg?: string;
}): void {
  try {
    getDb().prepare(`
      INSERT INTO tool_executions (run_id, tool_name, model_used, duration_ms, success, error_msg)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      params.runId,
      params.toolName,
      params.modelUsed ?? null,
      params.durationMs ?? null,
      params.success ? 1 : 0,
      params.errorMsg ?? null,
    );
  } catch (e) {
    console.warn("[db] saveToolExecution:", (e as Error).message);
  }
}

export function saveEvaluationResult(params: {
  runId: string;
  workspaceSlug: string;
  workflowId: string;
  overallScore: number;
  passedQA: boolean;
  criteria: unknown;
  issues?: string[];
  improvements?: string[];
  evalModel?: string;
}): void {
  try {
    getDb().prepare(`
      INSERT INTO evaluation_results
        (run_id, workspace_slug, workflow_id, overall_score, passed_qa, criteria_json, issues_json, improvements_json, eval_model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.runId,
      params.workspaceSlug,
      params.workflowId,
      params.overallScore,
      params.passedQA ? 1 : 0,
      JSON.stringify(params.criteria),
      params.issues ? JSON.stringify(params.issues) : null,
      params.improvements ? JSON.stringify(params.improvements) : null,
      params.evalModel ?? null,
    );
  } catch (e) {
    console.warn("[db] saveEvaluationResult:", (e as Error).message);
  }
}

export function savePromptRefinement(params: {
  workspaceSlug: string;
  original: string;
  refined: string;
  cluster?: string;
  workflowId?: string;
  successScore?: number;
  notes?: string;
}): void {
  try {
    getDb().prepare(`
      INSERT INTO prompt_refinements (workspace_slug, original_prompt, refined_prompt, cluster, workflow_id, success_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.workspaceSlug,
      params.original.slice(0, 600),
      params.refined.slice(0, 600),
      params.cluster ?? null,
      params.workflowId ?? null,
      params.successScore ?? null,
      params.notes ?? null,
    );
  } catch (e) {
    console.warn("[db] savePromptRefinement:", (e as Error).message);
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

export function getSimilarGenerations(params: {
  workspaceSlug: string;
  cluster: string;
  workflowId?: string;
  limit?: number;
}): StoredGeneration[] {
  try {
    const db = getDb();
    if (params.workflowId) {
      return db.prepare(`
        SELECT id, workspace_slug, run_id, prompt_text, cluster, workflow_id, timeline_json, qa_score, eval_score, created_at
        FROM generations
        WHERE workspace_slug = ? AND cluster = ? AND workflow_id = ?
        ORDER BY COALESCE(eval_score, qa_score, 50) DESC, created_at DESC
        LIMIT ?
      `).all(params.workspaceSlug, params.cluster, params.workflowId, params.limit ?? 2) as StoredGeneration[];
    }
    return db.prepare(`
      SELECT id, workspace_slug, run_id, prompt_text, cluster, workflow_id, timeline_json, qa_score, eval_score, created_at
      FROM generations
      WHERE workspace_slug = ? AND cluster = ?
      ORDER BY COALESCE(eval_score, qa_score, 50) DESC, created_at DESC
      LIMIT ?
    `).all(params.workspaceSlug, params.cluster, params.limit ?? 2) as StoredGeneration[];
  } catch {
    return [];
  }
}

export function getRecentGenerations(params: {
  workspaceSlug: string;
  limit?: number;
}): Array<{
  id: number;
  prompt_text: string;
  cluster: string;
  timeline_json: string;
  eval_score: number | null;
  created_at: string;
  aspect_ratio: string | null;
  duration_sec: number | null;
}> {
  try {
    const db = getDb();
    return db.prepare(`
      SELECT id, prompt_text, cluster, timeline_json, eval_score, created_at, aspect_ratio, duration_sec
      FROM generations
      WHERE workspace_slug = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(params.workspaceSlug, params.limit ?? 20) as Array<{
      id: number;
      prompt_text: string;
      cluster: string;
      timeline_json: string;
      eval_score: number | null;
      created_at: string;
      aspect_ratio: string | null;
      duration_sec: number | null;
    }>;
  } catch {
    return [];
  }
}

export function getWorkflowRunHistory(params: {
  workspaceSlug: string;
  cluster?: string;
  limit?: number;
}): StoredWorkflowRun[] {
  try {
    const db = getDb();
    if (params.cluster) {
      return db.prepare(`
        SELECT * FROM workflow_runs
        WHERE workspace_slug = ? AND cluster = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(params.workspaceSlug, params.cluster, params.limit ?? 10) as StoredWorkflowRun[];
    }
    return db.prepare(`
      SELECT * FROM workflow_runs
      WHERE workspace_slug = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(params.workspaceSlug, params.limit ?? 10) as StoredWorkflowRun[];
  } catch {
    return [];
  }
}

export function getWorkspaceStats(workspaceSlug: string): {
  totalGenerations: number;
  totalRuns: number;
  avgEvalScore: number | null;
} {
  try {
    const row = getDb().prepare(`
      SELECT total_generations, total_runs, avg_eval_score
      FROM workspace_preferences WHERE workspace_slug = ?
    `).get(workspaceSlug) as { total_generations: number; total_runs: number; avg_eval_score: number | null } | undefined;
    return {
      totalGenerations: row?.total_generations ?? 0,
      totalRuns: row?.total_runs ?? 0,
      avgEvalScore: row?.avg_eval_score ?? null,
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
