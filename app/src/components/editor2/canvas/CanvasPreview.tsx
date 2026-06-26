"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { useEditorStore, selectSceneAtTime, type Scene, type Caption, type AspectRatio, type ColorAdjustments } from "@/store/editorStore";

const COLOR_GRADE_FILTERS: Record<string, string> = {
  "Cinematic Grade":  "contrast(1.15) saturate(0.85) brightness(0.95) sepia(0.08)",
  "Vintage Film":     "sepia(0.4) contrast(1.1) brightness(0.9) saturate(0.8)",
  "Teal & Orange":    "saturate(1.2) hue-rotate(5deg) contrast(1.1)",
  "Black & White":    "grayscale(1) contrast(1.1)",
  "Warm Sunset":      "sepia(0.25) brightness(1.05) saturate(1.2) hue-rotate(-10deg)",
  "Cool Mist":        "saturate(0.75) brightness(1.05) hue-rotate(15deg)",
  "Neon Glow":        "saturate(1.5) contrast(1.1) brightness(1.05)",
  "Desaturated":      "saturate(0.4) contrast(1.05)",
};

function buildCSSFilter(grade: string | null, adj: ColorAdjustments): string {
  const parts: string[] = [];
  if (adj.exposure !== 0) parts.push(`brightness(${1 + adj.exposure * 0.3})`);
  if (adj.contrast !== 0) parts.push(`contrast(${1 + adj.contrast / 100})`);
  if (adj.saturation !== 0) parts.push(`saturate(${1 + adj.saturation / 100})`);
  if (adj.tint !== 0) parts.push(`hue-rotate(${adj.tint * 0.5}deg)`);
  if (grade && COLOR_GRADE_FILTERS[grade]) parts.push(COLOR_GRADE_FILTERS[grade]);
  return parts.length ? parts.join(" ") : "none";
}

const RATIOS: Record<AspectRatio, [number, number]> = {
  "9:16": [9, 16], "16:9": [16, 9], "1:1": [1, 1], "4:5": [4, 5], "3:4": [3, 4],
};
function calcDims(ar: AspectRatio, maxW: number, maxH: number) {
  const [rw, rh] = RATIOS[ar];
  let w = maxW, h = (maxW / rw) * rh;
  if (h > maxH) { h = maxH; w = (maxH / rh) * rw; }
  return { w: Math.max(40, Math.floor(w)), h: Math.max(40, Math.floor(h)) };
}

const MOOD_COLORS: Record<string, [string, string]> = {
  luxury:   ["#2A1F0E", "#C9A96E"],
  energetic:["#1A0808", "#EF4444"],
  calm:     ["#081218", "#60A5FA"],
  dramatic: ["#0E0818", "#A78BFA"],
  playful:  ["#081A10", "#34D399"],
  neutral:  ["#111118", "#94A3B8"],
  cinematic:["#0A0A10", "#818CF8"],
};

// ── Caption overlay ──────────────────────────────────────────────────────────
const CaptionOverlay = memo(function CaptionOverlay({ caption, currentTime }: { caption: Caption; currentTime: number }) {
  const visible = currentTime >= caption.startTime && currentTime <= caption.endTime;
  if (!visible) return null;
  const progress = (currentTime - caption.startTime) / Math.max(0.01, caption.endTime - caption.startTime);
  let opacity = 1;
  if (caption.animation === "fade") {
    if (progress < 0.12) opacity = progress / 0.12;
    else if (progress > 0.88) opacity = (1 - progress) / 0.12;
  }
  let transform = "none";
  if (caption.animation === "slide-up") transform = `translateY(${(1 - Math.min(progress * 8, 1)) * 16}px)`;
  if (caption.animation === "slide-down") transform = `translateY(${-(1 - Math.min(progress * 8, 1)) * 16}px)`;
  if (caption.animation === "scale") transform = `scale(${0.8 + Math.min(progress * 5, 1) * 0.2})`;
  if (caption.animation === "bounce") {
    const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * (1 - progress) * 6;
    transform = `translateY(-${bounce}px)`;
  }

  return (
    <div style={{
      position: "absolute",
      left: `${caption.x}%`, top: `${caption.y}%`,
      transform, opacity, pointerEvents: "none", maxWidth: "80%",
    }}>
      <div style={{
        display: "inline-block", fontFamily: caption.fontFamily,
        fontSize: caption.fontSize, color: caption.color,
        fontWeight: caption.bold ? 700 : 400, fontStyle: caption.italic ? "italic" : "normal",
        textAlign: caption.align, letterSpacing: caption.letterSpacing, lineHeight: caption.lineHeight,
        background: caption.bgOpacity > 0
          ? `rgba(${parseInt(caption.bgColor.slice(1, 3), 16)},${parseInt(caption.bgColor.slice(3, 5), 16)},${parseInt(caption.bgColor.slice(5, 7), 16)},${caption.bgOpacity})`
          : "transparent",
        padding: "4px 12px", borderRadius: 4,
        textShadow: caption.shadow ? "0 2px 8px rgba(0,0,0,0.8)" : "none",
        WebkitTextStroke: caption.stroke ? `1px ${caption.strokeColor}` : "none",
      }}>
        {caption.animation === "typewriter"
          ? caption.text.slice(0, Math.ceil(caption.text.length * Math.min(progress * 2, 1)))
          : caption.text}
      </div>
    </div>
  );
});

// ── Scene visual ─────────────────────────────────────────────────────────────
const SceneVisual = memo(function SceneVisual({
  scene, isPlaying, currentTime, width, height, onUploadClick,
}: {
  scene: Scene; isPlaying: boolean; currentTime: number;
  width: number; height: number; onUploadClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const moodPair = MOOD_COLORS[scene.mood] ?? MOOD_COLORS.neutral;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || scene.clipType !== "video") return;
    setVideoError(false);
    if (isPlaying) {
      const t = setTimeout(() => { vid.play().catch(() => setVideoError(true)); }, 80);
      return () => clearTimeout(t);
    } else {
      vid.pause();
    }
  }, [isPlaying, scene.clipSrc, scene.clipType]);

  const hasMedia = !!scene.clipSrc && !videoError;
  const adj = scene.colorAdjustments ?? { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
  const cssFilter = buildCSSFilter(scene.colorGrade, adj);

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden",
      filter: cssFilter,
      background: hasMedia ? "#000" : `linear-gradient(155deg, ${moodPair[0]} 0%, color-mix(in srgb, ${moodPair[1]} 12%, ${moodPair[0]}) 100%)`,
    }}>
      {/* Video clip */}
      {scene.clipSrc && scene.clipType === "video" && !videoError && (
        <video
          ref={videoRef}
          src={scene.clipSrc}
          loop playsInline
          onLoadedData={e => { e.currentTarget.currentTime = 0; }}
          onError={() => setVideoError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
        />
      )}
      {/* Image clip */}
      {scene.clipSrc && scene.clipType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scene.clipSrc} alt={scene.label}
          onError={() => {}}
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
      )}

      {/* No clip — show rich placeholder */}
      {!hasMedia && (
        <>
          {/* Animated background grid */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `linear-gradient(${moodPair[1]} 1px, transparent 1px), linear-gradient(90deg, ${moodPair[1]} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }} />
          {/* Center content */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, padding: 20, textAlign: "center",
          }}>
            <div style={{
              fontSize: Math.max(10, Math.min(18, height * 0.03)),
              fontWeight: 700, color: `${moodPair[1]}`,
              opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.14em",
              fontFamily: "var(--font-sans)",
            }}>
              {scene.mood}
            </div>
            <div style={{
              fontSize: Math.max(12, Math.min(22, height * 0.04)),
              fontWeight: 800, color: "rgba(255,255,255,0.85)",
              letterSpacing: "-0.02em", lineHeight: 1.2,
              fontFamily: "var(--font-sans)", maxWidth: "90%",
            }}>
              {scene.label}
            </div>
            {scene.description && (
              <div style={{
                fontSize: Math.max(9, Math.min(13, height * 0.022)),
                color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: "85%",
              }}>
                {scene.description.length > 80 ? scene.description.slice(0, 78) + "…" : scene.description}
              </div>
            )}
            {/* Upload button */}
            <button onClick={onUploadClick} style={{
              marginTop: 8, padding: "7px 16px",
              background: `${moodPair[1]}22`, border: `1px solid ${moodPair[1]}44`,
              borderRadius: "var(--r-full)", color: moodPair[1],
              fontSize: Math.max(9, Math.min(12, height * 0.02)),
              fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.12s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${moodPair[1]}33`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${moodPair[1]}22`; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Upload Clip
            </button>
          </div>
          {/* Duration indicator */}
          <div style={{
            position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
            fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em",
          }}>
            {scene.duration}s
          </div>
        </>
      )}

      {/* Captions */}
      {scene.captions.map(cap => (
        <CaptionOverlay key={cap.id} caption={cap} currentTime={currentTime} />
      ))}
    </div>
  );
});

// ── Transport ─────────────────────────────────────────────────────────────────
function Transport() {
  const { isPlaying, currentTime, totalDuration, scenes, play, pause, stop, seek, isMuted, volume, setMuted, setVolume } = useEditorStore();
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const currentScene = useEditorStore(selectSceneAtTime);
  const sceneIdx = currentScene ? scenes.findIndex(s => s.id === currentScene.id) + 1 : 0;

  return (
    <div style={{ background: "rgba(8,8,10,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Seek bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", cursor: "pointer", position: "relative" }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek(((e.clientX - rect.left) / rect.width) * totalDuration);
        }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--accent)", borderRadius: 99, transition: "width 0.05s linear" }} />
      </div>
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", padding: "7px 12px", gap: 6 }}>
        <button onClick={stop} title="Stop" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4, display: "flex" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <button onClick={isPlaying ? pause : play} style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: "var(--accent)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
        }}>
          {isPlaying
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.55)", marginLeft: 4 }}>
          {fmt(currentTime)} / {fmt(totalDuration)}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", padding: "2px 6px", borderRadius: 99, background: "rgba(255,255,255,0.05)" }}>
          Scene {sceneIdx}/{scenes.length}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setMuted(!isMuted)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4, display: "flex" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMuted
              ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              : <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></>}
          </svg>
        </button>
        <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
          onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
          style={{ width: 56, accentColor: "var(--accent)" }} />
      </div>
    </div>
  );
}

// ── Transition overlay ────────────────────────────────────────────────────────
function useSceneTransition(currentSceneId: string | undefined) {
  const [transitionClass, setTransitionClass] = useState("");
  const prevId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevId.current !== currentSceneId && prevId.current !== undefined) {
      setTransitionClass("scene-flash");
      const t = setTimeout(() => setTransitionClass(""), 200);
      return () => clearTimeout(t);
    }
    prevId.current = currentSceneId;
  }, [currentSceneId]);

  return transitionClass;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CanvasPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isPlaying, currentTime, aspectRatio, scenes, isGenerating, addClip } = useEditorStore();
  const currentScene = useEditorStore(selectSceneAtTime);
  const [dims, setDims] = useState({ w: 360, h: 640 });
  const transitionClass = useSceneTransition(currentScene?.id);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 32;
      setDims(calcDims(aspectRatio, el.clientWidth - pad, el.clientHeight - 80 - pad));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectRatio]);

  const handleUploadForScene = useCallback((files: FileList | null) => {
    if (!files || !currentScene) return;
    const f = files[0];
    if (!f) return;
    const src = URL.createObjectURL(f);
    const type: "video" | "image" = f.type.startsWith("video/") ? "video" : "image";
    addClip({ id: currentScene.id + "_clip", name: f.name, src, type, file: f, duration: 4 });
    // Directly assign to current scene
    useEditorStore.getState().updateScene(currentScene.id, { clipId: currentScene.id + "_clip", clipSrc: src, clipType: type });
  }, [currentScene, addClip]);

  if (isGenerating) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--bg-base)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-bg)", border: "1px solid var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse-ai 1.5s ease infinite" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Generating your lineup…</div>
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--bg-base)", padding: 24, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.3"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>No Scenes Yet</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Generate a video in the AI Workspace or use a template.</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      {/* Canvas area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="video/*,image/*" style={{ display: "none" }}
          onChange={e => handleUploadForScene(e.target.files)} />

        {/* Frame */}
        <div
          className={transitionClass}
          style={{
            width: dims.w, height: dims.h, position: "relative",
            borderRadius: "var(--r-lg)", overflow: "hidden",
            boxShadow: "0 28px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {currentScene ? (
            <SceneVisual
              scene={currentScene}
              isPlaying={isPlaying}
              currentTime={currentTime}
              width={dims.w}
              height={dims.h}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#0A0A0E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Select a scene</div>
            </div>
          )}

          {/* Scene label */}
          {currentScene && (
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {currentScene.label}
            </div>
          )}
          {/* Aspect ratio */}
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
            {aspectRatio}
          </div>
        </div>
      </div>

      {/* Transport */}
      <Transport />
    </div>
  );
}
