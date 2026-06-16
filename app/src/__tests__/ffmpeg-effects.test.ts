/**
 * Tests for visual effects → FFmpeg vf filter mapping (effectToVfFilter)
 * Feature: apply any effect/filter mentioned in the prompt
 */
import { describe, it, expect } from "vitest";
import { effectToVfFilter } from "@/lib/ffmpeg-render";

describe("effectToVfFilter — visual effect → FFmpeg vf filter", () => {
  it("maps black-and-white to hue desaturate", () => {
    expect(effectToVfFilter("black-and-white")).toBe("hue=s=0");
  });

  it("maps grayscale (alias) to hue desaturate", () => {
    expect(effectToVfFilter("grayscale")).toBe("hue=s=0");
  });

  it("maps bw (shorthand) to hue desaturate", () => {
    expect(effectToVfFilter("bw")).toBe("hue=s=0");
  });

  it("maps sepia to colorchannelmixer", () => {
    const result = effectToVfFilter("sepia");
    expect(result).toContain("colorchannelmixer");
  });

  it("maps vintage (alias for sepia) to colorchannelmixer", () => {
    expect(effectToVfFilter("vintage")).toContain("colorchannelmixer");
  });

  it("maps warm to colorbalance with positive red shift", () => {
    const result = effectToVfFilter("warm");
    expect(result).toContain("colorbalance");
    expect(result).toContain("rs=0.15");
  });

  it("maps golden (alias for warm) to colorbalance", () => {
    expect(effectToVfFilter("golden")).toContain("colorbalance");
  });

  it("maps cool to colorbalance with positive blue shift", () => {
    const result = effectToVfFilter("cool");
    expect(result).toContain("colorbalance");
    expect(result).toContain("bs=0.2");
  });

  it("maps vignette to vignette filter", () => {
    expect(effectToVfFilter("vignette")).toContain("vignette");
  });

  it("maps blur to boxblur", () => {
    expect(effectToVfFilter("blur")).toContain("boxblur");
  });

  it("maps dreamy (alias for blur) to boxblur", () => {
    expect(effectToVfFilter("dreamy")).toContain("boxblur");
  });

  it("maps sharpen to unsharp filter", () => {
    expect(effectToVfFilter("sharpen")).toContain("unsharp");
  });

  it("maps crisp (alias for sharpen) to unsharp", () => {
    expect(effectToVfFilter("crisp")).toContain("unsharp");
  });

  it("maps cinematic to curves+colorbalance", () => {
    const result = effectToVfFilter("cinematic");
    expect(result).toContain("curves");
  });

  it("maps film (alias for cinematic) to curves", () => {
    expect(effectToVfFilter("film")).toContain("curves");
  });

  it("maps vibrant to eq with high saturation", () => {
    const result = effectToVfFilter("vibrant");
    expect(result).toContain("eq=saturation=1.4");
  });

  it("maps pop (alias for vibrant) to eq", () => {
    expect(effectToVfFilter("pop")).toContain("eq=saturation=1.4");
  });

  it("maps moody to eq with reduced brightness", () => {
    const result = effectToVfFilter("moody");
    expect(result).toContain("eq=brightness=-0.05");
  });

  it("maps dark (alias for moody) to eq", () => {
    expect(effectToVfFilter("dark")).toContain("eq=brightness=-0.05");
  });

  it("maps bright to eq with positive brightness", () => {
    const result = effectToVfFilter("bright");
    expect(result).toContain("eq=brightness=0.08");
  });

  it("returns empty string for unknown effect names", () => {
    expect(effectToVfFilter("unknown-effect-xyz")).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(effectToVfFilter("")).toBe("");
  });

  it("is case-insensitive (handles uppercase input)", () => {
    expect(effectToVfFilter("BLACK-AND-WHITE")).toBe("hue=s=0");
    expect(effectToVfFilter("SEPIA")).toContain("colorchannelmixer");
  });

  it("handles mixed case and spaces", () => {
    expect(effectToVfFilter("Black And White")).toBe("hue=s=0");
    expect(effectToVfFilter("Warm Golden")).toContain("colorbalance");
  });
});
