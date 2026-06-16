"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Scene, Timeline } from "@/types/timeline";
import type { OutroTemplate } from "@/types/outro";
import type { UploadedClip } from "@/types/clips";
import type { StudioCaption } from "@/types/captions";
import TransitionLibrary from "./TransitionLibrary";

const SCENE_COLORS = [
  "#c9a96e", "#a78bfa", "#6ee7b7", "#f472b6", "#fcd34d",
  "#60a5fa", "#f87171", "#34d399", "#fb923c", "#818cf8",
];

const TRANSITION_ICONS: Record<string, string> = {
  "cut": "⟶",
  "fade": "≈",
  "dissolve": "∼",
  "cinematic-fade": "◈",
  "zoom-in": "⊕",
  "zoom-out": "⊖",
  "slide-left": "←",
  "slide-right": "→",
  "wipe-left": "◁",
  "wipe-right": "▷",
};

interface TimelinePanelProps {
  timeline: Timeline | null;
  activeSceneId: string | null;
  onSceneSelect: (id: string) => void;
  onExport: () => void;
  isExporting: boolean;
  currentTime: number;
  onSeek: (t: number) => void;
  onSceneDurationChange?: (sceneId: string, newDuration: number) => void;
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
  clips?: UploadedClip[];
  onScenesReorder?: (fromIdx: number, toIdx: number) => void;
  onClipInsert?: (position: number, file: File) => void;
  // Text Studio
  captions?: StudioCaption[];
  selectedCaptionId?: string | null;
  onCaptionSelect?: (id: string | null) => void;
  onCaptionUpdate?: (id: string, patch: Partial<StudioCaption>) => void;
  // Brand Outro
  outroConfig?: OutroTemplate | null;
  outroSceneId?: string | null;
}

export default function TimelinePanel({
  timeline,
  activeSceneId,
  onSceneSelect,
  onExport,
  isExporting,
  currentTime,
  onSeek,
  onSceneDurationChange,
  onSceneUpdate,
  clips = [],
  onScenesReorder,
  onClipInsert,
  captions = [],
  selectedCaptionId = null,
  onCaptionSelect,
  onCaptionUpdate,
  outroConfig = null,
  outroSceneId = null,
}: TimelinePanelProps) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [librarySceneId, setLibrarySceneId] = useState<string | null>(null);

  const pixelsPerSecond = 44 * zoom;

  // Auto-scroll to keep playhead visible during playback
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !timeline) return;
    const TRACK_LABEL_W = 30;
    const playheadLeft = TRACK_LABEL_W + currentTime * pixelsPerSecond;
    const { scrollLeft, clientWidth } = el;
    const margin = 80;
    if (playheadLeft < scrollLeft + margin) {
      el.scrollLeft = Math.max(0, playheadLeft - margin);
    } else if (playheadLeft > scrollLeft + clientWidth - margin) {
      el.scrollLeft = playheadLeft - clientWidth + margin;
    }
  }, [currentTime, pixelsPerSecond, timeline]);

  if (!timeline) {
    return (
      <div
        style={{
          height: 100,
          background: "#07071a",
          borderTop: "1px solid rgba(124,58,237,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        Timeline will appear after generating a lineup
      </div>
    );
  }

  const totalDuration = timeline.totalDuration;

  return (
    <>
    <div
      style={{
        height: 220,
        background: "#07071a",
        borderTop: "1px solid rgba(124,58,237,0.2)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Timeline toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderBottom: "1px solid rgba(124,58,237,0.1)",
          flexShrink: 0,
          background: "rgba(124,58,237,0.03)",
        }}
      >
        <div style={{ display: "flex", gap: 2 }}>
          <ToolbarButton title="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </ToolbarButton>
          <ToolbarButton title="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </ToolbarButton>
        </div>

        <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />

        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          {timeline.scenes?.length ?? 0} SCENES · {totalDuration}s · {timeline.aspectRatio}
        </div>

        <div style={{ flex: 1 }} />

        {/* QA score badge */}
        {timeline.meta?.qaScore !== undefined && (
          <QABadge score={timeline.meta.qaScore} />
        )}

        {/* Export button */}
        <button
          onClick={onExport}
          disabled={isExporting}
          style={{
            padding: "5px 14px",
            borderRadius: 6,
            border: "none",
            background: isExporting
              ? "rgba(124,58,237,0.15)"
              : "linear-gradient(135deg, #7c3aed, #06b6d4)",
            color: isExporting ? "#7c3aed" : "#fff",
            fontSize: 11,
            fontWeight: 700,
            cursor: isExporting ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: isExporting ? "none" : "0 2px 10px rgba(124,58,237,0.35)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { if (!isExporting) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.5)"; } }}
          onMouseLeave={e => { if (!isExporting) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(124,58,237,0.35)"; } }}
        >
          {isExporting ? "Exporting..." : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </>
          )}
        </button>
      </div>

      {/* Time ruler */}
      <TimeRuler totalDuration={totalDuration} pixelsPerSecond={pixelsPerSecond} onSeek={onSeek} />

      {/* Track area */}
      <div
        ref={scrollRef}
        onPointerDown={(e) => {
          // Only seek if clicking on the background, not on scene chips
          if ((e.target as HTMLElement).closest('[data-scene-chip]')) return;
          if ((e.target as HTMLElement).closest('[data-caption-chip]')) return;
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const scrollLeft = el.scrollLeft;
          const OFFSET = 30;
          const x = e.clientX - rect.left + scrollLeft - OFFSET;
          onSeek(Math.max(0, Math.min(totalDuration, x / pixelsPerSecond)));
        }}
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "6px 12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "relative",
        }}
      >
        {/* Moving playhead */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 18 + 12 + currentTime * pixelsPerSecond,
            width: 1,
            background: "#7c3aed",
            boxShadow: "0 0 6px rgba(124,58,237,0.7)",
            pointerEvents: "none",
            zIndex: 10,
            transition: "left 0.05s linear",
          }}
        >
          {/* Playhead triangle */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "6px solid #7c3aed",
          }} />
        </div>

        {/* Video track */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }} ref={trackRef}>
          <TrackLabel>V</TrackLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
            {/* Insert button before first clip */}
            {onClipInsert && (
              <InsertClipButton key="ins-0" position={0} onInsert={onClipInsert} />
            )}
            {(timeline.scenes ?? []).flatMap((scene, i) => {
              const scenes = timeline.scenes ?? [];
              const assignedClip = clips.find((c) => c.id && c.assignedToSceneId === scene.id)
                ?? clips.find((c) => c.objectUrl === scene.clipSrc);
              const chip = (
                <SceneChip
                  key={scene.id}
                  scene={scene}
                  index={i}
                  color={SCENE_COLORS[i % SCENE_COLORS.length]}
                  pixelsPerSecond={pixelsPerSecond}
                  isActive={scene.id === activeSceneId}
                  onClick={() => onSceneSelect(scene.id)}
                  onDurationChange={onSceneDurationChange}
                  onSceneUpdate={onSceneUpdate}
                  clip={assignedClip}
                  isDragOver={dragOverIdx === i}
                  onDragStart={(idx) => setDragFromIdx(idx)}
                  onDragOver={(idx) => setDragOverIdx(idx)}
                  onDrop={(idx) => {
                    if (dragFromIdx !== null && dragFromIdx !== idx) {
                      onScenesReorder?.(dragFromIdx, idx);
                    }
                    setDragFromIdx(null);
                    setDragOverIdx(null);
                  }}
                />
              );
              // Connector between scene[i] and scene[i+1].
              // The transition belongs to the INCOMING scene (scene[i+1]) —
              // CanvasPreview reads displayScene.transition which is the next scene.
              const nextScene = scenes[i + 1];
              const connector = (onSceneUpdate && nextScene) ? (
                <TransitionConnector
                  key={`tc-${scene.id}`}
                  scene={nextScene}
                  onOpenLibrary={() => setLibrarySceneId(nextScene.id)}
                />
              ) : null;
              const inserter = onClipInsert ? (
                <InsertClipButton key={`ins-${i + 1}`} position={i + 1} onInsert={onClipInsert} />
              ) : null;

              if (i < scenes.length - 1) {
                return connector
                  ? [chip, connector, ...(inserter ? [inserter] : [])]
                  : [chip, ...(inserter ? [inserter] : [])];
              }
              // Last chip — only append inserter (no connector)
              return [chip, ...(inserter ? [inserter] : [])];
            })}
          </div>
        </div>

        {/* Studio caption track */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <TrackLabel style={{ color: "#a5b4fc" }}>T</TrackLabel>
          <div style={{ position: "relative", height: 22, width: totalDuration * pixelsPerSecond }}>
            {/* empty track bg */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(165,180,252,0.04)",
              borderRadius: 3, border: "1px solid rgba(165,180,252,0.08)",
            }} />
            {captions.map(cap => {
              const isSel = cap.id === selectedCaptionId;
              const left = cap.startTime * pixelsPerSecond;
              const width = Math.max(8, (cap.endTime - cap.startTime) * pixelsPerSecond);
              const capColor = isSel ? "#a5b4fc" : "rgba(165,180,252,0.55)";
              return (
                <div
                  key={cap.id}
                  title={cap.text}
                  onClick={() => onCaptionSelect?.(cap.id)}
                  style={{
                    position: "absolute", top: 2, height: 18,
                    left, width,
                    background: isSel ? "rgba(165,180,252,0.22)" : "rgba(165,180,252,0.1)",
                    border: `1px solid ${capColor}`,
                    borderRadius: 4, cursor: "pointer",
                    display: "flex", alignItems: "center", overflow: "hidden",
                    transition: "background 0.1s",
                  }}
                >
                  <span style={{
                    fontSize: 8.5, color: capColor, fontWeight: 600,
                    paddingLeft: 4, whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis", pointerEvents: "none",
                  }}>{cap.text}</span>
                  {/* Drag-resize right edge */}
                  <div
                    onPointerDown={e => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const origEnd = cap.endTime;
                      const move = (me: PointerEvent) => {
                        const dx = (me.clientX - startX) / pixelsPerSecond;
                        onCaptionUpdate?.(cap.id, { endTime: Math.max(cap.startTime + 0.5, origEnd + dx) });
                      };
                      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    }}
                    style={{
                      position: "absolute", right: 0, top: 0, bottom: 0, width: 6,
                      cursor: "e-resize", background: "transparent",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio track */}
        {(timeline.audioLayers?.length ?? 0) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <TrackLabel style={{ color: "#f9a8d4" }}>A</TrackLabel>
            <div
              style={{
                height: 14,
                width: totalDuration * pixelsPerSecond,
                borderRadius: 3,
                background: "rgba(249,168,212,0.12)",
                border: "1px solid rgba(249,168,212,0.2)",
                display: "flex",
                alignItems: "center",
                padding: "0 6px",
              }}
            >
              <div style={{ fontSize: 9, color: "rgba(249,168,212,0.6)", letterSpacing: "0.04em" }}>
                BGM · {(timeline.audioLayers?.[0]?.volume ?? 0.7) * 100}%
              </div>
            </div>
          </div>
        )}

        {/* Brand Outro track */}
        {outroConfig && outroSceneId && (() => {
          const outroScene = timeline.scenes.find(s => s.id === outroSceneId);
          if (!outroScene) return null;
          let outroStart = 0;
          for (const s of timeline.scenes) {
            if (s.id === outroSceneId) break;
            outroStart += s.duration;
          }
          const outroW = outroScene.duration * pixelsPerSecond;
          const outroLeft = outroStart * pixelsPerSecond;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <TrackLabel style={{ color: "#c9a96e" }}>B</TrackLabel>
              <div style={{ position: "relative", width: totalDuration * pixelsPerSecond, height: 22 }}>
                <div style={{
                  position: "absolute", top: 2, height: 18, left: outroLeft, width: Math.max(8, outroW),
                  background: "rgba(201,169,110,0.18)", border: "1.5px solid rgba(201,169,110,0.6)",
                  borderRadius: 5, display: "flex", alignItems: "center", overflow: "hidden", cursor: "pointer",
                }} onClick={() => {}}>
                  <span style={{ fontSize: 8.5, color: "#c9a96e", fontWeight: 700, paddingLeft: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    ★ {outroConfig.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>

    {/* Transition library modal */}
    {librarySceneId && onSceneUpdate && (() => {
      const scenes = timeline.scenes ?? [];
      const tScene = scenes.find(s => s.id === librarySceneId) ?? null;
      const tSceneIdx = scenes.findIndex(s => s.id === librarySceneId);
      const prevScene = tSceneIdx > 0 ? scenes[tSceneIdx - 1] : null;
      return (
        <TransitionLibrary
          sceneId={librarySceneId}
          sceneName={tScene?.label ?? "Scene"}
          currentTransition={tScene?.transition}
          scene={tScene}
          prevScene={prevScene}
          timeline={timeline}
          onApply={(cfg) => {
            onSceneUpdate(librarySceneId, {
              transition: {
                type: cfg.type as import("@/types/timeline").TransitionType,
                duration: cfg.duration,
                speed: cfg.speed,
                intensity: cfg.intensity,
                direction: cfg.direction,
                mode: cfg.mode,
                easing: cfg.easing,
                blurAmount: cfg.blurAmount,
                motionStrength: cfg.motionStrength,
              },
            });
          }}
          onClose={() => setLibrarySceneId(null)}
        />
      );
    })()}
    </>
  );
}

function InsertClipButton({ position, onInsert }: { position: number; onInsert: (pos: number, file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif,.webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onInsert(position, file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        title={`Insert clip at position ${position + 1}`}
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          background: "var(--bg-elevated)",
          border: "1.5px dashed var(--border-subtle)",
          color: "var(--text-muted)", fontSize: 12,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 1px", transition: "all 0.12s ease", lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)";
          e.currentTarget.style.color = "#a78bfa";
          e.currentTarget.style.background = "rgba(124,58,237,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "var(--bg-elevated)";
        }}
      >
        +
      </button>
    </>
  );
}

function TrackLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: 20,
        fontSize: 8,
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.1em",
        flexShrink: 0,
        textAlign: "center",
        paddingLeft: 2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TimeRuler({ totalDuration, pixelsPerSecond, onSeek }: { totalDuration: number; pixelsPerSecond: number; onSeek: (t: number) => void }) {
  const marks = Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => i);
  const OFFSET = 18 + 12; // track label width + padding

  const seekFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - OFFSET;
    onSeek(Math.max(0, Math.min(totalDuration, x / pixelsPerSecond)));
  }, [totalDuration, pixelsPerSecond, onSeek]);

  return (
    <div
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seekFromEvent(e); }}
      onPointerMove={e => { if (e.buttons === 1) seekFromEvent(e); }}
      style={{
        height: 18, paddingLeft: OFFSET,
        display: "flex", alignItems: "flex-end",
        overflowX: "hidden", flexShrink: 0,
        borderBottom: "1px solid rgba(124,58,237,0.1)",
        cursor: "col-resize", position: "relative",
        userSelect: "none",
      }}
    >
      {marks.map((t) => (
        <div key={t} style={{
          position: "absolute",
          left: OFFSET + t * pixelsPerSecond,
          display: "flex", flexDirection: "column", alignItems: "center",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 8.5, color: "var(--text-muted)", marginBottom: 2, whiteSpace: "nowrap" }}>
            {t % 5 === 0 ? `${t}s` : ""}
          </div>
          <div style={{ width: 1, height: t % 5 === 0 ? 6 : 3, background: t % 5 === 0 ? "var(--border)" : "var(--border-subtle)" }} />
        </div>
      ))}
    </div>
  );
}

function SceneChip({
  scene, index, color, pixelsPerSecond, isActive, onClick, onDurationChange, onSceneUpdate, clip,
  isDragOver, onDragStart, onDragOver, onDrop,
}: {
  scene: Scene; index: number; color: string; pixelsPerSecond: number; isActive: boolean; onClick: () => void;
  onDurationChange?: (id: string, duration: number) => void;
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
  clip?: UploadedClip;
  isDragOver?: boolean;
  onDragStart?: (idx: number) => void;
  onDragOver?: (idx: number) => void;
  onDrop?: (idx: number) => void;
}) {
  const width = scene.duration * pixelsPerSecond;
  const chipWidth = Math.max(width - 2, 32);
  const transIcon = TRANSITION_ICONS[scene.transition?.type ?? "cut"] ?? "⟶";
  const dragRef = useRef<{ startX: number; startDur: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Show video from: assigned clip, or scene.clipSrc
  const mediaSrc = clip?.objectUrl ?? (scene.clipSrc as string | undefined);
  const mediaType = clip?.type ?? scene.clipType;
  const hasMedia = !!mediaSrc;

  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onSceneUpdate && !onDurationChange) return;
    dragRef.current = {
      startX: e.clientX,
      startDur: (scene.clipTrimEnd ?? scene.duration) - (scene.clipTrimStart ?? 0),
    };
    setIsDragging(true);

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const deltaSec = (ev.clientX - dragRef.current.startX) / pixelsPerSecond;
      if (onSceneUpdate) {
        const trimStart = scene.clipTrimStart ?? 0;
        const clipMaxDur = clip?.duration ?? (scene.clipTrimEnd ?? scene.duration);
        const newTrimEnd = Math.min(
          clipMaxDur,
          Math.max(trimStart + 0.5, dragRef.current.startDur + deltaSec + trimStart)
        );
        const newDur = parseFloat((newTrimEnd - trimStart).toFixed(3));
        onSceneUpdate(scene.id, { clipTrimEnd: newTrimEnd, duration: newDur });
      } else if (onDurationChange) {
        const newDuration = Math.max(1, Math.round((dragRef.current.startDur + deltaSec) * 2) / 2);
        onDurationChange(scene.id, newDuration);
      }
    }

    function onUp() {
      dragRef.current = null;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [scene.id, scene.duration, scene.clipTrimStart, scene.clipTrimEnd, pixelsPerSecond, onDurationChange, onSceneUpdate, clip]);

  const borderColor = isDragOver
    ? "var(--accent)"
    : isActive
    ? color
    : isDragging
    ? color
    : "var(--border-subtle)";

  return (
    <div
      data-scene-chip="1"
      className={`timeline-scene ${isActive ? "active" : ""}`}
      onClick={onClick}
      draggable={true}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(index); }}
      onDrop={() => onDrop?.(index)}
      title={`${scene.label} · ${scene.duration}s${hasMedia ? " · has clip" : ""} · drag right edge to resize`}
      style={{
        width: chipWidth,
        height: hasMedia ? 72 : 38,
        borderRadius: 5,
        border: `1.5px solid ${borderColor}`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        cursor: isDragging ? "col-resize" : "pointer",
        userSelect: "none",
        background: hasMedia ? "#000" : isActive ? `${color}22` : "var(--scene-chip)",
        boxShadow: isActive ? `0 0 0 1px ${color}40` : isDragOver ? `0 0 0 2px var(--accent)` : "none",
        transition: "border-color 0.12s ease, box-shadow 0.12s ease",
        opacity: isDragOver ? 0.85 : 1,
      }}
    >
      {/* ── Media thumbnail ── */}
      {hasMedia && mediaType === "video" && (
        <video
          ref={videoRef}
          src={mediaSrc}
          muted
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            // Seek to trim start (or 10% in) to show a representative frame
            v.currentTime = scene.clipTrimStart ?? Math.min((scene.duration * 0.1), 0.5);
          }}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: isActive ? 1 : 0.75,
            transition: "opacity 0.12s ease",
          }}
        />
      )}
      {hasMedia && mediaType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaSrc}
          alt={scene.label}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: isActive ? 1 : 0.75,
          }}
        />
      )}

      {/* ── Gradient overlay (always) ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: hasMedia
          ? `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,${isActive ? 0.65 : 0.55}) 100%)`
          : "none",
        pointerEvents: "none",
      }} />

      {/* ── Left color accent bar ── */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: color,
        borderRadius: "3px 0 0 3px",
        zIndex: 2,
      }} />

      {/* ── Text info — pinned to bottom ── */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: hasMedia ? "3px 7px 3px 6px" : "3px 7px 3px 8px",
        zIndex: 3,
      }}>
        {/* Scene number + transition icon — top of chip when has media */}
        {hasMedia && (
          <div style={{
            position: "absolute", top: hasMedia ? -54 : -26, left: 6,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#fff",
              background: `${color}cc`, padding: "1px 4px", borderRadius: 3,
            }}>{index + 1}</span>
            {scene.transition && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }} title={scene.transition.type}>
                {transIcon}
              </span>
            )}
          </div>
        )}

        <div style={{
          fontSize: 9.5, fontWeight: 600,
          color: hasMedia ? "#fff" : (isActive ? color : "var(--text-secondary)"),
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          lineHeight: 1.2,
          textShadow: hasMedia ? "0 1px 3px rgba(0,0,0,0.9)" : "none",
        }}>
          {scene.label}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
          <span style={{
            fontSize: 8.5,
            color: isDragging ? color : (hasMedia ? "rgba(255,255,255,0.7)" : "var(--text-muted)"),
            fontWeight: isDragging ? 700 : 400,
            textShadow: hasMedia ? "0 1px 2px rgba(0,0,0,0.8)" : "none",
          }}>{scene.duration}s</span>

          {!hasMedia && scene.transition && (
            <span style={{ fontSize: 9, color: "var(--text-muted)" }} title={scene.transition.type}>
              {transIcon}
            </span>
          )}

          {(scene.captions?.length ?? 0) > 0 && (
            <span style={{
              fontSize: 8, padding: "1px 3px", borderRadius: 2,
              background: hasMedia ? "rgba(165,180,252,0.3)" : "rgba(165,180,252,0.12)",
              color: "#a5b4fc",
              textShadow: "none",
            }}>
              {scene.captions!.length}C
            </span>
          )}

          {scene.clipTrimStart != null && scene.clipTrimEnd != null && (
            <span style={{
              fontSize: 8, color: hasMedia ? "rgba(255,255,255,0.5)" : "var(--text-muted)",
              textShadow: hasMedia ? "0 1px 2px rgba(0,0,0,0.8)" : "none",
            }}>
              {scene.clipTrimStart}–{scene.clipTrimEnd}s
            </span>
          )}
        </div>
      </div>

      {/* ── Resize handle ── */}
      {(onDurationChange || onSceneUpdate) && (
        <div
          onMouseDown={handleResizeDown}
          title="Drag to resize"
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0,
            width: 10, cursor: "col-resize", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderLeft: isDragging ? `2px solid ${color}` : "2px solid transparent",
            background: isDragging ? `${color}20` : "transparent",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderLeftColor = `${color}90`;
              e.currentTarget.style.background = `${color}15`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.borderLeftColor = "transparent";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <div style={{
            width: 2, height: 14,
            background: isDragging ? color : `${color}80`,
            borderRadius: 1,
          }} />
        </div>
      )}
    </div>
  );
}

function CaptionTrackChip({ scene, pixelsPerSecond, captionCount }: { scene: Scene; index: number; pixelsPerSecond: number; captionCount: number }) {
  return (
    <div
      style={{
        width: Math.max(scene.duration * pixelsPerSecond - 2, 24),
        height: 14,
        borderRadius: 3,
        background: "rgba(165,180,252,0.08)",
        border: "1px solid rgba(165,180,252,0.15)",
        display: "flex",
        alignItems: "center",
        padding: "0 4px",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 8.5, color: "rgba(165,180,252,0.5)", whiteSpace: "nowrap" }}>
        {scene.captions?.[0]?.text?.slice(0, 12) ?? ""}
        {(scene.captions?.[0]?.text?.length ?? 0) > 12 ? "…" : ""}
      </div>
    </div>
  );
}


function TransitionConnector({
  scene,
  onOpenLibrary,
}: {
  scene: Scene;
  onOpenLibrary: () => void;
}) {
  const currentType = scene.transition?.type ?? "cut";
  const currentDur  = scene.transition?.duration ?? 0;
  const icon = TRANSITION_ICONS[currentType] ?? "⟶";
  const isNonCut = currentType !== "cut";

  const shortLabel = currentType === "cut"
    ? "CUT"
    : currentType.split("-").map(w => w[0].toUpperCase()).join("");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, margin: "0 2px", position: "relative", zIndex: 5 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onOpenLibrary(); }}
        title={`Transition: ${currentType} — click to edit`}
        style={{
          height: 24, borderRadius: 12, flexShrink: 0, padding: "0 8px",
          minWidth: 40,
          background: isNonCut ? "rgba(124,58,237,0.15)" : "rgba(13,13,34,0.8)",
          border: `1.5px solid ${isNonCut ? "rgba(124,58,237,0.45)" : "rgba(124,58,237,0.15)"}`,
          color: isNonCut ? "#a78bfa" : "var(--text-muted)",
          fontSize: 9, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)";
          e.currentTarget.style.background = "rgba(124,58,237,0.22)";
          e.currentTarget.style.color = "#a78bfa";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isNonCut ? "rgba(124,58,237,0.45)" : "rgba(124,58,237,0.15)";
          e.currentTarget.style.background = isNonCut ? "rgba(124,58,237,0.15)" : "rgba(13,13,34,0.8)";
          e.currentTarget.style.color = isNonCut ? "#a78bfa" : "var(--text-muted)";
        }}
      >
        <span style={{ fontSize: 9 }}>{icon}</span>
        <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.02em" }}>{shortLabel}</span>
      </button>
      {isNonCut && currentDur > 0 && (
        <div style={{ fontSize: 7, color: "#a78bfa", opacity: 0.65, marginTop: 1, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {currentDur.toFixed(1)}s
        </div>
      )}
    </div>
  );
}

function QABadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--error)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 4,
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color, letterSpacing: "0.04em" }}>
        QA {score}
      </span>
    </div>
  );
}

function ToolbarButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        borderRadius: 5,
        border: "1px solid rgba(124,58,237,0.2)",
        background: "rgba(124,58,237,0.06)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "rgba(124,58,237,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(124,58,237,0.06)"; }}
    >
      {children}
    </button>
  );
}
