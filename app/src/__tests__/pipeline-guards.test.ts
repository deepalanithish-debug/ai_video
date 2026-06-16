/**
 * Tests for agent pipeline guards applied after timeline-generator runs.
 *
 * Guard 1: trim excess scenes (never more than uploaded clips)
 * Guard 3: clamp clipTrimEnd to exact clip duration, recalculate scene duration
 *
 * These are extracted as pure helper functions to make them testable without
 * spinning up the full agent pipeline (which requires Vertex AI credentials).
 */
import { describe, it, expect } from "vitest";
import type { Scene } from "@/types/timeline";
import type { GeminiClip } from "@/lib/gemini";

// ── Pure implementations of the guards (mirrored from agent-pipeline.ts) ─────

interface ClipAssignment { sceneId: string; clipIndex: number; }

function applyGuard1(scenes: Scene[], clips: GeminiClip[]): Scene[] {
  if (scenes.length > clips.length) return scenes.slice(0, clips.length);
  return scenes;
}

function applyGuard3(
  scenes: Scene[],
  clips: GeminiClip[],
  assignments: ClipAssignment[]
): Scene[] {
  return scenes.map((scene, sceneIdx) => {
    const assignment = assignments.find((a) => a.sceneId === scene.id);
    const clipIdx = assignment?.clipIndex ?? sceneIdx;
    const sourceClip = clips[clipIdx] ?? clips[sceneIdx];
    const exactDuration = sourceClip?.duration;
    if (!exactDuration || exactDuration <= 0) return scene;

    const trimStart = Math.max(0, scene.clipTrimStart ?? 0);
    const trimEnd = Math.min(scene.clipTrimEnd ?? exactDuration, exactDuration);
    const resolvedTrimEnd = trimEnd > trimStart ? trimEnd : exactDuration;
    return {
      ...scene,
      clipTrimStart: trimStart,
      clipTrimEnd: resolvedTrimEnd,
      duration: parseFloat((resolvedTrimEnd - trimStart).toFixed(3)),
    };
  });
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeScene(id: string, overrides: Partial<Scene> = {}): Scene {
  return {
    id,
    order: 0,
    label: `Scene ${id}`,
    duration: 5,
    clipTrimStart: 0,
    clipTrimEnd: 5,
    transition: { type: "cut", duration: 0 },
    captions: [],
    overlays: [],
    mood: "luxury",
    motionStyle: "static",
    ...overrides,
  };
}

function makeClip(duration: number): GeminiClip {
  return { duration } as GeminiClip;
}

// ── Guard 1: scene count capping ─────────────────────────────────────────────

describe("Guard 1 — scene count must not exceed uploaded clip count", () => {
  it("passes through when scene count equals clip count", () => {
    const scenes = [makeScene("s1"), makeScene("s2"), makeScene("s3")];
    const clips  = [makeClip(5), makeClip(5), makeClip(5)];
    expect(applyGuard1(scenes, clips)).toHaveLength(3);
  });

  it("passes through when scene count is less than clip count", () => {
    const scenes = [makeScene("s1"), makeScene("s2")];
    const clips  = [makeClip(5), makeClip(5), makeClip(5)];
    expect(applyGuard1(scenes, clips)).toHaveLength(2);
  });

  it("trims excess scenes when model returns more scenes than clips (the 4→3 bug)", () => {
    const scenes = [makeScene("s1"), makeScene("s2"), makeScene("s3"), makeScene("s4")];
    const clips  = [makeClip(5), makeClip(5), makeClip(5)]; // only 3 clips
    const result = applyGuard1(scenes, clips);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("handles edge case: 1 clip, model returned 4 scenes", () => {
    const scenes = [makeScene("s1"), makeScene("s2"), makeScene("s3"), makeScene("s4")];
    const clips  = [makeClip(5)];
    expect(applyGuard1(scenes, clips)).toHaveLength(1);
  });

  it("returns empty array when clips array is empty", () => {
    const scenes = [makeScene("s1")];
    const clips: GeminiClip[] = [];
    expect(applyGuard1(scenes, clips)).toHaveLength(0);
  });
});

// ── Guard 2: fix duplicate clipIndex ─────────────────────────────────────────

function applyGuard2(assignments: ClipAssignment[], totalClips: number): ClipAssignment[] {
  const result = assignments.map(a => ({ ...a }));
  const usedIndices = new Set<number>();
  for (const a of result) {
    if (!usedIndices.has(a.clipIndex)) {
      usedIndices.add(a.clipIndex);
    } else {
      let next = 0;
      while (usedIndices.has(next) && next < totalClips) next++;
      if (next < totalClips) { a.clipIndex = next; usedIndices.add(next); }
    }
  }
  return result;
}

describe("Guard 2 — duplicate clipIndex → reassign to unused clip", () => {
  it("passes through assignments with all unique clipIndexes unchanged", () => {
    const assignments = [
      { sceneId: "s1", clipIndex: 0 },
      { sceneId: "s2", clipIndex: 1 },
      { sceneId: "s3", clipIndex: 2 },
    ];
    const result = applyGuard2(assignments, 3);
    expect(result.map(a => a.clipIndex)).toEqual([0, 1, 2]);
  });

  it("reassigns a duplicate clipIndex to the next unused index (the same-clip-twice bug)", () => {
    const assignments = [
      { sceneId: "s1", clipIndex: 0 },
      { sceneId: "s2", clipIndex: 0 }, // duplicate!
      { sceneId: "s3", clipIndex: 2 },
    ];
    const result = applyGuard2(assignments, 3);
    const indices = result.map(a => a.clipIndex);
    // Each index should be unique
    expect(new Set(indices).size).toBe(3);
    // s1 keeps its original index
    expect(result.find(a => a.sceneId === "s1")!.clipIndex).toBe(0);
    // s2 gets reassigned to the next available (1)
    expect(result.find(a => a.sceneId === "s2")!.clipIndex).toBe(1);
  });

  it("handles all scenes assigned to clipIndex 0 (worst-case model failure)", () => {
    const assignments = [
      { sceneId: "s1", clipIndex: 0 },
      { sceneId: "s2", clipIndex: 0 },
      { sceneId: "s3", clipIndex: 0 },
      { sceneId: "s4", clipIndex: 0 },
    ];
    const result = applyGuard2(assignments, 4);
    const indices = result.map(a => a.clipIndex).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it("preserves sceneId on reassigned entries", () => {
    const assignments = [
      { sceneId: "aaa", clipIndex: 1 },
      { sceneId: "bbb", clipIndex: 1 }, // duplicate
    ];
    const result = applyGuard2(assignments, 3);
    expect(result.find(a => a.sceneId === "bbb")!.clipIndex).toBe(0);
  });

  it("does not panic when assignments.length > totalClips", () => {
    const assignments = [
      { sceneId: "s1", clipIndex: 0 },
      { sceneId: "s2", clipIndex: 0 },
      { sceneId: "s3", clipIndex: 0 }, // only 2 clips available
    ];
    // last one can't be reassigned (no clip available), stays as-is or unchanged
    const result = applyGuard2(assignments, 2);
    // at least first two should be unique
    expect(result[0].clipIndex).not.toBe(result[1].clipIndex);
  });
});

// ── Guard 3: clipTrimEnd clamping ─────────────────────────────────────────────

describe("Guard 3 — clipTrimEnd must not exceed actual clip file duration", () => {
  it("leaves trim unchanged when within bounds", () => {
    const scenes = [makeScene("s1", { clipTrimStart: 1, clipTrimEnd: 4, duration: 3 })];
    const clips  = [makeClip(10)];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].clipTrimEnd).toBe(4);
    expect(result[0].clipTrimStart).toBe(1);
    expect(result[0].duration).toBe(3);
  });

  it("clamps clipTrimEnd to exact clip duration when it overshoots", () => {
    const scenes = [makeScene("s1", { clipTrimStart: 0, clipTrimEnd: 15, duration: 15 })];
    const clips  = [makeClip(8.5)]; // actual file is only 8.5s
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].clipTrimEnd).toBe(8.5);
    expect(result[0].duration).toBeCloseTo(8.5, 3);
  });

  it("recalculates duration = clipTrimEnd - clipTrimStart after clamping", () => {
    const scenes = [makeScene("s1", { clipTrimStart: 2, clipTrimEnd: 20, duration: 18 })];
    const clips  = [makeClip(10)];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].clipTrimEnd).toBe(10);
    expect(result[0].clipTrimStart).toBe(2);
    expect(result[0].duration).toBeCloseTo(8, 3);
  });

  it("preserves clipTrimStart — only caps the end", () => {
    const scenes = [makeScene("s1", { clipTrimStart: 3, clipTrimEnd: 99, duration: 96 })];
    const clips  = [makeClip(7)];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].clipTrimStart).toBe(3);   // unchanged
    expect(result[0].clipTrimEnd).toBe(7);      // clamped to clip max
  });

  it("uses clipAssignment to map scene to correct clip (not just scene index)", () => {
    const scenes = [
      makeScene("s-a", { clipTrimStart: 0, clipTrimEnd: 20, duration: 20 }),
      makeScene("s-b", { clipTrimStart: 0, clipTrimEnd: 20, duration: 20 }),
    ];
    const clips = [makeClip(6), makeClip(12)];
    // scene s-a uses clip index 1 (12s), scene s-b uses clip index 0 (6s)
    const assignments: ClipAssignment[] = [
      { sceneId: "s-a", clipIndex: 1 },
      { sceneId: "s-b", clipIndex: 0 },
    ];
    const result = applyGuard3(scenes, clips, assignments);
    expect(result[0].clipTrimEnd).toBe(12);  // s-a uses clip 1 (12s)
    expect(result[1].clipTrimEnd).toBe(6);   // s-b uses clip 0 (6s)
  });

  it("falls back to scene index when no assignment found", () => {
    const scenes = [
      makeScene("s1", { clipTrimEnd: 99 }),
      makeScene("s2", { clipTrimEnd: 99 }),
    ];
    const clips = [makeClip(5), makeClip(8)];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].clipTrimEnd).toBe(5); // scene[0] → clips[0]
    expect(result[1].clipTrimEnd).toBe(8); // scene[1] → clips[1]
  });

  it("does not crash when clip has no duration (undefined)", () => {
    const scenes = [makeScene("s1", { clipTrimEnd: 99 })];
    const clips  = [{ duration: undefined } as unknown as GeminiClip];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0]).toMatchObject({ id: "s1" }); // unchanged, no crash
  });

  it("handles precise decimal durations without floating-point drift", () => {
    const scenes = [makeScene("s1", { clipTrimStart: 1.1, clipTrimEnd: 99 })];
    const clips  = [makeClip(7.777)];
    const result = applyGuard3(scenes, clips, []);
    expect(result[0].duration).toBe(parseFloat((7.777 - 1.1).toFixed(3)));
  });
});
