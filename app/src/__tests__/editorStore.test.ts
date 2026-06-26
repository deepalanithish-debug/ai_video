import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "@/store/editorStore";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStore() {
  return useEditorStore.getState();
}

function resetStore() {
  // Reset to initial state by reinitialising
  useEditorStore.setState({
    projectId: null,
    projectName: "Untitled Project",
    aspectRatio: "9:16",
    scenes: [],
    audioTracks: [],
    totalDuration: 0,
    clips: [],
    isPlaying: false,
    currentTime: 0,
    isMuted: false,
    volume: 0.8,
    activeSceneId: null,
    leftTab: "media",
    inspectorTarget: null,
    isGenerating: false,
    isDemoMode: false,
    isDirty: false,
    zoom: 1,
    snapEnabled: true,
    brandKit: null,
    past: [],
    future: [],
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("editorStore — project", () => {
  beforeEach(resetStore);

  it("sets project name and marks dirty", () => {
    getStore().setProjectName("My Campaign");
    expect(getStore().projectName).toBe("My Campaign");
    expect(getStore().isDirty).toBe(true);
  });

  it("sets aspect ratio", () => {
    getStore().setAspectRatio("16:9");
    expect(getStore().aspectRatio).toBe("16:9");
  });
});

describe("editorStore — scenes", () => {
  beforeEach(resetStore);

  it("adds a scene", () => {
    getStore().addScene();
    expect(getStore().scenes).toHaveLength(1);
    expect(getStore().scenes[0].label).toBe("Scene 1");
  });

  it("removes a scene", () => {
    getStore().addScene();
    getStore().addScene();
    const id = getStore().scenes[0].id;
    getStore().removeScene(id);
    expect(getStore().scenes).toHaveLength(1);
  });

  it("updates a scene label", () => {
    getStore().addScene();
    const id = getStore().scenes[0].id;
    getStore().updateScene(id, { label: "Hero Shot" });
    expect(getStore().scenes[0].label).toBe("Hero Shot");
  });

  it("recalculates totalDuration when scene duration changes", () => {
    getStore().addScene();
    getStore().addScene();
    const ids = getStore().scenes.map(s => s.id);
    getStore().updateScene(ids[0], { duration: 5 });
    getStore().updateScene(ids[1], { duration: 3 });
    expect(getStore().totalDuration).toBe(8);
  });

  it("setScenes replaces all scenes", () => {
    getStore().addScene();
    const newScene = { id: "abc", order: 0, label: "Test", description: "", duration: 6, clipId: null, clipSrc: null, clipType: null, captions: [], transition: { type: "fade" as const, duration: 0.5 }, mood: "calm" as const, colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 } };
    getStore().setScenes([newScene]);
    expect(getStore().scenes).toHaveLength(1);
    expect(getStore().scenes[0].id).toBe("abc");
    expect(getStore().totalDuration).toBe(6);
  });

  it("reorders scenes", () => {
    getStore().setScenes([
      { id: "a", order: 0, label: "A", description: "", duration: 3, clipId: null, clipSrc: null, clipType: null, captions: [], transition: { type: "fade" as const, duration: 0.5 }, mood: "calm" as const, colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 } },
      { id: "b", order: 1, label: "B", description: "", duration: 3, clipId: null, clipSrc: null, clipType: null, captions: [], transition: { type: "fade" as const, duration: 0.5 }, mood: "calm" as const, colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 } },
    ]);
    getStore().reorderScene(0, 1); // move A after B
    expect(getStore().scenes[0].id).toBe("b");
    expect(getStore().scenes[1].id).toBe("a");
  });
});

describe("editorStore — captions", () => {
  beforeEach(resetStore);

  it("adds a caption to a scene", () => {
    getStore().addScene();
    const sceneId = getStore().scenes[0].id;
    getStore().addCaption(sceneId);
    expect(getStore().scenes[0].captions).toHaveLength(1);
    expect(getStore().scenes[0].captions[0].text).toBeTruthy();
  });

  it("updates a caption", () => {
    getStore().addScene();
    const sceneId = getStore().scenes[0].id;
    getStore().addCaption(sceneId);
    const capId = getStore().scenes[0].captions[0].id;
    getStore().updateCaption(sceneId, capId, { text: "Hello World" });
    expect(getStore().scenes[0].captions[0].text).toBe("Hello World");
  });

  it("removes a caption", () => {
    getStore().addScene();
    const sceneId = getStore().scenes[0].id;
    getStore().addCaption(sceneId);
    const capId = getStore().scenes[0].captions[0].id;
    getStore().removeCaption(sceneId, capId);
    expect(getStore().scenes[0].captions).toHaveLength(0);
  });
});

describe("editorStore — clips", () => {
  beforeEach(resetStore);

  it("adds a clip", () => {
    const clip = { id: "c1", name: "test.mp4", src: "blob:x", file: new File([], "test.mp4"), type: "video" as const, duration: 10 };
    getStore().addClip(clip);
    expect(getStore().clips).toHaveLength(1);
  });

  it("removes a clip", () => {
    const clip = { id: "c1", name: "test.mp4", src: "blob:x", file: new File([], "test.mp4"), type: "video" as const, duration: 10 };
    getStore().addClip(clip);
    getStore().removeClip("c1");
    expect(getStore().clips).toHaveLength(0);
  });

  it("assigns a clip to a scene", () => {
    getStore().addScene();
    const sceneId = getStore().scenes[0].id;
    const clip = { id: "c1", name: "test.mp4", src: "blob:test", file: new File([], "test.mp4"), type: "video" as const, duration: 8 };
    getStore().addClip(clip);
    getStore().assignClip("c1", sceneId);
    expect(getStore().scenes[0].clipId).toBe("c1");
    expect(getStore().scenes[0].clipSrc).toBe("blob:test");
    expect(getStore().scenes[0].clipType).toBe("video");
  });

  it("unassigns a clip from a scene", () => {
    getStore().addScene();
    const sceneId = getStore().scenes[0].id;
    const clip = { id: "c1", name: "test.mp4", src: "blob:test", file: new File([], "test.mp4"), type: "video" as const, duration: 8 };
    getStore().addClip(clip);
    getStore().assignClip("c1", sceneId);
    getStore().unassignClip(sceneId);
    expect(getStore().scenes[0].clipId).toBeNull();
  });
});

describe("editorStore — audio", () => {
  beforeEach(resetStore);

  it("adds and removes audio tracks", () => {
    const track = { id: "t1", name: "bgm.mp3", src: "blob:a", file: new File([], "bgm.mp3"), duration: 120, volume: 0.7, fadeIn: 0.5, fadeOut: 1, startTime: 0, muted: false, type: "bgm" as const };
    getStore().addAudioTrack(track);
    expect(getStore().audioTracks).toHaveLength(1);
    getStore().removeAudioTrack("t1");
    expect(getStore().audioTracks).toHaveLength(0);
  });

  it("updates audio track volume", () => {
    const track = { id: "t1", name: "bgm.mp3", src: "", file: new File([], "bgm.mp3"), duration: 120, volume: 0.7, fadeIn: 0.5, fadeOut: 1, startTime: 0, muted: false, type: "bgm" as const };
    getStore().addAudioTrack(track);
    getStore().updateAudioTrack("t1", { volume: 0.3 });
    expect(getStore().audioTracks[0].volume).toBe(0.3);
  });
});

describe("editorStore — playback", () => {
  beforeEach(resetStore);

  it("plays and pauses", () => {
    expect(getStore().isPlaying).toBe(false);
    getStore().play();
    expect(getStore().isPlaying).toBe(true);
    getStore().pause();
    expect(getStore().isPlaying).toBe(false);
  });

  it("seeks within bounds", () => {
    useEditorStore.setState({ totalDuration: 30 });
    getStore().seek(15);
    expect(getStore().currentTime).toBe(15);
  });

  it("clamps seek to totalDuration", () => {
    useEditorStore.setState({ totalDuration: 10 });
    getStore().seek(999);
    expect(getStore().currentTime).toBe(10);
  });

  it("clamps seek to 0 minimum", () => {
    getStore().seek(-5);
    expect(getStore().currentTime).toBe(0);
  });

  it("stop resets time and pauses", () => {
    useEditorStore.setState({ isPlaying: true, currentTime: 10, totalDuration: 20 });
    getStore().stop();
    expect(getStore().isPlaying).toBe(false);
    expect(getStore().currentTime).toBe(0);
  });

  it("play() restarts from the beginning when parked at the end", () => {
    useEditorStore.setState({ totalDuration: 10, currentTime: 10 });
    getStore().play();
    expect(getStore().isPlaying).toBe(true);
    expect(getStore().currentTime).toBe(0);
  });

  it("play() preserves the playhead mid-timeline", () => {
    useEditorStore.setState({ totalDuration: 10, currentTime: 4 });
    getStore().play();
    expect(getStore().isPlaying).toBe(true);
    expect(getStore().currentTime).toBe(4);
  });
});

describe("editorStore — brand kit", () => {
  beforeEach(resetStore);

  it("sets a brand kit", () => {
    const kit = { id: "k1", name: "Main Brand", logo: null, primaryColor: "#6366F1", secondaryColor: "#0C0C0F", accentColor: "#A78BFA", fontHeading: "Inter", fontBody: "Inter", captionStyle: {}, watermark: null, intro: null, outro: null };
    getStore().setBrandKit(kit);
    expect(getStore().brandKit?.name).toBe("Main Brand");
  });

  it("updates brand kit fields", () => {
    const kit = { id: "k1", name: "Main Brand", logo: null, primaryColor: "#6366F1", secondaryColor: "#0C0C0F", accentColor: "#A78BFA", fontHeading: "Inter", fontBody: "Inter", captionStyle: {}, watermark: null, intro: null, outro: null };
    getStore().setBrandKit(kit);
    getStore().updateBrandKit({ primaryColor: "#FF0000" });
    expect(getStore().brandKit?.primaryColor).toBe("#FF0000");
  });
});

describe("editorStore — zoom", () => {
  beforeEach(resetStore);

  it("sets zoom within bounds", () => {
    getStore().setZoom(2);
    expect(getStore().zoom).toBe(2);
  });

  it("clamps zoom to minimum 0.25", () => {
    getStore().setZoom(0.01);
    expect(getStore().zoom).toBe(0.25);
  });

  it("clamps zoom to maximum 8", () => {
    getStore().setZoom(100);
    expect(getStore().zoom).toBe(8);
  });
});

describe("editorStore — history & structural edits", () => {
  beforeEach(resetStore);

  const baseScene = (id: string, duration: number, clipSrc: string | null = null) => ({
    id, order: 0, label: "Scene " + id, description: "", duration,
    clipId: clipSrc ? "c-" + id : null, clipSrc,
    clipType: (clipSrc ? "video" : null) as "video" | "image" | null,
    captions: [], transition: { type: "fade" as const, duration: 0.5 }, mood: "calm" as const,
    colorGrade: null, effects: [],
    colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
  });

  it("splitScene splits one scene into two, preserving media and total duration", () => {
    getStore().setScenes([baseScene("a", 10, "blob:x")]);
    getStore().splitScene("a", 4);
    const s = getStore().scenes;
    expect(s).toHaveLength(2);
    expect(s[0].duration).toBe(4);
    expect(s[1].duration).toBe(6);
    expect(s[1].clipSrc).toBe("blob:x");
    expect(s[1].id).not.toBe("a");
    expect(getStore().totalDuration).toBe(10);
  });

  it("splitScene ignores out-of-range cuts", () => {
    getStore().setScenes([baseScene("a", 10)]);
    getStore().splitScene("a", 0);
    expect(getStore().scenes).toHaveLength(1);
  });

  it("duplicateScene inserts a copy with a fresh id right after the original", () => {
    getStore().setScenes([baseScene("a", 5)]);
    getStore().duplicateScene("a");
    const s = getStore().scenes;
    expect(s).toHaveLength(2);
    expect(s[1].id).not.toBe("a");
    expect(s[1].label).toBe(s[0].label);
    expect(getStore().totalDuration).toBe(10);
  });

  it("undo reverts the last change; redo re-applies it", () => {
    getStore().addScene();
    getStore().addScene();
    expect(getStore().scenes).toHaveLength(2);
    getStore().undo();
    expect(getStore().scenes).toHaveLength(1);
    getStore().undo();
    expect(getStore().scenes).toHaveLength(0);
    getStore().redo();
    expect(getStore().scenes).toHaveLength(1);
    getStore().redo();
    expect(getStore().scenes).toHaveLength(2);
  });

  it("a new action after undo clears the redo stack", () => {
    getStore().addScene();
    getStore().addScene();
    getStore().undo();
    expect(getStore().future).toHaveLength(1);
    getStore().addScene();
    expect(getStore().future).toHaveLength(0);
  });
});
