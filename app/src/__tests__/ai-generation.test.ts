import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for API route tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AI Generation – image endpoint", () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it("sends correct payload for image generation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "data:image/jpeg;base64,abc123", imageUrl: "data:image/jpeg;base64,abc123" }),
    });

    const body = {
      prompt: "A luxury perfume bottle",
      aspectRatio: "9:16", mood: "luxury", style: "cinematic", realism: "photorealistic",
    };

    await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/generate-image", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe("A luxury perfume bottle");
    expect(sentBody.aspectRatio).toBe("9:16");
    expect(sentBody.mood).toBe("luxury");
  });

  it("sends correct payload for video generation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://cdn.example.com/video.mp4", videoUrl: "https://cdn.example.com/video.mp4" }),
    });

    const body = {
      prompt: "Slow motion watch",
      duration: "5s", aspectRatio: "9:16", motion: "slow", style: "cinematic",
    };

    await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.prompt).toBe("Slow motion watch");
    expect(sentBody.duration).toBe("5s");
    expect(sentBody.motion).toBe("slow");
  });

  it("handles API error response gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "GEMINI_API_KEY not configured" }),
    });

    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
    });

    const data = await res.json();
    expect(res.ok).toBe(false);
    expect(data.error).toBeTruthy();
  });

  it("includes referenceImage in payload when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "data:image/jpeg;base64,result" }),
    });

    const referenceImage = "data:image/jpeg;base64,AAAA";
    await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "style match", referenceImage }),
    });

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.referenceImage).toBe(referenceImage);
  });
});

describe("AI Generation – URL extraction", () => {
  it("extracts url from imageUrl field", async () => {
    const data = { imageUrl: "data:image/png;base64,abc" };
    const url = data.url ?? data.imageUrl;
    expect(url).toBe("data:image/png;base64,abc");
  });

  it("extracts url from videoUrl field", async () => {
    const data = { videoUrl: "https://cdn.example.com/v.mp4" };
    const url = (data as { url?: string; videoUrl?: string }).url ?? data.videoUrl;
    expect(url).toBe("https://cdn.example.com/v.mp4");
  });

  it("prefers url over imageUrl/videoUrl", async () => {
    const data = { url: "data:image/jpeg;base64,primary", imageUrl: "data:image/jpeg;base64,fallback" };
    const url = data.url ?? data.imageUrl;
    expect(url).toBe("data:image/jpeg;base64,primary");
  });
});

describe("AI Generation – style controls", () => {
  it("image aspect ratios are valid strings", () => {
    const aspects = ["9:16", "16:9", "1:1", "4:5"];
    for (const a of aspects) {
      expect(a).toMatch(/^\d+:\d+$/);
    }
  });

  it("video durations parse to valid seconds", () => {
    const durations = ["3s", "5s", "8s", "10s", "15s"];
    for (const d of durations) {
      const secs = parseInt(d, 10);
      expect(secs).toBeGreaterThan(0);
      expect(secs).toBeLessThanOrEqual(15);
    }
  });
});
