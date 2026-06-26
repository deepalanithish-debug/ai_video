import { describe, it, expect } from "vitest";

// ── Inline helper copies (testing pure logic independently) ──────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function calcDims(ar: string, maxW: number, maxH: number): { w: number; h: number } {
  const RATIOS: Record<string, [number, number]> = {
    "9:16": [9, 16], "16:9": [16, 9], "1:1": [1, 1], "4:5": [4, 5], "3:4": [3, 4],
  };
  const [rw, rh] = RATIOS[ar] ?? [1, 1];
  let w = maxW, h = (maxW / rw) * rh;
  if (h > maxH) { h = maxH; w = (maxH / rh) * rw; }
  return { w: Math.floor(w), h: Math.floor(h) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats seconds < 60", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats seconds >= 60", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(3600)).toBe("60:00");
  });
});

describe("formatSize", () => {
  it("formats bytes to KB", () => {
    expect(formatSize(512 * 1024)).toBe("512 KB");
  });

  it("formats bytes to MB", () => {
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});

describe("timeAgo", () => {
  it("returns 'Just now' for very recent times", () => {
    expect(timeAgo(new Date().toISOString())).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const t = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("10m ago");
  });

  it("returns hours ago", () => {
    const t = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("3h ago");
  });

  it("returns days ago for recent dates", () => {
    const t = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("2d ago");
  });
});

describe("calcDims — aspect ratio canvas calculator", () => {
  it("fits 9:16 vertically into container", () => {
    const { w, h } = calcDims("9:16", 360, 640);
    expect(h / w).toBeCloseTo(16 / 9, 2);
    expect(h).toBeLessThanOrEqual(640);
    expect(w).toBeLessThanOrEqual(360);
  });

  it("fits 16:9 horizontally into container", () => {
    const { w, h } = calcDims("16:9", 800, 400);
    expect(w / h).toBeCloseTo(16 / 9, 1);
    expect(w).toBeLessThanOrEqual(800);
    expect(h).toBeLessThanOrEqual(400);
  });

  it("fits 1:1 into a square container", () => {
    const { w, h } = calcDims("1:1", 400, 400);
    expect(w).toBe(400);
    expect(h).toBe(400);
  });

  it("constrained by height when container is wider", () => {
    const { w, h } = calcDims("9:16", 1000, 500);
    expect(h).toBe(500);
    expect(w).toBe(Math.floor((500 / 16) * 9));
  });
});

describe("clamp utility", () => {
  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles equal min/max", () => {
    expect(clamp(100, 5, 5)).toBe(5);
  });
});

describe("template total duration", () => {
  it("calculates correct total from scene durations", () => {
    const scenes = [
      { duration: 3 }, { duration: 4 }, { duration: 3 }, { duration: 4 }, { duration: 3 },
    ];
    const total = scenes.reduce((sum, s) => sum + s.duration, 0);
    expect(total).toBe(17);
  });
});
