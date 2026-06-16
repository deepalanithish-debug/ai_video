"use client";

import { useEffect, useRef, useState, memo, useCallback } from "react";
import type { Scene, Timeline, CaptionLine } from "@/types/timeline";
import type { UploadedAudio } from "@/types/clips";
import type { StudioCaption } from "@/types/captions";
import { runTransitionAnimation as runSharedTransition, cancelTransitionAnimations, DEFAULT_ANIM_CONFIG } from "@/lib/transitionAnimations";
import CaptionLayer from "./CaptionLayer";
import OutroOverlay from "./OutroOverlay";
import type { OutroTemplate } from "@/types/outro";

interface BrandOverrides {
  primaryColor?: string;
  fontFamily?: string;
  logoPosition?: string;
  colorGrade?: string;
}

interface CanvasPreviewProps {
  timeline: Timeline | null;
  activeSceneId: string | null;
  isGenerating: boolean;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (t: number) => void;
  onSceneSelect?: (id: string) => void;
  aspectRatio: string;
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  brandOverrides?: BrandOverrides;
  // Text Studio
  captions?: StudioCaption[];
  selectedCaptionId?: string | null;
  onCaptionSelect?: (id: string | null) => void;
  onCaptionUpdate?: (id: string, patch: Partial<StudioCaption>) => void;
  showGrid?: boolean;
  showSafeZones?: boolean;
  showThirds?: boolean;
  outroConfig?: OutroTemplate | null;
  outroSceneId?: string | null;
}

const COLOR_GRADE_FILTERS: Record<string, string> = {
  "Asaya Luxury":  "sepia(0.12) contrast(1.06) brightness(0.97) saturate(0.92)",
  "Film Noir":     "grayscale(0.4) contrast(1.2) brightness(0.87)",
  "Warm Summer":   "saturate(1.22) brightness(1.03) hue-rotate(6deg)",
  "Cool Winter":   "saturate(0.82) hue-rotate(-10deg) brightness(0.96)",
  "Matte Fade":    "contrast(0.88) saturate(0.8) brightness(1.04)",
  "Vibrant Pop":   "saturate(1.42) contrast(1.1) brightness(1.02)",
  "Golden Hour":   "sepia(0.28) saturate(1.12) brightness(1.02)",
  "Moody Dark":    "contrast(1.15) brightness(0.85) saturate(0.88)",
};

const MOOD_COLORS: Record<string, { bg: string; accent: string }> = {
  luxury:    { bg: "#1a1510", accent: "#c9a96e" },
  energetic: { bg: "#12101a", accent: "#f472b6" },
  calm:      { bg: "#0f1a14", accent: "#6ee7b7" },
  dramatic:  { bg: "#130f1a", accent: "#a78bfa" },
  playful:   { bg: "#1a1a0f", accent: "#fcd34d" },
};

function effectToCssFilter(effect: string): string {
  const e = effect.toLowerCase().replace(/[\s_-]+/g, "-");
  if (e.includes("black-and-white") || e.includes("grayscale") || e.includes("bw")) return "grayscale(1)";
  if (e.includes("sepia") || e.includes("vintage")) return "sepia(0.85)";
  if (e.includes("warm") || e.includes("golden")) return "sepia(0.3) saturate(1.3) brightness(1.05)";
  if (e.includes("cool") || e.includes("cold")) return "saturate(0.8) hue-rotate(-15deg) brightness(0.97)";
  if (e.includes("vignette")) return ""; // vignette is a separate overlay in CSS
  if (e.includes("blur") || e.includes("dreamy")) return "blur(2px)";
  if (e.includes("cinematic") || e.includes("film")) return "contrast(1.12) saturate(0.88) sepia(0.1)";
  if (e.includes("matte") || e.includes("fade")) return "contrast(0.88) saturate(0.78) brightness(1.04)";
  if (e.includes("vibrant") || e.includes("pop")) return "saturate(1.45) contrast(1.1)";
  if (e.includes("moody") || e.includes("dark")) return "contrast(1.18) brightness(0.85) saturate(0.85)";
  if (e.includes("bright") || e.includes("light")) return "brightness(1.12) contrast(0.95)";
  return "";
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${cs}`;
}

function resolveScene(
  timeline: Timeline,
  globalTime: number
): { scene: Scene; sceneTime: number } | null {
  let elapsed = 0;
  for (const scene of timeline.scenes ?? []) {
    if (globalTime < elapsed + scene.duration) {
      return { scene, sceneTime: globalTime - elapsed };
    }
    elapsed += scene.duration;
  }
  const last = (timeline.scenes ?? []).at(-1);
  return last ? { scene: last, sceneTime: last.duration } : null;
}

function getActiveCaption(scene: Scene, sceneTime: number): CaptionLine | null {
  return (
    (scene.captions ?? []).find(
      (c) => sceneTime >= c.startTime && sceneTime <= c.endTime
    ) ?? null
  );
}

// ─── SceneVisual receives a `key` from its parent that equals the scene ID.
//     When the scene changes the whole component unmounts + remounts, so refs
//     and effects always start fresh — this is what makes play/pause reliable
//     across scene transitions.
const SceneVisual = memo(function SceneVisual({
  scene,
  moodStyle,
  isPlaying,
  isMuted,
}: {
  scene: Scene | null;
  moodStyle: { bg: string; accent: string };
  isPlaying: boolean;
  isMuted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = isMuted;
    vid.playbackRate = scene?.playbackSpeed ?? 1;

    if (isPlaying) {
      const id = setTimeout(() => {
        const p = vid.play();
        if (p) {
          playPromiseRef.current = p;
          p.catch(() => { playPromiseRef.current = null; });
        }
      }, 30);
      return () => clearTimeout(id);
    } else {
      const settle = playPromiseRef.current ?? Promise.resolve();
      settle.then(() => { vid.pause(); }).catch(() => { vid.pause(); });
    }
  }, [isPlaying, isMuted, scene?.playbackSpeed]);

  if (!scene) return null;

  const hasClip = !!scene.clipSrc;
  const clipType = scene.clipType
    ?? (/\.(jpg|jpeg|png|gif|webp|heic)(\?|$)/i.test(scene.clipSrc ?? "") ? "image" : "video");
  const isVideoClip = hasClip && clipType === "video";
  const isImageClip = hasClip && clipType === "image";

  const trimStart    = scene.clipTrimStart ?? 0;
  const trimEnd      = scene.clipTrimEnd;
  const playbackRate = scene.playbackSpeed ?? 1;
  const cssFilter    = scene.visualEffect ? effectToCssFilter(scene.visualEffect) : undefined;

  return (
    <>
      {isVideoClip && (
        <video
          ref={videoRef}
          src={scene.clipSrc}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", zIndex: 1,
            filter: cssFilter || undefined,
          }}
          playsInline
          preload="auto"
          onLoadedData={(e) => {
            const v = e.currentTarget;
            v.playbackRate = playbackRate;
            v.currentTime = trimStart > 0 ? trimStart : 0.01;
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (trimEnd != null && v.currentTime >= trimEnd) {
              v.pause();
            }
          }}
          onEnded={() => {
            // hold last frame — parent timer advances to next scene
          }}
        />
      )}

      {/* Vignette overlay */}
      {scene.visualEffect?.toLowerCase().includes("vignette") && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)",
        }} />
      )}

      {isImageClip && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={scene.clipSrc}
          src={scene.clipSrc}
          alt={scene.label}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", zIndex: 1,
          }}
        />
      )}

      {/* Mood colour overlay — lighter when clip present */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        background: `radial-gradient(ellipse at 50% 30%, ${moodStyle.accent}${hasClip ? "0a" : "22"} 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* Placeholder when no clip */}
      {!hasClip && (
        <>
          <div style={{
            position: "absolute", inset: 0, zIndex: 3,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3,
            opacity: 0.1, pointerEvents: "none",
          }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                width: `${50 + Math.sin(i * 1.1) * 28}%`,
                height: 2, background: moodStyle.accent, borderRadius: 2,
              }} />
            ))}
          </div>

          <div style={{
            position: "absolute", top: "18%", left: 0, right: 0,
            textAlign: "center", zIndex: 3, pointerEvents: "none",
          }}>
            <div style={{
              fontSize: 9, color: `${moodStyle.accent}66`,
              letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
            }}>
              {scene.label}
            </div>
          </div>

          {scene.description && (
            <div style={{
              position: "absolute", bottom: "18%", left: 0, right: 0,
              padding: "0 8%", textAlign: "center", zIndex: 3, pointerEvents: "none",
            }}>
              <div style={{
                fontSize: 8, color: `${moodStyle.accent}88`,
                letterSpacing: "0.06em", lineHeight: 1.5,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {scene.description}
              </div>
            </div>
          )}

          <div style={{
            position: "absolute", bottom: "6%", left: 0, right: 0,
            textAlign: "center", zIndex: 3, pointerEvents: "none",
          }}>
            <div style={{
              fontSize: 7.5, color: `${moodStyle.accent}44`,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              ↑ assign clip from panel
            </div>
          </div>
        </>
      )}

      {/* Scene number badge (hidden when clip assigned) */}
      {!hasClip && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", zIndex: 3,
          transform: "translate(-50%, -50%)",
          width: 36, height: 36, borderRadius: "50%",
          border: `1.5px solid ${moodStyle.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: `${moodStyle.accent}88`, fontSize: 13, fontWeight: 300,
          pointerEvents: "none",
        }}>
          {scene.order + 1}
        </div>
      )}

      {/* VID/IMG badge */}
      {hasClip && (
        <div style={{
          position: "absolute", bottom: 6, right: 6, zIndex: 4,
          padding: "2px 6px", borderRadius: 3,
          background: "rgba(0,0,0,0.65)",
          color: isVideoClip ? "var(--accent)" : "#a5b4fc",
          fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
          pointerEvents: "none",
        }}>
          {isVideoClip ? "▶ VID" : "⬛ IMG"}
        </div>
      )}
    </>
  );
});

export default function CanvasPreview({
  timeline, activeSceneId, isGenerating,
  isPlaying, currentTime, onPlay, onPause, onStop, onSeek,
  onSceneSelect,
  aspectRatio: aspectRatioProp,
  audioTracks, activeAudioId,
  brandOverrides,
  captions = [], selectedCaptionId = null,
  onCaptionSelect, onCaptionUpdate,
  showGrid = false, showSafeZones = false, showThirds = false,
  outroConfig = null,
  outroSceneId = null,
}: CanvasPreviewProps) {
  const bgmRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // BGM source — from uploaded audio or timeline layer
  const bgmSrc =
    audioTracks.find((t) => t.id === activeAudioId)?.objectUrl
    ?? audioTracks[0]?.objectUrl
    ?? timeline?.audioLayers?.find((l) => l.type === "bgm" && l.src)?.src
    ?? null;

  // Keep a ref so the play effect can read currentTime without adding it to deps
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  // Track the BGM play() promise so we never call pause() while it's still pending
  const bgmPlayPromiseRef = useRef<Promise<void> | null>(null);

  // Sync play/pause for BGM — also syncs position when resuming after a seek
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm || !bgmSrc) return;
    bgm.volume = isMuted ? 0 : volume;

    if (isPlaying) {
      // Snap BGM to current timeline position so it stays in sync after seeks/stops
      if (bgm.duration && isFinite(bgm.duration)) {
        bgm.currentTime = currentTimeRef.current % bgm.duration;
      }
      if (bgm.paused) {
        const p = bgm.play();
        if (p !== undefined) {
          bgmPlayPromiseRef.current = p;
          p.then(() => { bgmPlayPromiseRef.current = null; }).catch(() => { bgmPlayPromiseRef.current = null; });
        }
      }
    } else {
      // Wait for any in-flight play() to settle before pausing
      const settle = bgmPlayPromiseRef.current ?? Promise.resolve();
      settle.then(() => { bgm.pause(); }).catch(() => { bgm.pause(); });
    }
  }, [isPlaying, bgmSrc, isMuted, volume]);

  // Resolve which scene to display
  const resolved = timeline ? resolveScene(timeline, currentTime) : null;
  const displayScene =
    resolved?.scene
    ?? (activeSceneId ? (timeline?.scenes ?? []).find((s) => s.id === activeSceneId) : null)
    ?? (timeline?.scenes ?? [])[0]
    ?? null;
  const sceneTime = resolved?.sceneTime ?? 0;
  const activeCaption = displayScene ? getActiveCaption(displayScene, sceneTime) : null;

  // ── Transition state (Web Animations API — imperative, no CSS timing issues) ──
  const [outgoingScene, setOutgoingScene] = useState<Scene | null>(null);
  const outgoingLayerRef = useRef<HTMLDivElement>(null);
  const incomingLayerRef = useRef<HTMLDivElement>(null);
  const prevDisplaySceneIdRef = useRef<string | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevId = prevDisplaySceneIdRef.current;
    if (!displayScene || displayScene.id === prevId) return;
    prevDisplaySceneIdRef.current = displayScene.id;

    const trans = displayScene.transition;
    const transType = trans?.type ?? "cut";
    const isCut = transType === "cut" || transType === "hard-cut" || !transType;
    const speedMult = trans?.speed === "slow" ? 1.5 : trans?.speed === "fast" ? 0.5 : 1;
    const baseDur = trans?.duration ?? 0.5;
    const durMs = isCut ? 0 : Math.max(150, baseDur * speedMult * 1000);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    incomingLayerRef.current?.getAnimations().forEach((a) => a.cancel());

    if (isCut || !prevId) {
      setOutgoingScene(null);
      return;
    }

    const prevScene = (timeline?.scenes ?? []).find((s) => s.id === prevId) ?? null;
    setOutgoingScene(prevScene);

    // 16ms = 1 frame — waits for React to mount the outgoing div before animating
    setTimeout(() => {
      const outEl = outgoingLayerRef.current;
      const inEl  = incomingLayerRef.current;
      cancelTransitionAnimations(outEl, inEl);
      runSharedTransition(outEl, inEl, {
        ...DEFAULT_ANIM_CONFIG,
        type: transType,
        durationMs: durMs,
        intensity:      trans?.intensity      ?? DEFAULT_ANIM_CONFIG.intensity,
        direction:      (trans?.direction     ?? DEFAULT_ANIM_CONFIG.direction) as typeof DEFAULT_ANIM_CONFIG.direction,
        easing:         trans?.easing         ?? DEFAULT_ANIM_CONFIG.easing,
        blurAmount:     trans?.blurAmount     ?? DEFAULT_ANIM_CONFIG.blurAmount,
        motionStrength: trans?.motionStrength ?? DEFAULT_ANIM_CONFIG.motionStrength,
        mode:           (trans?.mode          ?? DEFAULT_ANIM_CONFIG.mode) as typeof DEFAULT_ANIM_CONFIG.mode,
      });
    }, 16);

    transitionTimerRef.current = setTimeout(() => {
      setOutgoingScene(null);
      incomingLayerRef.current?.getAnimations().forEach((a) => a.cancel());
    }, durMs + 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayScene?.id]);

  const aspectRatio = aspectRatioProp ?? timeline?.aspectRatio ?? "9:16";

  // CSS aspect-ratio value
  const cssAspectRatio = ({
    "9:16": "9 / 16",
    "16:9": "16 / 9",
    "1:1":  "1 / 1",
    "4:5":  "4 / 5",
    "3:4":  "3 / 4",
  } as Record<string, string>)[aspectRatio] ?? "9 / 16";

  const isPortrait = aspectRatio !== "16:9";

  // Approximate canvas width just for sizing the scrub bar / controls row
  const approxControlsW = isPortrait ? 320 : 560;

  const mood = displayScene?.mood ?? "luxury";
  const moodStyle = MOOD_COLORS[mood] ?? MOOD_COLORS.luxury;
  const totalDuration = Math.max(timeline?.totalDuration ?? 0, (timeline?.scenes ?? []).reduce((s, sc) => s + sc.duration, 0), 1);
  const progress = Math.min(currentTime / totalDuration, 1);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (bgmRef.current) bgmRef.current.volume = isMuted ? 0 : v;
  }, [isMuted]);

  const colorGradeFilter = brandOverrides?.colorGrade ? (COLOR_GRADE_FILTERS[brandOverrides.colorGrade] ?? "") : "";
  const captionFont = brandOverrides?.fontFamily ?? "serif";
  const captionColor = brandOverrides?.primaryColor ?? "#f5edd6";
  const scenes = timeline?.scenes ?? [];

  return (
    <div style={{
      minHeight: "100%", background: "var(--bg-base)",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* BGM audio element — lives outside the canvas so it never remounts on scene change */}
      {bgmSrc && (
        <audio
          ref={bgmRef}
          src={bgmSrc}
          preload="auto"
          loop
          style={{ display: "none" }}
        />
      )}

      {/* Subtle glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(201,169,110,0.03) 0%, transparent 70%)",
      }} />

      {isGenerating ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GeneratingState />
        </div>
      ) : !timeline || !scenes.length ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState noScenes={!!timeline} />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", padding: "16px 0", gap: 0 }}>

          {/* ── Left sidebar: scene filmstrip (portrait only) ── */}
          {isPortrait && scenes.length > 0 && (
            <div style={{
              width: 86, flexShrink: 0, paddingLeft: 10, paddingRight: 6,
              display: "flex", flexDirection: "column", gap: 3,
              maxHeight: "clamp(300px, 62vh, 600px)", overflowY: "auto",
              alignSelf: "flex-start",
            }}>
              <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 2, paddingLeft: 2 }}>
                SCENES
              </div>
              {scenes.map((scene, i) => {
                const scColor = ["#c9a96e","#a78bfa","#6ee7b7","#f472b6","#fcd34d","#60a5fa","#f87171","#34d399"][i % 8];
                const isActive = scene.id === (displayScene?.id ?? activeSceneId);
                let sceneStart = 0;
                for (let j = 0; j < i; j++) sceneStart += scenes[j].duration;
                return (
                  <button
                    key={scene.id}
                    onClick={() => onSeek(sceneStart)}
                    title={scene.label}
                    style={{
                      borderRadius: 5, border: `1px solid ${isActive ? scColor : "var(--border-subtle)"}`,
                      background: isActive ? `${scColor}18` : "var(--bg-elevated)",
                      padding: "4px 5px", cursor: "pointer", textAlign: "left",
                      transition: "all 0.12s ease", position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: scColor, borderRadius: "3px 0 0 3px" }} />
                    <div style={{ paddingLeft: 5 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: isActive ? scColor : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {i + 1}. {scene.label}
                      </div>
                      <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 1 }}>
                        {scene.duration}s · {scene.mood ?? ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Center: canvas + scrub + transport ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minWidth: 0 }}>
            {/* Canvas frame */}
            <div style={{
              ...(isPortrait
                ? { height: "clamp(300px, 56vh, 580px)", width: "auto" }
                : { width: "clamp(320px, calc(100% - 48px), 600px)", height: "auto" }
              ),
              aspectRatio: cssAspectRatio,
              borderRadius: 12, overflow: "hidden",
              border: "1px solid var(--border)",
              position: "relative", background: moodStyle.bg,
              flexShrink: 0,
              filter: colorGradeFilter || undefined,
              transition: "filter 0.3s ease",
            }}>
              {/* Outgoing scene — animated out via Web Animations API */}
              {outgoingScene && (
                <div ref={outgoingLayerRef} style={{
                  position: "absolute", inset: 0, zIndex: 1,
                  pointerEvents: "none",
                }}>
                  <SceneVisual
                    key={`out-${outgoingScene.id}`}
                    scene={outgoingScene}
                    moodStyle={moodStyle}
                    isPlaying={false}
                    isMuted={true}
                  />
                </div>
              )}

              {/* Incoming scene — animated in via Web Animations API */}
              <div ref={incomingLayerRef} style={{
                position: "absolute", inset: 0, zIndex: 2,
              }}>
                <SceneVisual
                  key={displayScene?.id ?? "empty"}
                  scene={displayScene}
                  moodStyle={moodStyle}
                  isPlaying={isPlaying}
                  isMuted={isMuted}
                />
              </div>

              {/* Safe zone guide */}
              <div style={{
                position: "absolute", inset: "8%", zIndex: 5,
                border: "1px dashed rgba(255,255,255,0.06)",
                borderRadius: 4, pointerEvents: "none",
              }} />

              {/* Aspect ratio badge */}
              <div style={{
                position: "absolute", top: 6, left: 6, zIndex: 6,
                padding: "2px 6px", borderRadius: 3,
                background: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.5)", fontSize: 9, letterSpacing: "0.05em",
              }}>
                {aspectRatio}
                {brandOverrides?.colorGrade && (
                  <span style={{ color: "var(--accent)", marginLeft: 4 }}>· {brandOverrides.colorGrade}</span>
                )}
              </div>

              {/* Scene counter */}
              <div style={{
                position: "absolute", top: 6, right: 6, zIndex: 6,
                padding: "2px 6px", borderRadius: 3,
                background: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.4)", fontSize: 9,
              }}>
                {(displayScene?.order ?? 0) + 1} / {scenes.length}
              </div>

              {/* Live captions */}
              {activeCaption && (
                <div style={{
                  position: "absolute", bottom: "12%", left: 0, right: 0,
                  textAlign: "center", padding: "0 10%", zIndex: 6,
                  animation: "fadeIn 0.2s ease",
                }}>
                  <span style={{
                    background: "rgba(0,0,0,0.55)",
                    color: captionColor, fontSize: 11, fontFamily: captionFont,
                    letterSpacing: "0.15em", textTransform: "uppercase",
                    lineHeight: 1.6, textShadow: "0 1px 8px rgba(0,0,0,0.9)",
                    padding: "2px 6px", borderRadius: 3,
                  }}>
                    {activeCaption.text}
                  </span>
                </div>
              )}

              {/* Studio caption layer (interactive, above everything) */}
              {captions.length > 0 || showGrid || showSafeZones || showThirds ? (
                <CaptionLayer
                  captions={captions}
                  currentTime={currentTime}
                  selectedCaptionId={selectedCaptionId}
                  onCaptionSelect={onCaptionSelect ?? (() => {})}
                  onCaptionUpdate={onCaptionUpdate ?? (() => {})}
                  showGrid={showGrid}
                  showSafeZones={showSafeZones}
                  showThirds={showThirds}
                  isPlaying={isPlaying}
                />
              ) : null}

              {/* Brand Outro overlay */}
              {outroConfig && outroSceneId && displayScene?.id === outroSceneId && (
                <OutroOverlay config={outroConfig} sceneTime={sceneTime} />
              )}

              {/* Recording dot while playing */}
              {isPlaying && (
                <div style={{
                  position: "absolute", bottom: 8, left: 8, zIndex: 6,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#ef4444",
                    animation: "pulse-glow 1s ease infinite",
                  }} />
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>
                    {fmt(currentTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Scrub bar */}
            <div style={{ width: `clamp(220px, ${approxControlsW}px, 100%)`, display: "flex", flexDirection: "column", gap: 4 }}>
              <ScrubBar
                progress={progress}
                totalDuration={totalDuration}
                currentTime={currentTime}
                onSeek={onSeek}
                scenes={scenes}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(currentTime)}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {fmt(totalDuration)}
                </span>
              </div>
            </div>

            {/* Transport controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TransportBtn title="Stop" onClick={onStop}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </TransportBtn>

              <TransportBtn title="Previous scene" onClick={() => {
                if (!timeline) return;
                let prevStart = 0;
                let elapsed = 0;
                for (const scene of scenes) {
                  if (scene.id === displayScene?.id) { onSeek(prevStart); return; }
                  prevStart = elapsed;
                  elapsed += scene.duration;
                }
                onSeek(0);
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              </TransportBtn>

              <button
                onClick={isPlaying ? onPause : onPlay}
                title={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "none", background: "var(--accent)", color: "#0e0e0f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "transform 0.1s ease",
                  flexShrink: 0, boxShadow: "0 0 16px rgba(201,169,110,0.25)",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {isPlaying ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <TransportBtn title="Next scene" onClick={() => {
                if (!timeline) return;
                let elapsed = 0;
                for (const scene of scenes) {
                  elapsed += scene.duration;
                  if (scene.id === displayScene?.id) { onSeek(Math.min(elapsed, totalDuration - 0.01)); return; }
                }
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </TransportBtn>

              <TransportBtn
                title={isMuted ? "Unmute" : "Mute"}
                onClick={() => {
                  setIsMuted((m) => {
                    if (bgmRef.current) bgmRef.current.volume = m ? volume : 0;
                    return !m;
                  });
                }}
              >
                {isMuted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </TransportBtn>

              {bgmSrc && !isMuted && (
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  title={`Volume ${Math.round(volume * 100)}%`}
                  style={{
                    width: 60, height: 3, accentColor: "var(--accent)",
                    cursor: "pointer", borderRadius: 2,
                  }}
                />
              )}
            </div>
          </div>

          {/* ── Right sidebar: scene info ── */}
          {isPortrait && displayScene && (
            <div style={{
              width: 156, flexShrink: 0, paddingLeft: 10, paddingRight: 10,
              display: "flex", flexDirection: "column", gap: 10,
              maxHeight: "clamp(300px, 62vh, 600px)", overflowY: "auto",
              alignSelf: "flex-start",
            }}>
              {/* Scene name + duration */}
              <div>
                <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>
                  SCENE {(displayScene.order ?? 0) + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>
                  {displayScene.label}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                  <span className="chip chip-mood" style={{ fontSize: 8.5 }}>{displayScene.mood ?? "—"}</span>
                  <span className="chip chip-transition" style={{ fontSize: 8.5 }}>{displayScene.transition?.type ?? "cut"}</span>
                  <span className="chip chip-audio" style={{ fontSize: 8.5 }}>{displayScene.duration}s</span>
                  {bgmSrc && <span className="chip chip-logo" style={{ fontSize: 8.5 }}>{isMuted ? "muted" : "♪"}</span>}
                </div>
              </div>

              {/* Description */}
              {displayScene.description && (
                <div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 3 }}>
                    DESCRIPTION
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {displayScene.description}
                  </div>
                </div>
              )}

              {/* Captions */}
              {(displayScene.captions?.length ?? 0) > 0 && (
                <div>
                  <div style={{ fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>
                    CAPTIONS ({displayScene.captions!.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {displayScene.captions!.map((cap, i) => (
                      <div key={i} style={{
                        padding: "4px 6px", borderRadius: 4,
                        background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                        fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4,
                      }}>
                        <div style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 1 }}>
                          {cap.startTime}s–{cap.endTime}s
                        </div>
                        {cap.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand overrides indicator */}
              {brandOverrides && Object.values(brandOverrides).some(Boolean) && (
                <div>
                  <div style={{ fontSize: 8, color: "var(--accent)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 3 }}>
                    ✦ BRAND OVERRIDES
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {brandOverrides.colorGrade && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>Grade: {brandOverrides.colorGrade}</div>}
                    {brandOverrides.fontFamily && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>Font: {brandOverrides.fontFamily}</div>}
                    {brandOverrides.primaryColor && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--text-muted)" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: brandOverrides.primaryColor, border: "1px solid var(--border)" }} />
                        {brandOverrides.primaryColor}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Scrub bar with scene markers ── */
function ScrubBar({
  progress, totalDuration, currentTime, onSeek, scenes,
}: {
  progress: number; totalDuration: number; currentTime: number;
  onSeek: (t: number) => void; scenes: Scene[];
}) {
  void currentTime;
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDuration);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        height: 6, borderRadius: 3,
        background: "var(--bg-elevated)",
        position: "relative", cursor: "pointer",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Fill */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${progress * 100}%`,
        background: "var(--accent)", borderRadius: 3,
        transition: "width 0.04s linear",
      }} />

      {/* Scene boundary markers */}
      {(() => {
        let elapsed = 0;
        return scenes.slice(0, -1).map((scene, i) => {
          elapsed += scene.duration;
          const pct = (elapsed / totalDuration) * 100;
          return (
            <div key={i} style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${pct}%`, width: 1,
              background: "rgba(255,255,255,0.15)",
              pointerEvents: "none",
            }} />
          );
        });
      })()}

      {/* Thumb */}
      <div style={{
        position: "absolute", top: "50%",
        left: `${progress * 100}%`,
        transform: "translate(-50%, -50%)",
        width: 12, height: 12, borderRadius: "50%",
        background: "var(--accent)",
        border: "2px solid var(--bg-base)",
        transition: "left 0.04s linear",
        pointerEvents: "none",
        boxShadow: "0 0 6px rgba(201,169,110,0.4)",
      }} />
    </div>
  );
}

/* ── Empty / Generating states ── */
function EmptyState({ noScenes = false }: { noScenes?: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 14, color: "var(--text-muted)", maxWidth: 300, textAlign: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        border: "1px dashed var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(201,169,110,0.04)",
      }}>
        {noScenes ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
          {noScenes ? "No scenes in lineup" : "No lineup yet"}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
          {noScenes
            ? "The generated lineup has no scenes. Try a more detailed prompt — e.g. \"Create a 20-second Instagram ad with 4 scenes\""
            : "Enter a prompt above to generate your first AI video lineup"}
        </div>
      </div>
      {noScenes && (
        <div style={{
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(201,169,110,0.08)",
          border: "1px solid var(--accent-dim)",
          fontSize: 11,
          color: "var(--accent)",
          lineHeight: 1.5,
        }}>
          Tip: Start with something like<br/>
          <em>"Create a 20-second luxury ad with 5 scenes"</em>
        </div>
      )}
    </div>
  );
}

function GeneratingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "var(--text-secondary)" }}>
      <div style={{
        width: 50, height: 50, borderRadius: "50%",
        border: "2px solid var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "pulse-glow 1.5s ease infinite",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
        </svg>
      </div>
      <div style={{ fontSize: 13 }}>Generating lineup with Gemini...</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 220 }}>
        {["Analyzing brand context", "Planning scene structure", "Writing captions", "Setting transitions"].map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.4 + i * 0.15 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Transport button ── */
function TransportBtn({
  children, title, onClick,
}: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-dim)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {children}
    </button>
  );
}
