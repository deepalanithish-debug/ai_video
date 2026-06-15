/**
 * Base interfaces for the tool-based architecture.
 *
 * Every capability in the system must be expressed as a Tool<TInput, TOutput>.
 * Tools are independent, stateless, and composable.
 * Workflows are ordered sequences of tool calls selected by the Planner agent.
 *
 * No hardcoded if/else routing. The Planner decides which tools run.
 */

export type WorkflowCluster = "ugc-ads" | "travel-cinematic";
export type EditMode = "editorial" | "concept";

// ── Tool context passed to every tool execution ──────────────────────────────

export interface ToolContext {
  runId: string;
  workspaceSlug: string;
  cluster: WorkflowCluster;
  mode: EditMode;
}

// ── Result envelope ───────────────────────────────────────────────────────────

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  modelUsed?: string;
  tokensUsed?: number;
}

// ── Base tool interface ───────────────────────────────────────────────────────

export interface Tool<TIn, TOut> {
  // Identity
  readonly name: string;
  readonly description: string;
  readonly purpose: string;
  // Documentation
  readonly inputs: string;
  readonly outputs: string;
  readonly modelsUsed: readonly string[];
  readonly failureCases: readonly string[];
  readonly knownLimitations: readonly string[];
  // Execution
  execute(input: TIn, ctx: ToolContext): Promise<ToolResult<TOut>>;
}

// ── Execution step recorded in the trace ─────────────────────────────────────

export interface ToolStep {
  toolName: string;
  model: string;
  durationMs: number;
  success: boolean;
  decision?: string;
  error?: string;
}

// ── Planner output — the tool execution plan ─────────────────────────────────

export interface ExecutionPlan {
  cluster: WorkflowCluster;
  mode: EditMode;
  workflowId: string;
  intent: string;
  tone: string;
  platform: string;
  tools: Array<{ toolName: string; reason: string }>;
  clarifyingQuestions: string[];
  isComplete: boolean;
}
