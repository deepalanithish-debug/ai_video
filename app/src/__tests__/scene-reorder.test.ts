/**
 * Tests for drag-to-reorder scenes in the timeline.
 *
 * The handleScenesReorder logic is: splice the moved scene out, insert it
 * at the target index, then re-index every scene's `order` field.
 * This is extracted here as a pure function to test it without React state.
 */
import { describe, it, expect } from "vitest";
import type { Scene } from "@/types/timeline";

// Pure reorder logic mirrored from EditorLayout.handleScenesReorder
function reorderScenes(scenes: Scene[], fromIdx: number, toIdx: number): Scene[] {
  const copy = [...scenes];
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy.map((s, i) => ({ ...s, order: i }));
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

const SCENES = [
  makeScene("a", 0, 3),
  makeScene("b", 1, 5),
  makeScene("c", 2, 4),
  makeScene("d", 3, 6),
];

describe("Scene drag-to-reorder", () => {
  it("moves a scene from index 0 to index 2", () => {
    const result = reorderScenes(SCENES, 0, 2);
    expect(result.map((s) => s.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves last scene to first position", () => {
    const result = reorderScenes(SCENES, 3, 0);
    expect(result.map((s) => s.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("moves first scene to last position", () => {
    const result = reorderScenes(SCENES, 0, 3);
    expect(result.map((s) => s.id)).toEqual(["b", "c", "d", "a"]);
  });

  it("moves adjacent scene forward by one", () => {
    const result = reorderScenes(SCENES, 1, 2);
    expect(result.map((s) => s.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("re-indexes order fields after reorder (0, 1, 2, 3 ...)", () => {
    const result = reorderScenes(SCENES, 2, 0);
    expect(result.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it("scene at index 0 always has order = 0 after reorder", () => {
    const result = reorderScenes(SCENES, 3, 0);
    expect(result[0].order).toBe(0);
  });

  it("preserves scene durations through reorder", () => {
    const result = reorderScenes(SCENES, 0, 3);
    expect(result.find((s) => s.id === "a")!.duration).toBe(3);
    expect(result.find((s) => s.id === "b")!.duration).toBe(5);
  });

  it("does nothing meaningful when fromIdx equals toIdx (same position)", () => {
    const result = reorderScenes(SCENES, 1, 1);
    expect(result.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("works with a two-scene timeline (swap)", () => {
    const two = [makeScene("x", 0), makeScene("y", 1)];
    const result = reorderScenes(two, 0, 1);
    expect(result.map((s) => s.id)).toEqual(["y", "x"]);
  });

  it("works with single scene (no-op)", () => {
    const one = [makeScene("solo", 0)];
    const result = reorderScenes(one, 0, 0);
    expect(result.map((s) => s.id)).toEqual(["solo"]);
  });
});
