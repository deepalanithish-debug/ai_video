import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// ── Core types ────────────────────────────────────────────────────────────────

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "3:4";
export type TrackType = "video" | "audio" | "caption" | "transition" | "effect";
export type Mood = "luxury" | "energetic" | "calm" | "dramatic" | "playful" | "neutral";
export type TransitionType =
  | "cut" | "fade" | "dissolve" | "wipe-left" | "wipe-right"
  | "zoom-in" | "zoom-out" | "cross-zoom" | "slide-left" | "slide-right"
  | "cinematic-fade" | "glitch" | "blur" | "whip" | "light-leak" | "flash";

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number; // % from left
  y: number; // % from top
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  bgOpacity: number;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  animation: "none" | "fade" | "slide-up" | "slide-down" | "typewriter" | "scale" | "bounce";
  letterSpacing: number;
  lineHeight: number;
  stroke: boolean;
  strokeColor: string;
  shadow: boolean;
}

export interface Clip {
  id: string;
  name: string;
  src: string; // blob URL
  file: File;
  type: "video" | "image";
  duration: number;
  thumbnail?: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  src: string;
  file: File;
  duration: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  startTime: number;
  muted: boolean;
  type: "bgm" | "sfx" | "voice";
}

export interface Transition {
  type: TransitionType;
  duration: number;
  direction?: "left" | "right" | "up" | "down";
  intensity?: number;
}

export interface ColorAdjustments {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
}

export interface Scene {
  id: string;
  order: number;
  label: string;
  description: string;
  duration: number;
  clipId: string | null;
  clipSrc: string | null;
  clipType: "video" | "image" | null;
  captions: Caption[];
  transition: Transition;
  mood: Mood;
  colorGrade: string | null;
  colorAdjustments: ColorAdjustments;
  effects: string[];
  muteVideoAudio?: boolean;
}

export interface BrandKit {
  id: string;
  name: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  captionStyle: Partial<Caption>;
  watermark: string | null;
  intro: string | null;
  outro: string | null;
}

export type LeftTab = "media" | "text" | "music" | "transitions" | "brand" | "ai" | "effects";
export type InspectorTarget = { type: "scene"; id: string } | { type: "caption"; sceneId: string; captionId: string } | { type: "audio"; id: string } | null;

/** Snapshot of the undoable timeline state. */
export interface TimelineSnapshot {
  scenes: Scene[];
  audioTracks: AudioTrack[];
  aspectRatio: AspectRatio;
  totalDuration: number;
}

export interface EditorState {
  // Project
  projectId: string | null;
  projectName: string;
  aspectRatio: AspectRatio;

  // Timeline data
  scenes: Scene[];
  audioTracks: AudioTrack[];
  totalDuration: number;

  // Clips library
  clips: Clip[];

  // Playback
  isPlaying: boolean;
  currentTime: number;
  isMuted: boolean;
  volume: number;

  // UI state
  activeSceneId: string | null;
  leftTab: LeftTab;
  inspectorTarget: InspectorTarget;
  isGenerating: boolean;
  isDemoMode: boolean;
  isDirty: boolean;
  zoom: number; // timeline zoom 0.5-4x
  snapEnabled: boolean;

  // Brand
  brandKit: BrandKit | null;

  // Actions — playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (t: number) => void;
  setMuted: (v: boolean) => void;
  setVolume: (v: number) => void;

  // Actions — project
  setProjectName: (name: string) => void;
  setAspectRatio: (r: AspectRatio) => void;

  // Actions — scenes
  setScenes: (scenes: Scene[]) => void;
  addScene: (after?: string) => void;
  removeScene: (id: string) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  reorderScene: (fromIdx: number, toIdx: number) => void;
  setActiveScene: (id: string | null) => void;

  // Actions — captions
  addCaption: (sceneId: string) => void;
  updateCaption: (sceneId: string, captionId: string, patch: Partial<Caption>) => void;
  removeCaption: (sceneId: string, captionId: string) => void;

  // Actions — clips
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  assignClip: (clipId: string, sceneId: string) => void;
  unassignClip: (sceneId: string) => void;

  // Actions — audio
  addAudioTrack: (track: AudioTrack) => void;
  updateAudioTrack: (id: string, patch: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;

  // Actions — UI
  setLeftTab: (tab: LeftTab) => void;
  setInspectorTarget: (target: InspectorTarget) => void;
  setZoom: (zoom: number) => void;
  setSnapEnabled: (v: boolean) => void;
  setIsGenerating: (v: boolean) => void;
  setIsDemoMode: (v: boolean) => void;

  // Actions — brand
  setBrandKit: (kit: BrandKit | null) => void;
  updateBrandKit: (patch: Partial<BrandKit>) => void;

  // Actions — bulk
  loadTimeline: (data: {
    scenes: Scene[];
    audioTracks: AudioTrack[];
    totalDuration: number;
    aspectRatio?: AspectRatio;
  }) => void;

  // History (undo/redo) + structural edits
  past: TimelineSnapshot[];
  future: TimelineSnapshot[];
  pushHistory: (coalesce?: boolean) => void;
  undo: () => void;
  redo: () => void;
  splitScene: (id: string, atSeconds: number) => void;
  duplicateScene: (id: string) => void;
}

const DEFAULT_CAPTION: Omit<Caption, "id" | "startTime" | "endTime" | "text"> = {
  x: 10, y: 75, fontSize: 24, fontFamily: "Inter",
  color: "#FFFFFF", bgColor: "#000000", bgOpacity: 0.4,
  bold: false, italic: false, align: "center",
  animation: "fade", letterSpacing: 0.05, lineHeight: 1.4,
  stroke: false, strokeColor: "#000000", shadow: true,
};

const DEFAULT_TRANSITION: Transition = { type: "fade", duration: 0.5 };

function makeDemoScene(order: number): Scene {
  return {
    id: uuidv4(), order, label: `Scene ${order + 1}`,
    description: "", duration: 4,
    clipId: null, clipSrc: null, clipType: null,
    captions: [], transition: { ...DEFAULT_TRANSITION },
    mood: "luxury", colorGrade: null, effects: [],
    colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
  };
}

const HISTORY_LIMIT = 50;
let _historyLastPush = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  projectName: "Untitled Project",
  aspectRatio: "9:16",
  scenes: [makeDemoScene(0), makeDemoScene(1), makeDemoScene(2), makeDemoScene(3), makeDemoScene(4)],
  audioTracks: [],
  totalDuration: 20,
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
  zoom: 2,
  snapEnabled: true,
  brandKit: null,
  past: [],
  future: [],

  // ── Playback ──────────────────────────────────────────────────────────────
  play: () => {
    const s = get();
    // If the playhead is parked at the very end, restart from the top so Play always plays.
    if (s.totalDuration > 0 && s.currentTime >= s.totalDuration - 0.01) {
      set({ isPlaying: true, currentTime: 0 });
    } else {
      set({ isPlaying: true });
    }
  },
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  seek: (t) => set({ currentTime: Math.max(0, Math.min(t, get().totalDuration)) }),
  setMuted: (v) => set({ isMuted: v }),
  setVolume: (v) => set({ volume: v }),

  // ── Project ───────────────────────────────────────────────────────────────
  setProjectName: (name) => set({ projectName: name, isDirty: true }),
  setAspectRatio: (r) => set({ aspectRatio: r, isDirty: true }),

  // ── Scenes ────────────────────────────────────────────────────────────────
  setScenes: (scenes) => {
    get().pushHistory(false);
    const total = scenes.reduce((s, sc) => s + sc.duration, 0);
    set({ scenes, totalDuration: total, isDirty: true });
  },
  addScene: (after) => {
    get().pushHistory(false);
    const { scenes } = get();
    const idx = after ? scenes.findIndex(s => s.id === after) + 1 : scenes.length;
    const newScene = makeDemoScene(idx);
    const updated = [
      ...scenes.slice(0, idx),
      newScene,
      ...scenes.slice(idx).map((s, i) => ({ ...s, order: idx + 1 + i })),
    ];
    set({ scenes: updated, totalDuration: updated.reduce((s, sc) => s + sc.duration, 0), isDirty: true });
  },
  removeScene: (id) => {
    get().pushHistory(false);
    const scenes = get().scenes.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
    set({ scenes, totalDuration: scenes.reduce((s, sc) => s + sc.duration, 0), isDirty: true });
  },
  updateScene: (id, patch) => {
    get().pushHistory(true);
    const scenes = get().scenes.map(s => s.id === id ? { ...s, ...patch } : s);
    set({ scenes, totalDuration: scenes.reduce((s, sc) => s + sc.duration, 0), isDirty: true });
  },
  reorderScene: (fromIdx, toIdx) => {
    get().pushHistory(false);
    const scenes = [...get().scenes];
    const [moved] = scenes.splice(fromIdx, 1);
    scenes.splice(toIdx, 0, moved);
    set({ scenes: scenes.map((s, i) => ({ ...s, order: i })), isDirty: true });
  },
  setActiveScene: (id) => set({ activeSceneId: id }),

  // ── Captions ──────────────────────────────────────────────────────────────
  addCaption: (sceneId) => {
    const scene = get().scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const newCap: Caption = {
      id: uuidv4(), text: "ADD CAPTION HERE",
      startTime: 0, endTime: scene.duration,
      ...DEFAULT_CAPTION,
    };
    get().updateScene(sceneId, { captions: [...scene.captions, newCap] });
  },
  updateCaption: (sceneId, captionId, patch) => {
    const scene = get().scenes.find(s => s.id === sceneId);
    if (!scene) return;
    get().updateScene(sceneId, {
      captions: scene.captions.map(c => c.id === captionId ? { ...c, ...patch } : c),
    });
  },
  removeCaption: (sceneId, captionId) => {
    const scene = get().scenes.find(s => s.id === sceneId);
    if (!scene) return;
    get().updateScene(sceneId, { captions: scene.captions.filter(c => c.id !== captionId) });
  },

  // ── Clips ─────────────────────────────────────────────────────────────────
  addClip: (clip) => set(s => ({ clips: [...s.clips, clip], isDirty: true })),
  removeClip: (id) => set(s => ({ clips: s.clips.filter(c => c.id !== id), isDirty: true })),
  assignClip: (clipId, sceneId) => {
    const clip = get().clips.find(c => c.id === clipId);
    if (!clip) return;
    get().updateScene(sceneId, {
      clipId: clip.id, clipSrc: clip.src,
      clipType: clip.type,
      duration: clip.type === "video" ? clip.duration : get().scenes.find(s => s.id === sceneId)?.duration ?? 4,
    });
  },
  unassignClip: (sceneId) => {
    get().updateScene(sceneId, { clipId: null, clipSrc: null, clipType: null });
  },

  // ── Audio ─────────────────────────────────────────────────────────────────
  addAudioTrack: (track) => { get().pushHistory(false); set(s => ({ audioTracks: [...s.audioTracks, track], isDirty: true })); },
  updateAudioTrack: (id, patch) => { get().pushHistory(true); set(s => ({
    audioTracks: s.audioTracks.map(t => t.id === id ? { ...t, ...patch } : t),
    isDirty: true,
  })); },
  removeAudioTrack: (id) => { get().pushHistory(false); set(s => ({ audioTracks: s.audioTracks.filter(t => t.id !== id), isDirty: true })); },

  // ── UI ────────────────────────────────────────────────────────────────────
  setLeftTab: (tab) => set({ leftTab: tab }),
  setInspectorTarget: (target) => set({ inspectorTarget: target }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(8, zoom)) }),
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsDemoMode: (v) => set({ isDemoMode: v }),

  // ── Brand ─────────────────────────────────────────────────────────────────
  setBrandKit: (kit) => set({ brandKit: kit }),
  updateBrandKit: (patch) => {
    const current = get().brandKit;
    if (!current) return;
    set({ brandKit: { ...current, ...patch } });
  },

  // ── Bulk ──────────────────────────────────────────────────────────────────
  loadTimeline: ({ scenes, audioTracks, totalDuration, aspectRatio }) => {
    const DEFAULT_ADJ: ColorAdjustments = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
    const hydratedScenes = scenes.map(s => ({
      ...s,
      colorAdjustments: s.colorAdjustments ?? DEFAULT_ADJ,
    }));
    set({
      scenes: hydratedScenes, audioTracks, totalDuration,
      ...(aspectRatio ? { aspectRatio } : {}),
      activeSceneId: hydratedScenes[0]?.id ?? null,
      currentTime: 0, isPlaying: false,
      past: [], future: [],
    });
  },

  // ── History & structural edits ──────────────────────────────────────────────
  pushHistory: (coalesce = false) => {
    const now = Date.now();
    // Coalesce rapid mutations (e.g. a single drag gesture) into one history entry.
    if (coalesce && now - _historyLastPush < 400) return;
    _historyLastPush = now;
    const { scenes, audioTracks, aspectRatio, totalDuration, past } = get();
    const snap: TimelineSnapshot = { scenes, audioTracks, aspectRatio, totalDuration };
    set({ past: [...past, snap].slice(-HISTORY_LIMIT), future: [] });
  },
  undo: () => {
    const { past, future, scenes, audioTracks, aspectRatio, totalDuration } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    const current: TimelineSnapshot = { scenes, audioTracks, aspectRatio, totalDuration };
    set({
      scenes: prev.scenes, audioTracks: prev.audioTracks,
      aspectRatio: prev.aspectRatio, totalDuration: prev.totalDuration,
      past: past.slice(0, -1), future: [current, ...future], isDirty: true,
    });
  },
  redo: () => {
    const { past, future, scenes, audioTracks, aspectRatio, totalDuration } = get();
    if (!future.length) return;
    const next = future[0];
    const current: TimelineSnapshot = { scenes, audioTracks, aspectRatio, totalDuration };
    set({
      scenes: next.scenes, audioTracks: next.audioTracks,
      aspectRatio: next.aspectRatio, totalDuration: next.totalDuration,
      past: [...past, current], future: future.slice(1), isDirty: true,
    });
  },
  splitScene: (id, atSeconds) => {
    const { scenes } = get();
    const idx = scenes.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const sc = scenes[idx];
    if (atSeconds <= 0.1 || atSeconds >= sc.duration - 0.1) return;
    get().pushHistory(false);
    const firstDur = atSeconds;
    const secondDur = sc.duration - atSeconds;
    // Keep captions that start before the cut in the first half; move the rest to the second.
    const firstCaps = sc.captions
      .filter((c) => c.startTime < atSeconds)
      .map((c) => ({ ...c, endTime: Math.min(c.endTime, firstDur) }));
    const secondCaps = sc.captions
      .filter((c) => c.endTime > atSeconds)
      .map((c) => ({ ...c, id: uuidv4(), startTime: Math.max(0, c.startTime - atSeconds), endTime: c.endTime - atSeconds }));
    const first: Scene = { ...sc, duration: firstDur, captions: firstCaps };
    const second: Scene = {
      ...sc, id: uuidv4(), duration: secondDur, captions: secondCaps,
      transition: { ...sc.transition }, colorAdjustments: { ...sc.colorAdjustments },
    };
    const updated = [...scenes.slice(0, idx), first, second, ...scenes.slice(idx + 1)]
      .map((s, i) => ({ ...s, order: i }));
    set({ scenes: updated, totalDuration: updated.reduce((a, s) => a + s.duration, 0), isDirty: true });
  },
  duplicateScene: (id) => {
    const { scenes } = get();
    const idx = scenes.findIndex((s) => s.id === id);
    if (idx === -1) return;
    get().pushHistory(false);
    const sc = scenes[idx];
    const copy: Scene = {
      ...sc, id: uuidv4(),
      captions: sc.captions.map((c) => ({ ...c, id: uuidv4() })),
      transition: { ...sc.transition }, colorAdjustments: { ...sc.colorAdjustments },
    };
    const updated = [...scenes.slice(0, idx + 1), copy, ...scenes.slice(idx + 1)]
      .map((s, i) => ({ ...s, order: i }));
    set({ scenes: updated, totalDuration: updated.reduce((a, s) => a + s.duration, 0), isDirty: true });
  },
}));

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectActiveScene = (s: EditorState) =>
  s.scenes.find(sc => sc.id === s.activeSceneId) ?? s.scenes[0] ?? null;

export const selectSceneAtTime = (s: EditorState) => {
  let elapsed = 0;
  for (const scene of s.scenes) {
    if (s.currentTime < elapsed + scene.duration) return scene;
    elapsed += scene.duration;
  }
  return s.scenes.at(-1) ?? null;
};
