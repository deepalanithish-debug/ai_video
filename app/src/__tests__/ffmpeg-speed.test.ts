/**
 * Tests for playback speed → FFmpeg atempo chain (buildAtempoChain)
 * Feature: prompt-driven speed (2x, 0.5x etc.)
 * FFmpeg atempo only accepts values in [0.5, 2.0] per node, so extreme speeds
 * must be chained.
 */
import { describe, it, expect } from "vitest";
import { buildAtempoChain } from "@/lib/ffmpeg-render";

describe("buildAtempoChain — speed → FFmpeg atempo filter chain", () => {
  it("1x speed returns single atempo=1", () => {
    const result = buildAtempoChain(1);
    expect(result).toBe("atempo=1.000000");
  });

  it("2x speed returns single atempo=2 (boundary, no chaining needed)", () => {
    const result = buildAtempoChain(2);
    // should NOT start with another atempo=2.0, followed by remainder — just one node
    expect(result).toBe("atempo=2.000000");
  });

  it("0.5x speed returns single atempo=0.5 (boundary, no chaining needed)", () => {
    const result = buildAtempoChain(0.5);
    expect(result).toBe("atempo=0.500000");
  });

  it("4x speed chains two nodes: atempo=2.0,atempo=2.0", () => {
    const result = buildAtempoChain(4);
    expect(result).toContain("atempo=2.0,");
    const nodeCount = result.split(",").length;
    expect(nodeCount).toBe(2);
    // Each node doubles speed → 2 × 2 = 4
    expect(result).toMatch(/atempo=2\.0,atempo=2\.000000/);
  });

  it("8x speed chains three nodes (2 × 2 × 2)", () => {
    const result = buildAtempoChain(8);
    const nodeCount = result.split(",").length;
    expect(nodeCount).toBe(3);
  });

  it("0.25x speed chains two slow-down nodes", () => {
    const result = buildAtempoChain(0.25);
    expect(result).toContain("atempo=0.5,");
    const nodeCount = result.split(",").length;
    expect(nodeCount).toBe(2);
  });

  it("0.125x speed chains three slow-down nodes", () => {
    const result = buildAtempoChain(0.125);
    const nodeCount = result.split(",").length;
    expect(nodeCount).toBe(3);
  });

  it("1.5x speed (within range) returns single node", () => {
    const result = buildAtempoChain(1.5);
    expect(result).toBe("atempo=1.500000");
  });

  it("all nodes in chain are valid atempo values (0.5 ≤ v ≤ 2.0)", () => {
    for (const speed of [0.25, 0.5, 1, 1.5, 2, 4, 8, 16]) {
      const chain = buildAtempoChain(speed);
      const values = chain.split(",").map((node) => {
        const m = node.match(/atempo=([0-9.]+)/);
        return m ? parseFloat(m[1]) : null;
      });
      for (const v of values) {
        expect(v).not.toBeNull();
        expect(v!).toBeGreaterThanOrEqual(0.5 - 1e-6);
        expect(v!).toBeLessThanOrEqual(2.0 + 1e-6);
      }
    }
  });
});
