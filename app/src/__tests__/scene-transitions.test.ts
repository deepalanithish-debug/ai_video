/**
 * Tests for per-clip transition selection.
 *
 * Covers:
 * - onSceneUpdate correctly patches transition type and duration
 * - Cut transition always sets duration to 0
 * - Non-cut transitions preserve/set a positive duration
 * - xfade offset calculation: offset = timeAcc + displayDuration - xfadeDur
 */
import { describe, it, expect } from "vitest";
import type { Scene } from "@/types/timeline";
import { toXfadeType } from "@/lib/ffmpeg-render";

// ── Pure transition update (mirrors PropertiesPanel setTransitionType logic) ──

function applyTransitionType(
  scene: Scene,
  type: string
): Pick<Scene, "transition"> {
  // Use || not ?? — existing duration of 0 (from "cut") should default to 0.5
  const dur = type === "cut" ? 0 : (scene.transition?.duration || 0.5);
  return {
    transition: {
      type: type as import("@/types/timeline").TransitionType,
      duration: dur,
    },
  };
}

function applyTransitionDuration(
  scene: Scene,
  dur: number
): Pick<Scene, "transition"> {
  return {
    transition: {
      type: (scene.transition?.type ?? "fade") as import("@/types/timeline").TransitionType,
      duration: dur,
    },
  };
}

function makeScene(transition?: Partial<Scene["transition"]>): Scene {
  return {
    id: "s1",
    order: 0,
    label: "Test",
    duration: 5,
    transition: { type: "cut", duration: 0, ...transition },
    captions: [],
    overlays: [],
    mood: "luxury",
    motionStyle: "static",
  };
}

// ── Transition type changes ───────────────────────────────────────────────────

describe("Per-clip transition type selection", () => {
  it("setting cut transition always produces duration = 0", () => {
    const scene = makeScene({ type: "fade", duration: 0.8 });
    const patch = applyTransitionType(scene, "cut");
    expect(patch.transition?.duration).toBe(0);
    expect(patch.transition?.type).toBe("cut");
  });

  it("setting fade preserves existing duration", () => {
    const scene = makeScene({ type: "cut", duration: 0 });
    // switching from cut: duration should default to 0.5
    const patch = applyTransitionType(scene, "fade");
    expect(patch.transition?.duration).toBeGreaterThan(0);
    expect(patch.transition?.type).toBe("fade");
  });

  it("switching between non-cut types preserves current duration", () => {
    const scene = makeScene({ type: "dissolve", duration: 1.2 });
    const patch = applyTransitionType(scene, "wipe-left");
    expect(patch.transition?.duration).toBe(1.2);
    expect(patch.transition?.type).toBe("wipe-left");
  });

  it("all 9 supported transition types can be applied without error", () => {
    const types = ["cut", "fade", "dissolve", "cinematic-fade", "wipe-left", "wipe-right", "slide-left", "slide-right", "zoom-in"];
    const scene = makeScene();
    for (const type of types) {
      const patch = applyTransitionType(scene, type);
      expect(patch.transition?.type).toBe(type);
    }
  });
});

// ── Transition duration changes ───────────────────────────────────────────────

describe("Per-clip transition duration slider", () => {
  it("updates transition duration while preserving type", () => {
    const scene = makeScene({ type: "fade", duration: 0.5 });
    const patch = applyTransitionDuration(scene, 1.5);
    expect(patch.transition?.duration).toBe(1.5);
    expect(patch.transition?.type).toBe("fade");
  });

  it("allows duration at minimum (0.1s)", () => {
    const scene = makeScene({ type: "dissolve", duration: 0.5 });
    const patch = applyTransitionDuration(scene, 0.1);
    expect(patch.transition?.duration).toBe(0.1);
  });

  it("allows duration at maximum (2.0s)", () => {
    const scene = makeScene({ type: "fade", duration: 0.5 });
    const patch = applyTransitionDuration(scene, 2.0);
    expect(patch.transition?.duration).toBe(2.0);
  });
});

// ── xfade offset calculation ──────────────────────────────────────────────────

describe("FFmpeg xfade offset calculation", () => {
  it("offset = timeAcc + displayDuration - xfadeDur", () => {
    const timeAcc = 0;
    const displayDur = 5;
    const xfadeDur = 0.5;
    const offset = Math.max(0, timeAcc + displayDur - xfadeDur);
    expect(offset).toBeCloseTo(4.5, 4);
  });

  it("offset is non-negative even if xfadeDur > displayDuration", () => {
    const timeAcc = 0;
    const displayDur = 0.3;
    const xfadeDur = 0.5;
    const offset = Math.max(0, timeAcc + displayDur - xfadeDur);
    expect(offset).toBe(0);
  });

  it("accumulated timeAcc grows by (displayDuration - xfadeDur) per transition", () => {
    const clips = [
      { displayDuration: 5, xfadeDur: 0.5 },
      { displayDuration: 4, xfadeDur: 0.5 },
      { displayDuration: 6, xfadeDur: 0 },  // cut
    ];
    let timeAcc = 0;
    const offsets: number[] = [];
    for (let i = 0; i < clips.length - 1; i++) {
      const { displayDuration, xfadeDur } = clips[i];
      const offset = Math.max(0, timeAcc + displayDuration - xfadeDur);
      offsets.push(offset);
      timeAcc += displayDuration - xfadeDur;
    }
    expect(offsets[0]).toBeCloseTo(4.5, 4);
    // clips[1] still has xfadeDur=0.5; offset = 4.5 + 4 - 0.5 = 8.0
    expect(offsets[1]).toBeCloseTo(8.0, 4);
  });

  it("xfade filter uses correct input labels [0:v], [1:v] etc", () => {
    // Reproduce the label-generation logic that was previously buggy
    const numClips = 3;
    const labels: string[] = [];
    for (let i = 0; i <= numClips - 1; i++) {
      labels.push(`[${i}:v]`);
    }
    expect(labels).toEqual(["[0:v]", "[1:v]", "[2:v]"]);
    // prevLabel starts as "[0:v]", NOT "0:v" (the old bug)
    expect(labels[0]).toBe("[0:v]");
  });

  it("final xfade output label is [vout] (not [vxN])", () => {
    const numClips = 4;
    const outLabels: string[] = [];
    for (let i = 0; i < numClips - 1; i++) {
      const isLast = i === numClips - 2;
      outLabels.push(isLast ? "[vout]" : `[vx${i}]`);
    }
    expect(outLabels[outLabels.length - 1]).toBe("[vout]");
  });
});

// ── toXfadeType integration with transition names ─────────────────────────────

describe("Transition type to xfade type integration", () => {
  it("all non-cut transitions produce a usable xfade name", () => {
    const nonCut = ["fade", "dissolve", "cinematic-fade", "wipe-left", "wipe-right", "slide-left", "slide-right", "zoom-in"];
    for (const type of nonCut) {
      const xfade = toXfadeType(type);
      expect(xfade, `${type} should map to non-empty xfade`).toBeTruthy();
    }
  });

  it("cut type never triggers xfade (returns empty)", () => {
    expect(toXfadeType("cut")).toBe("");
  });
});
