/**
 * Workflow type definitions.
 *
 * A Workflow is a registered, documented sequence of tools for a specific
 * content type. The Planner agent selects a workflow — it never hardcodes one.
 *
 * Every workflow must document:
 *   purpose, inputs, outputs, models, tools, evaluation criteria,
 *   example inputs, example outputs, failure cases, known limitations.
 */

import type { WorkflowCluster, EditMode, ToolName } from "@/lib/tools";

export interface WorkflowDefinition {
  id: string;
  name: string;
  cluster: WorkflowCluster;
  description: string;
  purpose: string;

  // Which tools this workflow uses, in order
  tools: ToolName[];

  // Model assignments per stage
  models: {
    planner: string;
    generator: string;
    evaluator: string;
  };

  // Cluster-specific configuration
  clusterConfig: {
    pacingStyle: "fast-cuts" | "medium-paced" | "cinematic-slow";
    defaultTransitions: string[];
    captionStyle: "punchy" | "storytelling" | "minimal";
    colorGradeDefault: string;
    sceneCountRange: [number, number];
    systemPrompt: string;
  };

  // Evaluation criteria specific to this workflow
  evaluationCriteria: EvaluationCriterion[];

  // Documentation
  exampleInputs: string[];
  exampleOutputDescription: string;
  failureCases: string[];
  knownLimitations: string[];

  // Supported modes
  supportedModes: EditMode[];
}

export interface EvaluationCriterion {
  name: string;
  description: string;
  weight: number; // 0-1, must sum to 1 across all criteria
  rubric: {
    excellent: string;
    good: string;
    poor: string;
  };
}

export interface WorkflowRunRecord {
  runId: string;
  workflowId: string;
  cluster: WorkflowCluster;
  mode: EditMode;
  prompt: string;
  toolsExecuted: string[];
  durationMs: number;
  evalScore?: number;
  createdAt: string;
}
