/**
 * Tool Registry
 *
 * Every capability in the system is registered here.
 * The Planner agent selects tools from this registry by name.
 * To add a new capability: implement Tool<TIn, TOut> and register it here.
 */

export { videoAnalysisTool } from "./video-analysis";
export { hookDetectionTool } from "./hook-detection";
export { timelineGeneratorTool } from "./timeline-generator";
export { transitionPlannerTool } from "./transition-planner";
export { captionGeneratorTool } from "./caption-generator";
export { musicSelectorTool } from "./music-selector";

export type { VideoAnalysisInput, VideoAnalysisOutput, ClipAnalysis, SceneDetection } from "./video-analysis";
export type { HookDetectionInput, HookDetectionOutput, HookCandidate } from "./hook-detection";
export type { TimelineGeneratorInput, TimelineGeneratorOutput, ClusterConfig } from "./timeline-generator";
export type { TransitionPlannerInput, TransitionPlannerOutput, SceneTransition } from "./transition-planner";
export type { CaptionGeneratorInput, CaptionGeneratorOutput, SceneCaptions } from "./caption-generator";
export type { MusicSelectorInput, MusicSelectorOutput, MusicSpec } from "./music-selector";
export type { Tool, ToolResult, ToolStep, ToolContext, ExecutionPlan, WorkflowCluster, EditMode } from "./types";

// ── Tool name registry (used by planner for validation) ─────────────────────
export const TOOL_NAMES = [
  "video-analysis",
  "hook-detection",
  "timeline-generator",
  "transition-planner",
  "caption-generator",
  "music-selector",
] as const;

export type ToolName = typeof TOOL_NAMES[number];
