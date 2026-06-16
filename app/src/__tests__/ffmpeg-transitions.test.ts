/**
 * Tests for transition type → FFmpeg xfade name (toXfadeType)
 * and aspect ratio → output dimensions (ratioDimensions)
 *
 * Features: per-clip transitions in UI and FFmpeg export, aspect ratios
 */
import { describe, it, expect } from "vitest";
import { toXfadeType, ratioDimensions } from "@/lib/ffmpeg-render";

// ── toXfadeType ──────────────────────────────────────────────────────────────

describe("toXfadeType — transition type → FFmpeg xfade name", () => {
  it('maps "fade" to "fade"', () => {
    expect(toXfadeType("fade")).toBe("fade");
  });

  it('maps "cinematic-fade" to "fade"', () => {
    expect(toXfadeType("cinematic-fade")).toBe("fade");
  });

  it('maps "dissolve" to "dissolve"', () => {
    expect(toXfadeType("dissolve")).toBe("dissolve");
  });

  it('maps "wipe-left" to "wipeleft"', () => {
    expect(toXfadeType("wipe-left")).toBe("wipeleft");
  });

  it('maps "wipe-right" to "wiperight"', () => {
    expect(toXfadeType("wipe-right")).toBe("wiperight");
  });

  it('maps "slide-left" to "slideleft"', () => {
    expect(toXfadeType("slide-left")).toBe("slideleft");
  });

  it('maps "slide-right" to "slideright"', () => {
    expect(toXfadeType("slide-right")).toBe("slideright");
  });

  it('maps "zoom-in" to "zoomin"', () => {
    expect(toXfadeType("zoom-in")).toBe("zoomin");
  });

  it('maps "zoom-out" to a non-empty fallback', () => {
    expect(toXfadeType("zoom-out")).not.toBe("");
  });

  it('maps "cut" to empty string (no xfade)', () => {
    expect(toXfadeType("cut")).toBe("");
  });

  it("returns empty string for unknown transition type", () => {
    expect(toXfadeType("unknown-type")).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toXfadeType("")).toBe("");
  });

  it("all supported transition types produce non-empty xfade name", () => {
    const supported = ["fade", "cinematic-fade", "dissolve", "wipe-left", "wipe-right", "slide-left", "slide-right", "zoom-in", "zoom-out"];
    for (const t of supported) {
      expect(toXfadeType(t), `Expected non-empty xfade for "${t}"`).not.toBe("");
    }
  });
});

// ── ratioDimensions ──────────────────────────────────────────────────────────

describe("ratioDimensions — aspect ratio → output pixel dimensions", () => {
  it("16:9 → 1920×1080 (landscape)", () => {
    expect(ratioDimensions("16:9")).toEqual([1920, 1080]);
  });

  it("1:1 → 1080×1080 (square)", () => {
    expect(ratioDimensions("1:1")).toEqual([1080, 1080]);
  });

  it("4:5 → 1080×1350 (portrait short)", () => {
    expect(ratioDimensions("4:5")).toEqual([1080, 1350]);
  });

  it("3:4 → 1080×1440 (portrait medium)", () => {
    expect(ratioDimensions("3:4")).toEqual([1080, 1440]);
  });

  it("9:16 (default) → 1080×1920 (full portrait)", () => {
    expect(ratioDimensions("9:16")).toEqual([1080, 1920]);
  });

  it("unknown ratio falls back to 1080×1920", () => {
    expect(ratioDimensions("2:3")).toEqual([1080, 1920]);
  });

  it("empty string falls back to 1080×1920", () => {
    expect(ratioDimensions("")).toEqual([1080, 1920]);
  });

  it("all returned dimensions are positive integers", () => {
    for (const ratio of ["16:9", "1:1", "4:5", "3:4", "9:16"]) {
      const [w, h] = ratioDimensions(ratio);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
    }
  });
});
