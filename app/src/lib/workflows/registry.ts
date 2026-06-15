/**
 * Workflow Registry
 *
 * All registered workflows. The Planner agent selects from this registry.
 * To add a new workflow: implement WorkflowDefinition and register it here.
 */

import { ugcAdsWorkflow } from "./ugc-ads";
import { travelCinematicWorkflow } from "./travel-cinematic";
import type { WorkflowDefinition } from "./types";
import type { WorkflowCluster } from "@/lib/tools";

export { ugcAdsWorkflow, travelCinematicWorkflow };
export type { WorkflowDefinition, EvaluationCriterion, WorkflowRunRecord } from "./types";

const REGISTRY: WorkflowDefinition[] = [
  ugcAdsWorkflow,
  travelCinematicWorkflow,
];

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return REGISTRY.find(w => w.id === id);
}

export function getWorkflowsByCluster(cluster: WorkflowCluster): WorkflowDefinition[] {
  return REGISTRY.filter(w => w.cluster === cluster);
}

export function getDefaultWorkflow(cluster: WorkflowCluster): WorkflowDefinition {
  const match = REGISTRY.find(w => w.cluster === cluster);
  if (!match) return ugcAdsWorkflow; // safe fallback
  return match;
}

export function listWorkflows(): Array<{ id: string; name: string; cluster: WorkflowCluster; description: string }> {
  return REGISTRY.map(w => ({ id: w.id, name: w.name, cluster: w.cluster, description: w.description }));
}
