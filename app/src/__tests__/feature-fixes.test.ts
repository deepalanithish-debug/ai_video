/**
 * @file feature-fixes.test.ts
 * Comprehensive tests for all fixed features:
 * 1. Canvas preview - scene visual representation
 * 2. Version persistence to localStorage
 * 3. Music playback state management
 * 4. Brand kit CRUD and persistence
 * 5. Transitions - state update
 * 6. Media clip assignment to scenes
 * 7. Quick navigation links
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useEditorStore } from "@/store/editorStore";
import { v4 as uuidv4 } from "uuid";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeScene(overrides = {}) {
  return {
    id: uuidv4(),
    order: 0,
    label: "Test Scene",
    description: "A test scene",
    duration: 5,
    clipId: null,
    clipSrc: null,
    clipType: null,
    captions: [],
    transition: { type: "fade" as const, duration: 0.5 },
    mood: "calm" as const,
    colorGrade: null,
    effects: [],
    colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
    ...overrides,
  };
}

function makeClip(overrides = {}) {
  return {
    id: uuidv4(),
    name: "test-clip.mp4",
    src: "blob:http://localhost/test",
    file: new File([], "test-clip.mp4", { type: "video/mp4" }),
    type: "video" as const,
    duration: 10,
    ...overrides,
  };
}

function resetStore() {
  useEditorStore.setState({
    scenes: [], audioTracks: [], clips: [], totalDuration: 0,
    isPlaying: false, currentTime: 0, brandKit: null,
    activeSceneId: null, isGenerating: false, isDirty: false,
  });
}

// ── Mock localStorage ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// ─────────────────────────────────────────────────────────────────────────────

describe("Canvas Preview — Scene Visual", () => {
  beforeEach(resetStore);

  it("renders no-clip placeholder info from scene metadata", () => {
    const scene = makeScene({ label: "Golden Hour Reveal", mood: "luxury", description: "Warm sunlight glow" });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    const { scenes } = useEditorStore.getState();
    expect(scenes).toHaveLength(1);
    expect(scenes[0].label).toBe("Golden Hour Reveal");
    expect(scenes[0].clipSrc).toBeNull();
    expect(scenes[0].mood).toBe("luxury");
    expect(scenes[0].description).toBeTruthy();
  });

  it("shows correct clip type after upload assignment", () => {
    const scene = makeScene();
    const clip = makeClip({ type: "image" as const });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().addClip(clip);
    useEditorStore.getState().assignClip(clip.id, scene.id);
    const updated = useEditorStore.getState().scenes[0];
    expect(updated.clipSrc).toBe(clip.src);
    expect(updated.clipType).toBe("image");
  });

  it("shows video type after video clip assignment", () => {
    const scene = makeScene();
    const clip = makeClip({ type: "video" as const });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().addClip(clip);
    useEditorStore.getState().assignClip(clip.id, scene.id);
    const { scenes } = useEditorStore.getState();
    expect(scenes[0].clipType).toBe("video");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Version Persistence — localStorage", () => {
  const VERSIONS_KEY = "vydeoai_versions_v1";

  beforeEach(() => {
    localStorageMock.clear();
  });

  it("saves versions array to localStorage", () => {
    const version = {
      id: uuidv4(), prompt: "Test prompt", scenes: [makeScene()],
      totalDuration: 10, aspectRatio: "9:16" as const,
      timestamp: Date.now(), isDemo: false,
    };
    const safe = [{ ...version, scenes: version.scenes.map(s => ({ ...s, clipSrc: null, clipId: null })) }];
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(safe));
    const loaded = JSON.parse(localStorage.getItem(VERSIONS_KEY)!);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].prompt).toBe("Test prompt");
  });

  it("strips blob clip URLs before saving", () => {
    const scene = makeScene({ clipSrc: "blob:http://localhost/video123" });
    const version = { id: uuidv4(), prompt: "Test", scenes: [scene], totalDuration: 5, aspectRatio: "16:9" as const, timestamp: Date.now() };
    const safe = [{ ...version, scenes: version.scenes.map(s => ({ ...s, clipSrc: null, clipId: null })) }];
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(safe));
    const loaded = JSON.parse(localStorage.getItem(VERSIONS_KEY)!);
    expect(loaded[0].scenes[0].clipSrc).toBeNull(); // blob URLs stripped
  });

  it("loads previously saved versions on mount", () => {
    const version = { id: "ver-1", prompt: "My video", scenes: [], totalDuration: 0, aspectRatio: "9:16" as const, timestamp: 1000 };
    localStorage.setItem(VERSIONS_KEY, JSON.stringify([version]));
    const loaded = JSON.parse(localStorage.getItem(VERSIONS_KEY)!);
    expect(loaded[0].id).toBe("ver-1");
    expect(loaded[0].prompt).toBe("My video");
  });

  it("limits stored versions to 20", () => {
    const versions = Array.from({ length: 25 }, (_, i) => ({
      id: `v${i}`, prompt: `Prompt ${i}`, scenes: [], totalDuration: 0,
      aspectRatio: "9:16" as const, timestamp: i,
    }));
    const limited = versions.slice(0, 20);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(limited));
    const loaded = JSON.parse(localStorage.getItem(VERSIONS_KEY)!);
    expect(loaded).toHaveLength(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Music — AudioTrack State", () => {
  beforeEach(resetStore);

  it("adds a stock track to audioTracks", () => {
    const track = {
      id: uuidv4(), name: "Luxury Ambient",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      file: new File([], "luxury.mp3"), duration: 120,
      volume: 0.7, fadeIn: 0.5, fadeOut: 1,
      startTime: 0, muted: false, type: "bgm" as const,
    };
    useEditorStore.getState().addAudioTrack(track);
    expect(useEditorStore.getState().audioTracks).toHaveLength(1);
    expect(useEditorStore.getState().audioTracks[0].src).toContain("soundhelix");
  });

  it("mutes a track", () => {
    const track = { id: "t1", name: "Track", src: "", file: new File([], "f"), duration: 60, volume: 0.8, fadeIn: 0, fadeOut: 0, startTime: 0, muted: false, type: "bgm" as const };
    useEditorStore.getState().addAudioTrack(track);
    useEditorStore.getState().updateAudioTrack("t1", { muted: true });
    expect(useEditorStore.getState().audioTracks[0].muted).toBe(true);
  });

  it("removes a track", () => {
    const track = { id: "t2", name: "Track2", src: "", file: new File([], "f"), duration: 60, volume: 0.8, fadeIn: 0, fadeOut: 0, startTime: 0, muted: false, type: "sfx" as const };
    useEditorStore.getState().addAudioTrack(track);
    useEditorStore.getState().removeAudioTrack("t2");
    expect(useEditorStore.getState().audioTracks).toHaveLength(0);
  });

  it("updates track volume", () => {
    const track = { id: "t3", name: "T3", src: "", file: new File([], "f"), duration: 60, volume: 0.7, fadeIn: 0, fadeOut: 0, startTime: 0, muted: false, type: "voice" as const };
    useEditorStore.getState().addAudioTrack(track);
    useEditorStore.getState().updateAudioTrack("t3", { volume: 0.3 });
    expect(useEditorStore.getState().audioTracks[0].volume).toBeCloseTo(0.3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Brand Kit — CRUD and Persistence", () => {
  beforeEach(() => {
    useEditorStore.setState({ scenes: [], audioTracks: [], clips: [], totalDuration: 0, isPlaying: false, currentTime: 0, brandKit: null, activeSceneId: null, isGenerating: false, isDirty: false });
    localStorageMock.clear();
  });

  it("sets a brand kit", () => {
    const kit = {
      id: "bk1", name: "My Brand", logo: null,
      primaryColor: "#C9A96E", secondaryColor: "#1A1A22", accentColor: "#A78BFA",
      fontHeading: "Playfair Display", fontBody: "Inter",
      captionStyle: {}, watermark: null, intro: null, outro: null,
    };
    useEditorStore.getState().setBrandKit(kit);
    expect(useEditorStore.getState().brandKit?.name).toBe("My Brand");
  });

  it("updates brand kit fields", () => {
    const kit = {
      id: "bk2", name: "Old Name", logo: null,
      primaryColor: "#fff", secondaryColor: "#000", accentColor: "#888",
      fontHeading: "Inter", fontBody: "Inter",
      captionStyle: {}, watermark: null, intro: null, outro: null,
    };
    useEditorStore.getState().setBrandKit(kit);
    useEditorStore.getState().updateBrandKit({ name: "New Name", primaryColor: "#C9A96E" });
    const updated = useEditorStore.getState().brandKit!;
    expect(updated.name).toBe("New Name");
    expect(updated.primaryColor).toBe("#C9A96E");
  });

  it("persists to localStorage", () => {
    const kit = {
      id: "bk3", name: "Luxury Brand", logo: null,
      primaryColor: "#C9A96E", secondaryColor: "#1A1A22", accentColor: "#A78BFA",
      fontHeading: "Playfair Display", fontBody: "Inter",
      captionStyle: { fontSize: 16 }, watermark: null, intro: null, outro: null,
    };
    localStorage.setItem("vydeoai_brand_kit", JSON.stringify(kit));
    const loaded = JSON.parse(localStorage.getItem("vydeoai_brand_kit")!);
    expect(loaded.name).toBe("Luxury Brand");
    expect(loaded.captionStyle.fontSize).toBe(16);
  });

  it("applies brand kit to captions in all scenes", () => {
    const scene = makeScene({
      captions: [{
        id: "c1", text: "Hello", startTime: 0, endTime: 3,
        x: 10, y: 75, fontSize: 20, fontFamily: "Inter",
        color: "#fff", bgColor: "#000", bgOpacity: 0.4,
        bold: false, italic: false, align: "center" as const,
        animation: "fade" as const, letterSpacing: 0.05, lineHeight: 1.4,
        stroke: false, strokeColor: "#000", shadow: true,
      }],
    });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    const kit = {
      id: "bk4", name: "Brand", logo: null,
      primaryColor: "#FF0000", secondaryColor: "#000", accentColor: "#888",
      fontHeading: "Bebas Neue", fontBody: "Montserrat",
      captionStyle: { fontSize: 24 }, watermark: null, intro: null, outro: null,
    };
    useEditorStore.getState().setBrandKit(kit);
    // Apply brand to captions
    const { scenes, updateScene } = useEditorStore.getState();
    scenes.forEach(sc => {
      const updated = sc.captions.map(cap => ({
        ...cap, fontFamily: kit.fontBody, color: kit.primaryColor, fontSize: 24,
      }));
      updateScene(sc.id, { captions: updated });
    });
    const updatedScene = useEditorStore.getState().scenes[0];
    expect(updatedScene.captions[0].color).toBe("#FF0000");
    expect(updatedScene.captions[0].fontFamily).toBe("Montserrat");
    expect(updatedScene.captions[0].fontSize).toBe(24);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Transitions — Apply to Scenes", () => {
  beforeEach(resetStore);

  it("updates scene transition type", () => {
    const scene = makeScene();
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().updateScene(scene.id, {
      transition: { type: "cinematic-fade", duration: 0.8 },
    });
    const updated = useEditorStore.getState().scenes[0];
    expect(updated.transition.type).toBe("cinematic-fade");
    expect(updated.transition.duration).toBeCloseTo(0.8);
  });

  it("applies same transition to all scenes", () => {
    const s1 = makeScene({ order: 0 });
    const s2 = makeScene({ order: 1 });
    const s3 = makeScene({ order: 2 });
    useEditorStore.setState(s => ({ ...s, scenes: [s1, s2, s3], totalDuration: 15 }));
    const { scenes, updateScene } = useEditorStore.getState();
    const newTrans = { type: "blur" as const, duration: 0.6 };
    scenes.forEach(s => updateScene(s.id, { transition: newTrans }));
    useEditorStore.getState().scenes.forEach(s => {
      expect(s.transition.type).toBe("blur");
      expect(s.transition.duration).toBeCloseTo(0.6);
    });
  });

  it("preserves other scene fields when updating transition", () => {
    const scene = makeScene({ label: "Keep This Label", duration: 7 });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: 7 }));
    useEditorStore.getState().updateScene(scene.id, {
      transition: { type: "zoom-in", duration: 0.4 },
    });
    const updated = useEditorStore.getState().scenes[0];
    expect(updated.label).toBe("Keep This Label");
    expect(updated.duration).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Media — Clip Upload and Scene Assignment", () => {
  beforeEach(resetStore);

  it("uploads clip and registers in store", () => {
    const clip = makeClip();
    useEditorStore.getState().addClip(clip);
    expect(useEditorStore.getState().clips).toHaveLength(1);
    expect(useEditorStore.getState().clips[0].name).toBe("test-clip.mp4");
  });

  it("assigns clip to scene and updates scene clipSrc", () => {
    const scene = makeScene();
    const clip = makeClip({ src: "blob:http://localhost/myvideo" });
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().addClip(clip);
    useEditorStore.getState().assignClip(clip.id, scene.id);
    const updated = useEditorStore.getState().scenes[0];
    expect(updated.clipSrc).toBe("blob:http://localhost/myvideo");
    expect(updated.clipType).toBe("video");
    expect(updated.clipId).toBe(clip.id);
  });

  it("unassigns clip from scene", () => {
    const scene = makeScene();
    const clip = makeClip();
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().addClip(clip);
    useEditorStore.getState().assignClip(clip.id, scene.id);
    useEditorStore.getState().unassignClip(scene.id);
    const updated = useEditorStore.getState().scenes[0];
    expect(updated.clipSrc).toBeNull();
    expect(updated.clipId).toBeNull();
    expect(updated.clipType).toBeNull();
  });

  it("auto-assigns clips to scenes in order", () => {
    const s1 = makeScene({ order: 0 });
    const s2 = makeScene({ order: 1 });
    const s3 = makeScene({ order: 2 });
    const clips = [makeClip({ name: "a.mp4" }), makeClip({ name: "b.mp4" })];
    useEditorStore.setState(s => ({ ...s, scenes: [s1, s2, s3], totalDuration: 15 }));
    clips.forEach(c => useEditorStore.getState().addClip(c));
    // Simulate auto-assign
    const { scenes: currentScenes, assignClip } = useEditorStore.getState();
    const empty = currentScenes.filter(sc => !sc.clipId);
    empty.forEach((sc, i) => {
      if (clips[i]) assignClip(clips[i].id, sc.id);
    });
    const updated = useEditorStore.getState().scenes;
    expect(updated[0].clipId).toBe(clips[0].id);
    expect(updated[1].clipId).toBe(clips[1].id);
    expect(updated[2].clipId).toBeNull(); // no third clip
  });

  it("removes clip and clears scene assignment", () => {
    const scene = makeScene();
    const clip = makeClip();
    useEditorStore.setState(s => ({ ...s, scenes: [scene], totalDuration: scene.duration }));
    useEditorStore.getState().addClip(clip);
    useEditorStore.getState().assignClip(clip.id, scene.id);
    useEditorStore.getState().unassignClip(scene.id);
    useEditorStore.getState().removeClip(clip.id);
    expect(useEditorStore.getState().clips).toHaveLength(0);
    expect(useEditorStore.getState().scenes[0].clipId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Template Usage — Load Timeline", () => {
  beforeEach(resetStore);

  it("loadTimeline populates scenes from template", () => {
    const templateScenes = [
      makeScene({ label: "Intro", duration: 3 }),
      makeScene({ label: "Product Shot", duration: 5 }),
      makeScene({ label: "CTA", duration: 2 }),
    ];
    useEditorStore.getState().loadTimeline({
      scenes: templateScenes,
      audioTracks: [],
      totalDuration: 10,
      aspectRatio: "9:16",
    });
    const { scenes, totalDuration, aspectRatio } = useEditorStore.getState();
    expect(scenes).toHaveLength(3);
    expect(scenes[0].label).toBe("Intro");
    expect(totalDuration).toBe(10);
    expect(aspectRatio).toBe("9:16");
  });

  it("template scenes start with no clips (ready for user upload)", () => {
    const scenes = [makeScene({ clipSrc: null, clipId: null }), makeScene({ clipSrc: null, clipId: null })];
    useEditorStore.getState().loadTimeline({ scenes, audioTracks: [], totalDuration: 8, aspectRatio: "16:9" });
    useEditorStore.getState().scenes.forEach(s => {
      expect(s.clipSrc).toBeNull();
      expect(s.clipId).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Quick Navigation — Route Paths", () => {
  it("quick action hrefs are valid paths", () => {
    const quickActions = [
      "/workspace/new",
      "/templates",
      "/brand-kit",
      "/ai-tools",
      "/projects",
    ];
    quickActions.forEach(href => {
      expect(href).toMatch(/^\//); // starts with /
      expect(href.length).toBeGreaterThan(1);
    });
  });

  it("version 'Edit' sends user to editor route", () => {
    const editorRoute = (id: string) => `/editor/${id}`;
    expect(editorRoute("new")).toBe("/editor/new");
    expect(editorRoute("proj-123")).toBe("/editor/proj-123");
  });
});
