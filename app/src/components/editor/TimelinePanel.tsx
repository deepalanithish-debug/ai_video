"use client";

import { useState, useRef, useCallback } from "react";
import type { Scene, Timeline } from "@/types/timeline";
import type { UploadedClip } from "@/types/clips";

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
  clips?: UploadedClip[];
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
  clips = [],
}: TimelinePanelProps) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!timeline) {
    return (
      <div
        style={{
          height: 100,
          background: "var(--timeline-track)",
          borderTop: "1px solid var(--border)",
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
  const pixelsPerSecond = 44 * zoom;

  return (
    <div
      style={{
        height: 220,
        background: "var(--timeline-track)",
        borderTop: "1px solid var(--border)",
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
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
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
            borderRadius: 5,
            border: "none",
            background: isExporting ? "var(--bg-elevated)" : "var(--accent)",
            color: isExporting ? "var(--text-muted)" : "#0e0e0f",
            fontSize: 11,
            fontWeight: 700,
            cursor: isExporting ? "not-allowed" : "pointer",
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
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
            background: "var(--accent)",
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
            borderTop: "6px solid var(--accent)",
          }} />
        </div>

        {/* Video track */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <TrackLabel>V</TrackLabel>
          <div style={{ display: "flex", gap: 2, position: "relative" }}>
            {(timeline.scenes ?? []).map((scene, i) => {
              const assignedClip = clips.find((c) => c.id && c.assignedToSceneId === scene.id)
                ?? clips.find((c) => c.objectUrl === scene.clipSrc);
              return (
                <SceneChip
                  key={scene.id}
                  scene={scene}
                  index={i}
                  color={SCENE_COLORS[i % SCENE_COLORS.length]}
                  pixelsPerSecond={pixelsPerSecond}
                  isActive={scene.id === activeSceneId}
                  onClick={() => onSceneSelect(scene.id)}
                  onDurationChange={onSceneDurationChange}
                  clip={assignedClip}
                />
              );
            })}
          </div>
        </div>

        {/* Caption track */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <TrackLabel style={{ color: "#a5b4fc" }}>C</TrackLabel>
          <div style={{ display: "flex", gap: 2, position: "relative" }}>
            {(timeline.scenes ?? []).map((scene, i) =>
              (scene.captions?.length ?? 0) > 0 ? (
                <CaptionTrackChip
                  key={scene.id}
                  scene={scene}
                  index={i}
                  pixelsPerSecond={pixelsPerSecond}
                  captionCount={scene.captions?.length ?? 0}
                />
              ) : (
                <div
                  key={scene.id}
                  style={{ width: scene.duration * pixelsPerSecond }}
                />
              )
            )}
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
      </div>
    </div>
  );
}

function TrackLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: 18,
        fontSize: 9,
        fontWeight: 700,
        color: "var(--text-muted)",
        letterSpacing: "0.1em",
        flexShrink: 0,
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TimeRuler({ totalDuration, pixelsPerSecond, onSeek }: { totalDuration: number; pixelsPerSecond: number; onSeek: (t: number) => void }) {
  const marks = Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => i);
  return (
    <div
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - (18 + 12);
        const t = Math.max(0, Math.min(totalDuration, x / pixelsPerSecond));
        onSeek(t);
      }}
      style={{
        height: 18,
        paddingLeft: 18 + 12,
        display: "flex",
        alignItems: "flex-end",
        overflowX: "hidden",
        flexShrink: 0,
        borderBottom: "1px solid var(--border-subtle)",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {marks.map((t) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: 18 + 12 + t * pixelsPerSecond,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
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
  scene, index, color, pixelsPerSecond, isActive, onClick, onDurationChange, clip,
}: {
  scene: Scene; index: number; color: string; pixelsPerSecond: number; isActive: boolean; onClick: () => void;
  onDurationChange?: (id: string, duration: number) => void;
  clip?: UploadedClip;
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
    if (!onDurationChange) return;
    dragRef.current = { startX: e.clientX, startDur: scene.duration };
    setIsDragging(true);

    function onMove(ev: MouseEvent) {
      if (!dragRef.current || !onDurationChange) return;
      const deltaSec = (ev.clientX - dragRef.current.startX) / pixelsPerSecond;
      const newDuration = Math.max(1, Math.round((dragRef.current.startDur + deltaSec) * 2) / 2);
      onDurationChange(scene.id, newDuration);
    }

    function onUp() {
      dragRef.current = null;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [scene.id, scene.duration, pixelsPerSecond, onDurationChange]);

  return (
    <div
      className={`timeline-scene ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={`${scene.label} · ${scene.duration}s${hasMedia ? " · has clip" : ""} · drag right edge to resize`}
      style={{
        width: chipWidth,
        height: hasMedia ? 72 : 38,
        borderRadius: 5,
        border: `1.5px solid ${isActive ? color : isDragging ? color : "var(--border-subtle)"}`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        cursor: isDragging ? "col-resize" : "pointer",
        userSelect: "none",
        background: hasMedia ? "#000" : isActive ? `${color}22` : "var(--scene-chip)",
        boxShadow: isActive ? `0 0 0 1px ${color}40` : "none",
        transition: "border-color 0.12s ease, box-shadow 0.12s ease",
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
      {onDurationChange && (
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
        borderRadius: 4,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-elevated)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.1s ease",
      }}
    >
      {children}
    </button>
  );
}
