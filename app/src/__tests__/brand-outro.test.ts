import { describe, it, expect } from "vitest";
import { DEFAULT_OUTRO, OUTRO_PRESETS, type OutroTemplate } from "@/types/outro";

describe("OutroTemplate defaults", () => {
  it("DEFAULT_OUTRO has required fields (id/name are omitted by design)", () => {
    // DEFAULT_OUTRO is typed as Omit<OutroTemplate, "id" | "name">
    expect(DEFAULT_OUTRO.duration).toBeGreaterThan(0);
    expect(DEFAULT_OUTRO.backgroundColor).toBeTruthy();
    expect(DEFAULT_OUTRO.brandName).toBeTruthy();
  });

  it("DEFAULT_OUTRO logo is enabled by default", () => {
    expect(DEFAULT_OUTRO.logoEnabled).toBe(true);
  });

  it("DEFAULT_OUTRO has valid anim duration", () => {
    expect(DEFAULT_OUTRO.animDuration).toBeGreaterThan(0);
    expect(DEFAULT_OUTRO.animDuration).toBeLessThanOrEqual(DEFAULT_OUTRO.duration);
  });
});

describe("OUTRO_PRESETS", () => {
  it("has at least 2 presets", () => {
    expect(OUTRO_PRESETS.length).toBeGreaterThanOrEqual(2);
  });

  it("all presets have unique ids", () => {
    const ids = OUTRO_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all presets have valid duration", () => {
    for (const preset of OUTRO_PRESETS) {
      expect(preset.duration).toBeGreaterThan(0);
      expect(preset.duration).toBeLessThanOrEqual(30);
    }
  });

  it("all presets have valid backgroundColor", () => {
    for (const preset of OUTRO_PRESETS) {
      expect(preset.backgroundColor).toMatch(/^#[0-9a-fA-F]{3,8}$|^rgba?\(/);
    }
  });

  it("all presets have normalized logo positions", () => {
    for (const preset of OUTRO_PRESETS) {
      expect(preset.logoX).toBeGreaterThanOrEqual(0);
      expect(preset.logoX).toBeLessThanOrEqual(1);
      expect(preset.logoY).toBeGreaterThanOrEqual(0);
      expect(preset.logoY).toBeLessThanOrEqual(1);
    }
  });
});

describe("OutroTemplate mutations", () => {
  it("patch merges correctly", () => {
    const base: OutroTemplate = { ...DEFAULT_OUTRO };
    const patch: Partial<OutroTemplate> = { brandName: "New Brand", duration: 6 };
    const merged = { ...base, ...patch };
    expect(merged.brandName).toBe("New Brand");
    expect(merged.duration).toBe(6);
    expect(merged.backgroundColor).toBe(DEFAULT_OUTRO.backgroundColor);
  });

  it("can toggle logo off", () => {
    const outro = { ...DEFAULT_OUTRO, logoEnabled: false };
    expect(outro.logoEnabled).toBe(false);
  });

  it("can apply a preset by spreading", () => {
    const preset = OUTRO_PRESETS[0];
    const applied: OutroTemplate = { ...DEFAULT_OUTRO, ...preset };
    expect(applied.id).toBe(preset.id);
    expect(applied.name).toBe(preset.name);
  });
});

describe("outro animation progress calculation", () => {
  it("progress goes from 0 to 1 over animDuration", () => {
    const animDuration = 1.5;
    const getProgress = (sceneTime: number) => Math.min(1, Math.max(0, sceneTime / animDuration));
    expect(getProgress(0)).toBe(0);
    expect(getProgress(animDuration / 2)).toBeCloseTo(0.5);
    expect(getProgress(animDuration)).toBe(1);
    expect(getProgress(animDuration + 1)).toBe(1); // clamped
    expect(getProgress(-1)).toBe(0); // clamped
  });

  it("text progress respects entranceDelay", () => {
    const animDuration = 2;
    const entranceDelay = 0.5;
    const getTextProgress = (sceneTime: number) =>
      Math.min(1, Math.max(0, (sceneTime - entranceDelay) / animDuration));
    expect(getTextProgress(0)).toBe(0);
    expect(getTextProgress(entranceDelay)).toBe(0);
    expect(getTextProgress(entranceDelay + animDuration)).toBe(1);
  });
});
