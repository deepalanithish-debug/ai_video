/**
 * Tests for inserting a new clip/image between existing scenes in the timeline.
 *
 * The insert logic: splice a new Scene into the scenes array at `position`,
 * then re-index order and recalculate totalDuration.
 */
import { describe, it, expect } from "vitest";
import type { Scene, Timeline } from "@/types/timeline";

// Pure insert logic mirrored from EditorLayout.handleClipInsert
function insertScene(timeline: Timeline, position: number, newScene: Scene): Timeline {
  const scenes = [...(timeline.scenes ?? [])];
  scenes.splice(position, 0, newScene);
  const reordered = scenes.map((s, i) => ({ ...s, order: i }));
  const totalDuration = parseFloat(
    reordered.reduce((sum, s) => sum + s.duration, 0).toFixed(3)
  );
  return { ...timeline, scenes: reordered, totalDuration };
}

function makeScene(id: string, order: number, duration = 5): Scene {
  return {
    id,
    order,
    label: `Scene ${id}`,
    duration,
    transition: { type: "cut", duration: 0 },
    captions: [],
    overlays: [],
    mood: "luxury",
    motionStyle: "static",
  };
}

const BASE_TIMELINE: Timeline = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Test Timeline",
  brandWorkspaceId: "ws-1",
  createdAt: "2026-06-16T00:00:00.000Z",
  updatedAt: "2026-06-16T00:00:00.000Z",
  totalDuration: 15,
  aspectRatio: "9:16",
  scenes: [
    makeScene("a", 0, 3),
    makeScene("b", 1, 5),
    makeScene("c", 2, 7),
  ],
  audioLayers: [],
  isLocked: false,
};

describe("Insert clip between timeline scenes", () => {
  const newScene = makeScene("NEW", 99, 4);

  it("inserts at position 0 (before first clip)", () => {
    const result = insertScene(BASE_TIMELINE, 0, newScene);
    expect(result.scenes[0].id).toBe("NEW");
    expect(result.scenes[1].id).toBe("a");
  });

  it("inserts at position 1 (between a and b)", () => {
    const result = insertScene(BASE_TIMELINE, 1, newScene);
    expect(result.scenes.map((s) => s.id)).toEqual(["a", "NEW", "b", "c"]);
  });

  it("inserts at last position (after all scenes)", () => {
    const result = insertScene(BASE_TIMELINE, 3, newScene);
    expect(result.scenes[3].id).toBe("NEW");
  });

  it("total scene count increases by 1", () => {
    const result = insertScene(BASE_TIMELINE, 1, newScene);
    expect(result.scenes).toHaveLength(4);
  });

  it("re-indexes order fields after insert", () => {
    const result = insertScene(BASE_TIMELINE, 1, newScene);
    expect(result.scenes.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it("totalDuration adds the new scene's duration", () => {
    const result = insertScene(BASE_TIMELINE, 0, newScene);
    expect(result.totalDuration).toBeCloseTo(15 + 4, 3);
  });

  it("existing scene durations are not changed", () => {
    const result = insertScene(BASE_TIMELINE, 1, newScene);
    expect(result.scenes.find((s) => s.id === "a")!.duration).toBe(3);
    expect(result.scenes.find((s) => s.id === "b")!.duration).toBe(5);
  });

  it("inserting image scene (no video clip) works correctly", () => {
    const imgScene = makeScene("IMG", 99, 3);
    imgScene.clipType = "image";
    const result = insertScene(BASE_TIMELINE, 2, imgScene);
    expect(result.scenes[2].clipType).toBe("image");
    expect(result.scenes[2].id).toBe("IMG");
  });

  it("multiple inserts stack correctly", () => {
    const s1 = makeScene("X", 99, 2);
    const s2 = makeScene("Y", 99, 3);
    let result = insertScene(BASE_TIMELINE, 1, s1);
    result = insertScene(result, 2, s2);
    expect(result.scenes.map((s) => s.id)).toEqual(["a", "X", "Y", "b", "c"]);
    expect(result.scenes.map((s) => s.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it("inserting into empty timeline works", () => {
    const empty: Timeline = { ...BASE_TIMELINE, scenes: [], totalDuration: 0 };
    const result = insertScene(empty, 0, newScene);
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].id).toBe("NEW");
    expect(result.totalDuration).toBeCloseTo(4, 3);
  });
});
