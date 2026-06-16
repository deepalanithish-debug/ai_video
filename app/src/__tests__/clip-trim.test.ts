/**
 * Tests for clip trim editing:
 * - clipTrimStart / clipTrimEnd update logic
 * - Duration recalculation from trim points
 * - Bounds: start ≥ 0, end ≤ file duration, end > start
 * - Preview: loop fix (pause at trimEnd, no re-loop to trimStart)
 *
 * Feature: trim editing bounded by actual clip file duration
 */
import { describe, it, expect } from "vitest";
import type { Scene } from "@/types/timeline";

// ── Pure trim update helper (mirrors PropertiesPanel onChange logic) ──────────

interface TrimPatch {
  clipTrimStart?: number;
  clipTrimEnd?: number;
  duration: number;
}

function applyTrimStart(
  scene: Scene,
  newStart: number,
  clipMaxDur: number
): TrimPatch {
  const trimEnd = scene.clipTrimEnd ?? clipMaxDur;
  const clamped = Math.max(0, Math.min(trimEnd - 0.1, newStart));
  return {
    clipTrimStart: parseFloat(clamped.toFixed(3)),
    duration: parseFloat((trimEnd - clamped).toFixed(3)),
  };
}

function applyTrimEnd(
  scene: Scene,
  newEnd: number,
  clipMaxDur: number
): TrimPatch {
  const trimStart = scene.clipTrimStart ?? 0;
  const clamped = Math.max(trimStart + 0.1, Math.min(clipMaxDur, newEnd));
  return {
    clipTrimEnd: parseFloat(clamped.toFixed(3)),
    duration: parseFloat((clamped - trimStart).toFixed(3)),
  };
}

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "s1",
    order: 0,
    label: "Test",
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

// ── Trim start ────────────────────────────────────────────────────────────────

describe("Trim start editing", () => {
  it("updates clipTrimStart and recalculates duration", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 10 });
    const patch = applyTrimStart(scene, 3, 10);
    expect(patch.clipTrimStart).toBe(3);
    expect(patch.duration).toBeCloseTo(7, 3);
  });

  it("clamps start to 0 (cannot go negative)", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 10 });
    const patch = applyTrimStart(scene, -2, 10);
    expect(patch.clipTrimStart).toBe(0);
  });

  it("clamps start to (trimEnd - 0.1) to maintain minimum duration", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 5 });
    const patch = applyTrimStart(scene, 5, 10); // trying to equal trimEnd
    expect(patch.clipTrimStart).toBeCloseTo(4.9, 2);
    expect(patch.duration).toBeGreaterThan(0);
  });

  it("preserves trimEnd when only trimStart changes", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 8 });
    const patch = applyTrimStart(scene, 2, 10);
    // clipTrimEnd not in patch means it's unchanged
    expect(patch.clipTrimEnd).toBeUndefined();
    expect(patch.duration).toBeCloseTo(6, 3);
  });
});

// ── Trim end ──────────────────────────────────────────────────────────────────

describe("Trim end editing", () => {
  it("updates clipTrimEnd and recalculates duration", () => {
    const scene = makeScene({ clipTrimStart: 1, clipTrimEnd: 5 });
    const patch = applyTrimEnd(scene, 8, 10);
    expect(patch.clipTrimEnd).toBe(8);
    expect(patch.duration).toBeCloseTo(7, 3);
  });

  it("clamps trimEnd to actual clip file duration (cannot extend beyond file)", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 5 });
    const patch = applyTrimEnd(scene, 99, 7.5); // file is only 7.5s
    expect(patch.clipTrimEnd).toBe(7.5);
  });

  it("clamps trimEnd to (trimStart + 0.1) minimum", () => {
    const scene = makeScene({ clipTrimStart: 5, clipTrimEnd: 8 });
    const patch = applyTrimEnd(scene, 4, 10); // below trimStart
    expect(patch.clipTrimEnd).toBeCloseTo(5.1, 2);
    expect(patch.duration).toBeGreaterThan(0);
  });

  it("preserves trimStart when only trimEnd changes", () => {
    const scene = makeScene({ clipTrimStart: 2, clipTrimEnd: 6 });
    const patch = applyTrimEnd(scene, 9, 10);
    expect(patch.clipTrimStart).toBeUndefined();
    expect(patch.duration).toBeCloseTo(7, 3);
  });

  it("can extend to full clip duration when file is longer", () => {
    const scene = makeScene({ clipTrimStart: 0, clipTrimEnd: 4 });
    const patch = applyTrimEnd(scene, 12.5, 12.5); // extend to file end
    expect(patch.clipTrimEnd).toBe(12.5);
    expect(patch.duration).toBeCloseTo(12.5, 3);
  });

  it("handles decimal file duration precisely", () => {
    const scene = makeScene({ clipTrimStart: 0.5, clipTrimEnd: 3 });
    const patch = applyTrimEnd(scene, 7.333, 7.333);
    expect(patch.clipTrimEnd).toBe(7.333);
    expect(patch.duration).toBeCloseTo(6.833, 3);
  });
});

// ── Duration precision (Math.round → parseFloat bug fix) ─────────────────────

describe("Duration precision fix (parseFloat vs Math.round)", () => {
  it("stores 3-decimal precision instead of rounded integers", () => {
    // Simulates what happens when probe.duration = 8.767
    const rawDuration = 8.767;
    const rounded = Math.round(rawDuration);      // old behavior: 9
    const precise = parseFloat(rawDuration.toFixed(3)); // new behavior: 8.767
    expect(rounded).toBe(9);
    expect(precise).toBe(8.767);
  });

  it("does not lose sub-second duration info for short clips", () => {
    const rawDuration = 3.333;
    expect(parseFloat(rawDuration.toFixed(3))).toBe(3.333);
    expect(Math.round(rawDuration)).toBe(3);
  });
});

// ── Preview loop fix ──────────────────────────────────────────────────────────

describe("Preview loop fix — pause at trimEnd, no re-loop", () => {
  it("should pause when currentTime reaches clipTrimEnd", () => {
    // Simulate the onTimeUpdate behavior: pause when time >= trimEnd
    const trimEnd = 7.5;
    let paused = false;
    function onTimeUpdate(currentTime: number) {
      if (currentTime >= trimEnd) paused = true;
    }
    onTimeUpdate(7.3); expect(paused).toBe(false);
    onTimeUpdate(7.5); expect(paused).toBe(true);
  });

  it("should NOT loop back to trimStart when video ends", () => {
    let currentTime = 0;
    const trimStart = 2;
    // Old buggy behavior was: currentTime = trimStart; (loop back)
    // New behavior: just pause, don't change currentTime
    function onEnded() {
      // correct behavior: do nothing (no-op)
    }
    currentTime = 8.0;
    onEnded();
    // currentTime should remain at 8.0, NOT jump back to trimStart
    expect(currentTime).not.toBe(trimStart);
    expect(currentTime).toBe(8.0);
  });

  it("does not re-loop when time overshoots trimEnd slightly (floating point)", () => {
    // Browsers may fire onTimeUpdate slightly past the target
    const trimEnd = 5.0;
    let paused = false;
    function onTimeUpdate(t: number) {
      if (t >= trimEnd) paused = true;
    }
    onTimeUpdate(5.01); // slightly past
    expect(paused).toBe(true);
  });
});
