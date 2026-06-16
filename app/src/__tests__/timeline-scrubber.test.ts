import { describe, it, expect } from "vitest";
import type { Timeline } from "@/types/timeline";

// Pure scene resolution logic extracted for testing
function resolveScene(timeline: Timeline, currentTime: number) {
  let elapsed = 0;
  for (const scene of timeline.scenes ?? []) {
    if (currentTime < elapsed + scene.duration) return scene;
    elapsed += scene.duration;
  }
  return timeline.scenes?.[timeline.scenes.length - 1] ?? null;
}

function makeTimeline(durations: number[]): Timeline {
  return {
    id: "t1", title: "Test", brandWorkspaceId: "w1", aspectRatio: "9:16", isLocked: false,
    targetPlatform: "instagram", totalDuration: durations.reduce((a, b) => a + b, 0),
    scenes: durations.map((dur, i) => ({
      id: `s${i}`, order: i, label: `Scene ${i}`, description: "",
      duration: dur, transition: { type: "cut" as const, duration: 0 },
      captions: [], overlays: [], mood: "luxury", motionStyle: "static",
    })),
    audioLayers: [], createdAt: "", updatedAt: "",
  };
}

describe("resolveScene", () => {
  it("returns first scene at t=0", () => {
    const tl = makeTimeline([5, 5, 5]);
    expect(resolveScene(tl, 0)?.id).toBe("s0");
  });

  it("advances to second scene after first duration", () => {
    const tl = makeTimeline([5, 5, 5]);
    expect(resolveScene(tl, 5)?.id).toBe("s1");
    expect(resolveScene(tl, 5.01)?.id).toBe("s1");
  });

  it("returns last scene at end of timeline", () => {
    const tl = makeTimeline([5, 5, 5]);
    expect(resolveScene(tl, 14.99)?.id).toBe("s2");
    expect(resolveScene(tl, 15)?.id).toBe("s2");
  });

  it("handles variable-duration scenes", () => {
    const tl = makeTimeline([3, 7, 2]);
    expect(resolveScene(tl, 0)?.id).toBe("s0");
    expect(resolveScene(tl, 3)?.id).toBe("s1");
    expect(resolveScene(tl, 10)?.id).toBe("s2");
    expect(resolveScene(tl, 11)?.id).toBe("s2"); // past end → last scene
  });

  it("handles single-scene timeline", () => {
    const tl = makeTimeline([10]);
    expect(resolveScene(tl, 0)?.id).toBe("s0");
    expect(resolveScene(tl, 9.99)?.id).toBe("s0");
    expect(resolveScene(tl, 10)?.id).toBe("s0");
  });

  it("returns null for empty timeline", () => {
    const tl = makeTimeline([]);
    expect(resolveScene(tl, 0)).toBeNull();
  });

  it("never returns undefined mid-timeline", () => {
    const tl = makeTimeline([4, 4, 4, 4]);
    for (let t = 0; t <= 16; t += 0.5) {
      const scene = resolveScene(tl, t);
      expect(scene).not.toBeNull();
      expect(scene).not.toBeUndefined();
    }
  });
});

describe("timeline seek clamping", () => {
  it("clamps seek to [0, totalDuration]", () => {
    const totalDuration = 30;
    const clamp = (t: number) => Math.max(0, Math.min(totalDuration, t));
    expect(clamp(-5)).toBe(0);
    expect(clamp(0)).toBe(0);
    expect(clamp(15)).toBe(15);
    expect(clamp(30)).toBe(30);
    expect(clamp(45)).toBe(30);
  });

  it("converts click x-position to time correctly", () => {
    const pixelsPerSecond = 44;
    const trackOffsetX = 30; // label width
    const totalDuration = 20;
    const xToTime = (x: number) =>
      Math.max(0, Math.min(totalDuration, (x - trackOffsetX) / pixelsPerSecond));

    expect(xToTime(30)).toBeCloseTo(0);
    expect(xToTime(30 + 44)).toBeCloseTo(1);
    expect(xToTime(30 + 44 * 10)).toBeCloseTo(10);
    expect(xToTime(30 + 44 * 25)).toBeCloseTo(20); // clamped
  });
});
