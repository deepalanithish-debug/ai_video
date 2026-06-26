"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  SlidersHorizontal,
  Maximize,
  ExternalLink,
  Film,
  Music,
  Type,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Tag,
} from "lucide-react";
import { useEditorStore, type Scene, type AudioTrack } from "@/store/editorStore";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TimelinePanelProps {
  height: number;
  onHeightChange: (h: number) => void;
  isExpanded: boolean;
  onExpandToggle: () => void;
}

interface TrackConfig {
  id: string;
  name: string;
  type: "video" | "audio" | "caption" | "effects" | "transitions" | "brand";
  color: string;
  collapsed: boolean;
  locked: boolean;
  visible: boolean;
}

interface DragState {
  type: "move" | "resize-left" | "resize-right";
  clipId: string;
  trackType: "video" | "audio";
  startX: number;
  startTime: number;
  startDuration: number;
  snapGuide: number | null;
}

interface ContextMenu {
  x: number;
  y: number;
  clipId: string;
  trackType: "video" | "audio" | "caption";
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HEADER_W = 140;
const TRACK_H = 64;
const RULER_H = 36;
const CONTROLS_H = 48;
const SNAP_PX = 8;
const FRAME_DURATION = 1 / 24;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = String(Math.floor((s % 1) * 100)).padStart(2, "0");
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

function fmtShort(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m > 0) return `${m}:${String(sec).padStart(2, "0")}`;
  return `${sec}s`;
}

// ── Minimap ───────────────────────────────────────────────────────────────────
interface MinimapProps {
  scenes: Scene[];
  audioTracks: AudioTrack[];
  totalDuration: number;
  currentTime: number;
  scrollLeft: number;
  containerWidth: number;
  canvasWidth: number;
  onSeekAndScroll: (t: number) => void;
}

function Minimap({
  scenes,
  audioTracks,
  totalDuration,
  currentTime,
  scrollLeft,
  containerWidth,
  canvasWidth,
  onSeekAndScroll,
}: MinimapProps) {
  const W = 120;
  const H = 16;
  const dragRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / W));
    onSeekAndScroll(pct * totalDuration);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / W));
    onSeekAndScroll(pct * totalDuration);
  };

  const viewportPct = totalDuration > 0 ? (scrollLeft / canvasWidth) : 0;
  const viewportWidthPct = totalDuration > 0 ? Math.min(1, containerWidth / canvasWidth) : 1;
  const playheadPct = totalDuration > 0 ? currentTime / totalDuration : 0;

  let sceneOff = 0;
  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { dragRef.current = false; }}
      onMouseLeave={() => { dragRef.current = false; }}
      style={{
        width: W,
        height: H,
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
        position: "relative",
        cursor: "crosshair",
        overflow: "hidden",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Scene blocks */}
      {scenes.map((sc) => {
        const l = totalDuration > 0 ? (sceneOff / totalDuration) * W : 0;
        const w = totalDuration > 0 ? (sc.duration / totalDuration) * W : 0;
        sceneOff += sc.duration;
        return (
          <div
            key={sc.id}
            style={{
              position: "absolute",
              left: l,
              width: Math.max(1, w - 1),
              top: 1,
              height: 6,
              background: "rgba(99,102,241,0.5)",
              borderRadius: 1,
            }}
          />
        );
      })}
      {/* Audio blocks */}
      {audioTracks.map((tr) => {
        const l = totalDuration > 0 ? ((tr.startTime ?? 0) / totalDuration) * W : 0;
        const dur = Math.min(tr.duration || totalDuration, totalDuration);
        const w = totalDuration > 0 ? (dur / totalDuration) * W : 0;
        return (
          <div
            key={tr.id}
            style={{
              position: "absolute",
              left: l,
              width: Math.max(1, w - 1),
              top: 9,
              height: 4,
              background: "rgba(16,185,129,0.5)",
              borderRadius: 1,
            }}
          />
        );
      })}
      {/* Viewport indicator */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: viewportPct * W,
          width: Math.max(4, viewportWidthPct * W),
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />
      {/* Playhead */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: playheadPct * W,
          width: 1.5,
          background: "#EF4444",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Ruler ─────────────────────────────────────────────────────────────────────
interface RulerProps {
  zoom: number;
  totalDuration: number;
  canvasWidth: number;
  currentTime: number;
  scrollLeft: number;
  containerWidth: number;
  onSeek: (t: number) => void;
}

function Ruler({
  zoom,
  totalDuration,
  canvasWidth,
  currentTime,
  scrollLeft,
  containerWidth,
  onSeek,
}: RulerProps) {
  const pps = canvasWidth / Math.max(totalDuration, 0.001);

  // Dynamic scale based on zoom
  let majorStep: number;
  let minorStep: number;
  if (zoom >= 4) {
    majorStep = 1;
    minorStep = 0.1;
  } else if (zoom >= 2) {
    majorStep = 2;
    minorStep = 0.5;
  } else if (zoom >= 1) {
    majorStep = 5;
    minorStep = 1;
  } else if (zoom >= 0.5) {
    majorStep = 10;
    minorStep = 2;
  } else {
    majorStep = 30;
    minorStep = 5;
  }

  const playheadX = currentTime * pps;

  // Only render ticks in visible range + small buffer
  const visibleStart = Math.max(0, scrollLeft / pps - majorStep);
  const visibleEnd = Math.min(totalDuration + majorStep, (scrollLeft + containerWidth) / pps + majorStep);

  const ticks: React.ReactNode[] = [];
  // Minor ticks
  let t = Math.floor(visibleStart / minorStep) * minorStep;
  while (t <= visibleEnd) {
    const x = t * pps;
    const isMajor = Math.abs((t % majorStep)) < 0.001 || Math.abs((t % majorStep) - majorStep) < 0.001;
    if (!isMajor) {
      ticks.push(
        <div
          key={`min-${t}`}
          style={{
            position: "absolute",
            left: x,
            bottom: 0,
            width: 1,
            height: 8,
            background: "rgba(255,255,255,0.07)",
            pointerEvents: "none",
          }}
        />
      );
    }
    t = Math.round((t + minorStep) * 1000) / 1000;
  }

  // Major ticks + labels
  t = Math.floor(visibleStart / majorStep) * majorStep;
  while (t <= visibleEnd) {
    const x = t * pps;
    ticks.push(
      <div key={`maj-${t}`} style={{ position: "absolute", left: x, top: 0, bottom: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", bottom: 0, width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
        {t > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              left: 3,
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {fmtShort(t)}
          </span>
        )}
      </div>
    );
    t = Math.round((t + majorStep) * 1000) / 1000;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    // Capture scrollLeft at mousedown so seek is accurate even if scroll changes
    const sl = scrollLeft;
    document.body.style.cursor = "crosshair";
    document.body.style.userSelect = "none";
    const doSeek = (ev: MouseEvent) => {
      const x = ev.clientX - rect.left + sl;
      onSeek(Math.max(0, Math.min(totalDuration, x / pps)));
    };
    const up = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", doSeek);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", doSeek);
    window.addEventListener("mouseup", up);
    doSeek(e.nativeEvent);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        height: RULER_H,
        position: "relative",
        cursor: "crosshair",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {ticks}
      {/* Playhead needle */}
      <div
        style={{
          position: "absolute",
          left: playheadX,
          top: 0,
          bottom: 0,
          width: 2,
          background: "#EF4444",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Triangle cap */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -4,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "8px solid #EF4444",
          }}
        />
        {/* Time label */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 6,
            background: "#EF4444",
            borderRadius: "var(--r-xs)",
            padding: "1px 4px",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            color: "#fff",
            whiteSpace: "nowrap",
            zIndex: 11,
          }}
        >
          {fmt(currentTime)}
        </div>
      </div>
    </div>
  );
}

// ── Waveform bars (simulated) ──────────────────────────────────────────────────
function WaveformBars({ count, color, seed }: { count: number; color: string; seed: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: "100%",
        padding: "4px 0",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <div
          key={i}
          style={{
            width: "1.5px",
            flexShrink: 0,
            height: `${(20 + Math.abs(Math.sin(i * 0.7 + seed * 1.1) * 60)).toFixed(2)}%`,
            background: color,
            borderRadius: "1px",
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ── Video Clip ─────────────────────────────────────────────────────────────────
interface VideoClipProps {
  scene: Scene;
  startTime: number;
  pps: number;
  trackHeight: number;
  isSelected: boolean;
  isActive: boolean;
  locked: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function VideoClip({
  scene,
  startTime,
  pps,
  trackHeight,
  isSelected,
  isActive,
  locked,
  onSelect,
  onDragStart,
  onContextMenu,
}: VideoClipProps) {
  const left = startTime * pps;
  const width = Math.max(4, scene.duration * pps - 2);
  const clipH = trackHeight - 8;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { if (e.button === 0 && !locked) { e.stopPropagation(); onDragStart(e, "move"); } }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e); }}
      style={{
        position: "absolute",
        left: left + 1,
        top: 4,
        width,
        height: clipH,
        borderRadius: "var(--r-sm)",
        background: "linear-gradient(180deg, rgba(99,102,241,0.7) 0%, rgba(99,102,241,0.4) 100%)",
        border: `1px solid ${isSelected ? "rgba(99,102,241,1)" : "rgba(99,102,241,0.6)"}`,
        boxShadow: isSelected ? "0 0 0 2px rgba(99,102,241,0.5)" : isActive ? "0 0 8px rgba(99,102,241,0.3)" : "none",
        cursor: locked ? "default" : "grab",
        overflow: "hidden",
        userSelect: "none",
        transition: "border-color 0.1s ease, box-shadow 0.1s ease",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Thumbnail strip pattern */}
      {scene.clipId && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.15,
            background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0px, transparent 1px, transparent 28px, rgba(255,255,255,0.3) 29px)",
          }}
        />
      )}
      {/* Waveform */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        <WaveformBars count={Math.floor(width / 3)} color="rgba(255,255,255,0.6)" seed={scene.order} />
      </div>
      {/* Label */}
      {width > 32 && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "calc(100% - 48px)",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {scene.label}
        </div>
      )}
      {/* Duration badge */}
      {width > 56 && (
        <div
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 8,
            fontFamily: "var(--font-mono)",
            color: "rgba(255,255,255,0.7)",
            background: "rgba(0,0,0,0.35)",
            borderRadius: "var(--r-xs)",
            padding: "1px 4px",
            zIndex: 1,
          }}
        >
          {fmt(scene.duration)}
        </div>
      )}
      {/* Caption dots */}
      {scene.captions.length > 0 && width > 32 && (
        <div
          style={{
            position: "absolute",
            bottom: 3,
            left: 6,
            display: "flex",
            gap: 2,
            zIndex: 1,
          }}
        >
          {scene.captions.slice(0, 4).map((_, i) => (
            <div
              key={i}
              style={{ width: 3, height: 3, borderRadius: "50%", background: "#F59E0B", opacity: 0.8 }}
            />
          ))}
        </div>
      )}
      {/* Left resize handle */}
      {!locked && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, "resize-left"); }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: "100%",
            cursor: "ew-resize",
            background: "transparent",
            zIndex: 2,
          }}
        >
          <div style={{ position: "absolute", left: 1, top: "50%", transform: "translateY(-50%)", width: 2, height: 12, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
        </div>
      )}
      {/* Right resize handle */}
      {!locked && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, "resize-right"); }}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 6,
            height: "100%",
            cursor: "ew-resize",
            background: "transparent",
            zIndex: 2,
          }}
        >
          <div style={{ position: "absolute", right: 1, top: "50%", transform: "translateY(-50%)", width: 2, height: 12, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
        </div>
      )}
    </div>
  );
}

// ── Audio Clip ─────────────────────────────────────────────────────────────────
interface AudioClipProps {
  track: AudioTrack;
  totalDuration: number;
  pps: number;
  trackHeight: number;
  isSelected: boolean;
  locked: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function AudioClipBlock({
  track,
  totalDuration,
  pps,
  trackHeight,
  isSelected,
  locked,
  onSelect,
  onDragStart,
  onContextMenu,
}: AudioClipProps) {
  const startT = track.startTime ?? 0;
  const dur = Math.min(track.duration || totalDuration, totalDuration);
  const left = startT * pps;
  const width = Math.max(4, dur * pps - 2);
  const clipH = trackHeight - 8;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { if (e.button === 0 && !locked) { e.stopPropagation(); onDragStart(e, "move"); } }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e); }}
      style={{
        position: "absolute",
        left: left + 1,
        top: 4,
        width,
        height: clipH,
        borderRadius: "var(--r-sm)",
        background: "linear-gradient(180deg, rgba(16,185,129,0.6) 0%, rgba(16,185,129,0.35) 100%)",
        border: `1px solid ${isSelected ? "rgba(16,185,129,1)" : "rgba(16,185,129,0.5)"}`,
        boxShadow: isSelected ? "0 0 0 2px rgba(16,185,129,0.4)" : "none",
        cursor: locked ? "default" : "grab",
        overflow: "hidden",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        transition: "border-color 0.1s ease, box-shadow 0.1s ease",
      }}
    >
      {/* Waveform bars */}
      <div style={{ position: "absolute", inset: "0 6px", opacity: 0.6 }}>
        <WaveformBars count={Math.floor((width - 12) / 3)} color="rgba(16,185,129,0.9)" seed={track.id.charCodeAt(0)} />
      </div>
      {width > 48 && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0 8px",
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "calc(100% - 16px)",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {track.name}
        </div>
      )}
      {track.muted && (
        <div
          style={{
            position: "absolute",
            right: 6,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 8,
            fontWeight: 700,
            color: "#EF4444",
            background: "rgba(239,68,68,0.15)",
            borderRadius: "var(--r-xs)",
            padding: "1px 4px",
            zIndex: 1,
          }}
        >
          M
        </div>
      )}
      {/* Left resize */}
      {!locked && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, "resize-left"); }}
          style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", zIndex: 2 }}
        >
          <div style={{ position: "absolute", left: 1, top: "50%", transform: "translateY(-50%)", width: 2, height: 12, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
        </div>
      )}
      {/* Right resize */}
      {!locked && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, "resize-right"); }}
          style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", zIndex: 2 }}
        >
          <div style={{ position: "absolute", right: 1, top: "50%", transform: "translateY(-50%)", width: 2, height: 12, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
        </div>
      )}
    </div>
  );
}

// ── Caption Clip ───────────────────────────────────────────────────────────────
function CaptionClipBlock({
  text,
  left,
  width,
  trackHeight,
  isSelected,
  onSelect,
}: {
  text: string;
  left: number;
  width: number;
  trackHeight: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const clipH = trackHeight - 8;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: "absolute",
        left: left + 1,
        top: 4,
        width: Math.max(4, width - 2),
        height: clipH,
        borderRadius: "var(--r-sm)",
        background: "linear-gradient(180deg, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.35) 100%)",
        border: `1px solid ${isSelected ? "rgba(245,158,11,1)" : "rgba(245,158,11,0.5)"}`,
        boxShadow: isSelected ? "0 0 0 2px rgba(245,158,11,0.4)" : "none",
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        padding: "0 6px",
        transition: "border-color 0.1s ease",
      }}
    >
      {width > 30 && (
        <span
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

// ── Track Header ───────────────────────────────────────────────────────────────
interface TrackHeaderProps {
  config: TrackConfig;
  height: number;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onToggleCollapse: () => void;
  onRename: (name: string) => void;
}

function TrackHeader({
  config,
  height,
  onToggleVisible,
  onToggleLock,
  onToggleCollapse,
  onRename,
}: TrackHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(config.name);

  const Icon =
    config.type === "video" ? Film :
    config.type === "audio" ? Music :
    config.type === "caption" ? Type :
    config.type === "effects" ? Sparkles :
    config.type === "transitions" ? Zap :
    Tag;

  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-panel)",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left color bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: config.color,
          opacity: config.visible ? 0.85 : 0.25,
          flexShrink: 0,
        }}
      />

      {/* Inner content with padding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingLeft: 10,
          paddingRight: 6,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Collapse */}
        <button
          onClick={onToggleCollapse}
          style={{
            width: 16,
            height: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
          }}
        >
          {config.collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>

        {/* Type icon */}
        <Icon size={14} color={config.visible ? config.color : "var(--text-tertiary)"} style={{ flexShrink: 0 }} />

        {/* Name */}
        {editing ? (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { onRename(val); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(val); setEditing(false); }
              if (e.key === "Escape") { setVal(config.name); setEditing(false); }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 10,
              fontWeight: 600,
              background: "var(--bg-base)",
              border: "1px solid var(--border-focus)",
              borderRadius: "var(--r-xs)",
              padding: "1px 4px",
              color: config.color,
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => { setVal(config.name); setEditing(true); }}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 10,
              fontWeight: 600,
              color: config.visible ? config.color : "var(--text-tertiary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              cursor: "default",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {config.name}
          </span>
        )}

        {/* Eye toggle */}
        <button
          onClick={onToggleVisible}
          title={config.visible ? "Hide" : "Show"}
          style={{
            width: 20,
            height: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: config.visible ? "var(--text-tertiary)" : "var(--error)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
            opacity: 0.75,
            borderRadius: "var(--r-xs)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; }}
        >
          {config.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {/* Lock toggle */}
        <button
          onClick={onToggleLock}
          title={config.locked ? "Unlock" : "Lock"}
          style={{
            width: 20,
            height: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: config.locked ? "var(--warning)" : "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
            opacity: config.locked ? 1 : 0.6,
            borderRadius: "var(--r-xs)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = config.locked ? "1" : "0.6"; }}
        >
          {config.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Context Menu ───────────────────────────────────────────────────────────────
interface ContextMenuProps {
  menu: ContextMenu;
  onDelete: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onClose: () => void;
}

function ClipContextMenu({ menu, onDelete, onDuplicate, onSplit, onClose }: ContextMenuProps) {
  const items = [
    { label: "Split at Playhead", action: onSplit, icon: "✂" },
    { label: "Duplicate", action: onDuplicate, icon: "⧉" },
    { label: "Properties", action: onClose, icon: "⚙" },
    { type: "divider" as const },
    { label: "Delete", action: onDelete, icon: "⌫", danger: true },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 200 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: "fixed",
          left: menu.x,
          top: menu.y,
          zIndex: 201,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--r-md)",
          padding: "4px",
          minWidth: 160,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {items.map((item, i) =>
          item.type === "divider" ? (
            <div key={i} style={{ height: 1, background: "var(--border)", margin: "3px 0" }} />
          ) : (
            <button
              key={i}
              onClick={() => { item.action(); onClose(); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: "none",
                border: "none",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                fontSize: 12,
                color: item.danger ? "var(--error)" : "var(--text-secondary)",
                textAlign: "left",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = item.danger ? "rgba(239,68,68,0.08)" : "var(--bg-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 11, opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </motion.div>
    </>
  );
}

// ── Main Timeline ─────────────────────────────────────────────────────────────
const DEFAULT_TRACKS: TrackConfig[] = [
  { id: "video", name: "Video", type: "video", color: "#6366F1", collapsed: false, locked: false, visible: true },
  { id: "audio", name: "Music", type: "audio", color: "#3B82F6", collapsed: false, locked: false, visible: true },
  { id: "captions", name: "Captions", type: "caption", color: "#8B5CF6", collapsed: false, locked: false, visible: true },
  { id: "effects", name: "Effects", type: "effects", color: "#F59E0B", collapsed: false, locked: false, visible: true },
  { id: "brand", name: "Brand", type: "brand", color: "#10B981", collapsed: false, locked: false, visible: true },
  { id: "transitions", name: "Transitions", type: "transitions", color: "#EC4899", collapsed: false, locked: false, visible: true },
];

export default function TimelinePanel({
  height,
  onHeightChange,
  isExpanded,
  onExpandToggle,
}: TimelinePanelProps) {
  const {
    scenes,
    audioTracks,
    currentTime,
    totalDuration,
    isPlaying,
    activeSceneId,
    zoom,
    snapEnabled,
    seek,
    setZoom,
    setActiveScene,
    updateScene,
    removeScene,
    addScene,
    updateAudioTrack,
    removeAudioTrack,
    splitScene,
    duplicateScene,
  } = useEditorStore();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<TrackConfig[]>(DEFAULT_TRACKS);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const tracksBodyRef = useRef<HTMLDivElement>(null);
  const resizePanelRef = useRef<{ startY: number; startH: number } | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const safeDuration = Math.max(totalDuration, 1);
  const canvasWidth = Math.max(containerWidth * zoom, containerWidth);
  const pps = canvasWidth / safeDuration;

  const sceneOffsets = useMemo(() => {
    const offs: number[] = [];
    let off = 0;
    for (const sc of scenes) {
      offs.push(off);
      off += sc.duration;
    }
    return offs;
  }, [scenes]);

  const hasAudio = audioTracks.length > 0;
  const hasCaptions = scenes.some((s) => s.captions.length > 0);

  // ── Playhead ──────────────────────────────────────────────────────────────────
  // EditorShell owns the SINGLE requestAnimationFrame ticker that advances
  // currentTime during playback. This panel only READS currentTime to position the
  // playhead — it must not advance time itself (two tickers => ~2x playback speed).

  // ── Auto-scroll playhead into view ────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    const x = currentTime * pps;
    const el = scrollRef.current;
    if (x > el.scrollLeft + el.clientWidth - 80) {
      el.scrollLeft = x - 80;
    }
  }, [currentTime, pps, isPlaying]);

  // ── ResizeObserver for container width ────────────────────────────────────────
  useEffect(() => {
    const el = tracksBodyRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Scroll sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Panel resize ──────────────────────────────────────────────────────────────
  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizePanelRef.current = { startY: e.clientY, startH: height };
    const onMove = (ev: MouseEvent) => {
      if (!resizePanelRef.current) return;
      const newH = Math.max(160, Math.min(700, resizePanelRef.current.startH - (ev.clientY - resizePanelRef.current.startY)));
      onHeightChange(newH);
    };
    const onUp = () => {
      resizePanelRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [height, onHeightChange]);

  // ── Snap helpers ──────────────────────────────────────────────────────────────
  const getSnapPoints = useCallback((excludeId?: string): number[] => {
    const pts: number[] = [0, totalDuration];
    let off = 0;
    for (const sc of scenes) {
      if (sc.id !== excludeId) {
        pts.push(off, off + sc.duration);
      }
      off += sc.duration;
    }
    for (const tr of audioTracks) {
      if (tr.id !== excludeId) {
        pts.push(tr.startTime ?? 0);
        pts.push((tr.startTime ?? 0) + tr.duration);
      }
    }
    pts.push(currentTime); // snap to playhead
    return pts;
  }, [scenes, audioTracks, totalDuration, currentTime]);

  const snapTime = useCallback((t: number, excludeId?: string, shiftHeld?: boolean): { time: number; snapX: number | null } => {
    if (shiftHeld || !snapEnabled) return { time: t, snapX: null };
    const pts = getSnapPoints(excludeId);
    let best = t;
    let bestDist = SNAP_PX / pps;
    for (const pt of pts) {
      const dist = Math.abs(pt - t);
      if (dist < bestDist) {
        bestDist = dist;
        best = pt;
      }
    }
    return { time: best, snapX: best !== t ? best * pps : null };
  }, [snapEnabled, getSnapPoints, pps]);

  // ── Clip drag ──────────────────────────────────────────────────────────────────
  const startDrag = useCallback((
    e: React.MouseEvent,
    clipId: string,
    trackType: "video" | "audio",
    type: "move" | "resize-left" | "resize-right",
    startTime: number,
    duration: number,
  ) => {
    e.preventDefault();
    setDrag({
      type,
      clipId,
      trackType,
      startX: e.clientX,
      startTime,
      startDuration: duration,
      snapGuide: null,
    });

    // Set cursor on body during drag
    const dragCursor = type === "move" ? "grabbing" : "ew-resize";
    document.body.style.cursor = dragCursor;
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - e.clientX;
      const dt = dx / pps;
      const shiftHeld = ev.shiftKey;

      if (type === "move") {
        const rawT = Math.max(0, startTime + dt);
        const { time: snapped, snapX } = snapTime(rawT, clipId, shiftHeld);
        setSnapGuideX(snapX);
        if (trackType === "audio") {
          updateAudioTrack(clipId, { startTime: snapped });
        }
      } else if (type === "resize-right") {
        const rawDur = Math.max(0.5, startTime + duration + dt - startTime);
        const rawEnd = startTime + rawDur;
        const { time: snappedEnd, snapX } = snapTime(rawEnd, clipId, shiftHeld);
        setSnapGuideX(snapX);
        const newDur = Math.max(0.5, snappedEnd - startTime);
        if (trackType === "video") {
          updateScene(clipId, { duration: newDur });
        } else {
          updateAudioTrack(clipId, { duration: newDur });
        }
      } else {
        // resize-left
        const rawT = Math.max(0, Math.min(startTime + duration - 0.5, startTime + dt));
        const { time: snapped, snapX } = snapTime(rawT, clipId, shiftHeld);
        setSnapGuideX(snapX);
        const trimmed = startTime + duration - snapped;
        if (trackType === "audio") {
          updateAudioTrack(clipId, { startTime: snapped, duration: trimmed });
        } else if (trackType === "video") {
          // Scenes lay out sequentially (no in-point), so a left-trim shortens the
          // scene's duration; following scenes reflow via sceneOffsets.
          updateScene(clipId, { duration: Math.max(0.5, trimmed) });
        }
      }
    };

    const onUp = () => {
      setDrag(null);
      setSnapGuideX(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pps, snapTime, updateScene, updateAudioTrack]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Play/pause (Space) is owned globally by EditorShell — a duplicate handler here
      // double-fires on every Space press, so it is intentionally NOT handled in the timeline.
      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        e.preventDefault();
        // Delete — find which track
        const isScene = scenes.some((s) => s.id === selectedClipId);
        const isAudio = audioTracks.some((t) => t.id === selectedClipId);
        if (isScene) { removeScene(selectedClipId); setSelectedClipId(null); }
        if (isAudio) { removeAudioTrack(selectedClipId); setSelectedClipId(null); }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedClipId) {
        e.preventDefault();
        // Duplicate scene
        const sc = scenes.find((s) => s.id === selectedClipId);
        if (sc) addScene(sc.id);
      }
      if (e.key === "ArrowLeft" && selectedClipId) {
        const nudge = e.shiftKey ? 10 * FRAME_DURATION : FRAME_DURATION;
        const sc = scenes.find((s) => s.id === selectedClipId);
        if (sc) {
          const idx = scenes.indexOf(sc);
          if (idx > 0) updateScene(scenes[idx - 1].id, { duration: Math.max(0.5, scenes[idx - 1].duration - nudge) });
        }
        const tr = audioTracks.find((t) => t.id === selectedClipId);
        if (tr) updateAudioTrack(tr.id, { startTime: Math.max(0, (tr.startTime ?? 0) - nudge) });
      }
      if (e.key === "ArrowRight" && selectedClipId) {
        const nudge = e.shiftKey ? 10 * FRAME_DURATION : FRAME_DURATION;
        const tr = audioTracks.find((t) => t.id === selectedClipId);
        if (tr) updateAudioTrack(tr.id, { startTime: Math.min(totalDuration - tr.duration, (tr.startTime ?? 0) + nudge) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedClipId, scenes, audioTracks, removeScene, removeAudioTrack, addScene, updateScene, updateAudioTrack, totalDuration]);

  // ── Zoom with Ctrl/Cmd+Scroll ─────────────────────────────────────────────────
  useEffect(() => {
    const el = tracksBodyRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setZoom(Math.max(0.25, Math.min(8, zoom * factor)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, setZoom]);

  // ── Track helpers ──────────────────────────────────────────────────────────────
  const updateTrack = useCallback((id: string, patch: Partial<TrackConfig>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const getTrack = (id: string) => tracks.find((t) => t.id === id)!;

  // ── Fit to view ────────────────────────────────────────────────────────────────
  const fitToView = useCallback(() => {
    if (totalDuration <= 0 || containerWidth <= 0) return;
    // Compute zoom so that totalDuration * pps == containerWidth.
    // pps = (containerWidth * zoom) / totalDuration, so zoom = containerWidth / containerWidth = 1 at base.
    // We want pps = containerWidth / totalDuration → zoom = 1 (base), but canvasWidth = containerWidth * zoom.
    // So to fit: containerWidth * zoom / totalDuration = desired_pps.
    // Simplest: set zoom so canvasWidth exactly = containerWidth, making pps = containerWidth / totalDuration.
    // zoom = 1 achieves canvasWidth = containerWidth, so pps = containerWidth / totalDuration.
    const targetPps = containerWidth / totalDuration;
    // Ensure pps >= 80 for readability
    const minPps = 80;
    const effectivePps = Math.max(targetPps, minPps);
    const newZoom = (effectivePps * totalDuration) / containerWidth;
    setZoom(Math.max(0.25, Math.min(8, newZoom)));
  }, [totalDuration, containerWidth, setZoom]);

  const playheadX = currentTime * pps;
  const trackH = TRACK_H;
  const collapsedH = 14;

  const videoTrack = getTrack("video");
  const audioTrack = getTrack("audio");
  const captionTrack = getTrack("captions");
  const effectsTrack = getTrack("effects");
  const transitionsTrack = getTrack("transitions");
  const brandTrack = getTrack("brand");

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        height: isExpanded ? "100vh" : height,
        position: isExpanded ? "fixed" : "relative",
        inset: isExpanded ? "0 0 0 0" : undefined,
        zIndex: isExpanded ? 1000 : undefined,
        transition: "height 0.18s var(--ease-smooth)",
      }}
    >
      {/* 1. RESIZE HANDLE */}
      {!isExpanded && (
        <div
          onMouseDown={handlePanelResizeStart}
          style={{
            height: 8,
            cursor: "row-resize",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div
            style={{
              width: 32,
              height: 3,
              borderRadius: "var(--r-full)",
              background: "var(--border-strong)",
            }}
          />
        </div>
      )}

      {/* 2. CONTROLS BAR */}
      <div
        style={{
          height: CONTROLS_H,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        {/* Left: Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={() => setZoom(Math.max(0.25, zoom / 1.25))}
            title="Zoom out"
            style={iconBtnStyle}
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset zoom to 100%"
            style={{
              ...iconBtnStyle,
              minWidth: 40,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom(Math.min(8, zoom * 1.25))}
            title="Zoom in"
            style={iconBtnStyle}
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={fitToView}
            title="Fit to view"
            style={{ ...iconBtnStyle, marginLeft: 2 }}
          >
            <Maximize2 size={12} />
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

        {/* Center: Minimap */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Minimap
            scenes={scenes}
            audioTracks={audioTracks}
            totalDuration={safeDuration}
            currentTime={currentTime}
            scrollLeft={scrollLeft}
            containerWidth={containerWidth}
            canvasWidth={canvasWidth}
            onSeekAndScroll={(t) => {
              seek(t);
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = (t / safeDuration) * canvasWidth - containerWidth / 2;
              }
            }}
          />
        </div>

        <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={() => addScene()}
            title="Add track"
            style={iconBtnStyle}
          >
            <Plus size={12} />
          </button>
          <button title="Track settings" style={iconBtnStyle}>
            <SlidersHorizontal size={12} />
          </button>
          <button
            onClick={onExpandToggle}
            title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
            style={iconBtnStyle}
          >
            <Maximize size={12} />
          </button>
          <button title="Undock timeline" style={iconBtnStyle}>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* 3+4. TIMELINE BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }} ref={tracksBodyRef}>
        {/* Track headers column (sticky left) */}
        <div
          style={{
            width: HEADER_W,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-panel)",
            zIndex: 5,
          }}
        >
          {/* Ruler spacer */}
          <div
            style={{
              height: RULER_H,
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              paddingLeft: 8,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
              }}
            >
              {fmt(currentTime)}
            </span>
          </div>

          {/* Video track header */}
          {videoTrack.visible && (
            <TrackHeader
              config={videoTrack}
              height={videoTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("video", { visible: false })}
              onToggleLock={() => updateTrack("video", { locked: !videoTrack.locked })}
              onToggleCollapse={() => updateTrack("video", { collapsed: !videoTrack.collapsed })}
              onRename={(name) => updateTrack("video", { name })}
            />
          )}

          {/* Audio track header */}
          {hasAudio && audioTrack.visible && (
            <TrackHeader
              config={audioTrack}
              height={audioTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("audio", { visible: false })}
              onToggleLock={() => updateTrack("audio", { locked: !audioTrack.locked })}
              onToggleCollapse={() => updateTrack("audio", { collapsed: !audioTrack.collapsed })}
              onRename={(name) => updateTrack("audio", { name })}
            />
          )}

          {/* Captions track header */}
          {hasCaptions && captionTrack.visible && (
            <TrackHeader
              config={captionTrack}
              height={captionTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("captions", { visible: false })}
              onToggleLock={() => updateTrack("captions", { locked: !captionTrack.locked })}
              onToggleCollapse={() => updateTrack("captions", { collapsed: !captionTrack.collapsed })}
              onRename={(name) => updateTrack("captions", { name })}
            />
          )}

          {/* Effects track header */}
          {effectsTrack.visible && (
            <TrackHeader
              config={effectsTrack}
              height={effectsTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("effects", { visible: false })}
              onToggleLock={() => updateTrack("effects", { locked: !effectsTrack.locked })}
              onToggleCollapse={() => updateTrack("effects", { collapsed: !effectsTrack.collapsed })}
              onRename={(name) => updateTrack("effects", { name })}
            />
          )}

          {/* Transitions track header */}
          {transitionsTrack.visible && (
            <TrackHeader
              config={transitionsTrack}
              height={transitionsTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("transitions", { visible: false })}
              onToggleLock={() => updateTrack("transitions", { locked: !transitionsTrack.locked })}
              onToggleCollapse={() => updateTrack("transitions", { collapsed: !transitionsTrack.collapsed })}
              onRename={(name) => updateTrack("transitions", { name })}
            />
          )}

          {/* Brand track header */}
          {brandTrack.visible && (
            <TrackHeader
              config={brandTrack}
              height={brandTrack.collapsed ? collapsedH : trackH}
              onToggleVisible={() => updateTrack("brand", { visible: false })}
              onToggleLock={() => updateTrack("brand", { locked: !brandTrack.locked })}
              onToggleCollapse={() => updateTrack("brand", { collapsed: !brandTrack.collapsed })}
              onRename={(name) => updateTrack("brand", { name })}
            />
          )}

          {/* Show hidden tracks */}
          {tracks.some((t) => !t.visible) && (
            <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
              {tracks.filter((t) => !t.visible).map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateTrack(t.id, { visible: true })}
                  style={{
                    fontSize: 9,
                    color: "var(--accent-light)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    padding: "2px 0",
                    fontFamily: "var(--font-sans)",
                    textDecoration: "underline",
                    opacity: 0.7,
                  }}
                >
                  Show {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable tracks area */}
        <div
          ref={scrollRef}
          onClick={(e) => {
            // Click on empty area to deselect and seek
            if ((e.target as HTMLElement) === e.currentTarget) {
              setSelectedClipId(null);
            }
          }}
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <div style={{ width: canvasWidth, position: "relative", minHeight: "100%" }}>
            {/* RULER (sticky top) */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bg-panel)" }}>
              <Ruler
                zoom={zoom}
                totalDuration={safeDuration}
                canvasWidth={canvasWidth}
                currentTime={currentTime}
                scrollLeft={scrollLeft}
                containerWidth={containerWidth}
                onSeek={seek}
              />
            </div>

            {/* VIDEO TRACK */}
            {videoTrack.visible && (
              <div
                style={{
                  height: videoTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: videoTrack.locked ? "rgba(99,102,241,0.015)" : "rgba(99,102,241,0.025)",
                  transition: "height 0.15s var(--ease-smooth)",
                  opacity: videoTrack.locked ? 0.6 : 1,
                }}
                onClick={(e) => {
                  // Seek on empty track click
                  if (!(e.target as HTMLElement).closest("[data-clip]")) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = e.clientX - rect.left + scrollLeft;
                    seek(Math.max(0, Math.min(totalDuration, x / pps)));
                  }
                }}
              >
                {!videoTrack.collapsed &&
                  scenes.map((sc, i) => (
                    <div key={sc.id} data-clip="true">
                      <VideoClip
                        scene={sc}
                        startTime={sceneOffsets[i]}
                        pps={pps}
                        trackHeight={trackH}
                        isSelected={selectedClipId === sc.id}
                        isActive={sc.id === activeSceneId}
                        locked={videoTrack.locked}
                        onSelect={() => { setSelectedClipId(sc.id); setActiveScene(sc.id); }}
                        onDragStart={(e, type) => startDrag(e, sc.id, "video", type, sceneOffsets[i], sc.duration)}
                        onContextMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, clipId: sc.id, trackType: "video" })}
                      />
                    </div>
                  ))}
              </div>
            )}

            {/* AUDIO TRACK */}
            {hasAudio && audioTrack.visible && (
              <div
                style={{
                  height: audioTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: audioTrack.locked ? "rgba(16,185,129,0.015)" : "rgba(16,185,129,0.025)",
                  transition: "height 0.15s var(--ease-smooth)",
                  opacity: audioTrack.locked ? 0.6 : 1,
                }}
              >
                {!audioTrack.collapsed &&
                  audioTracks.map((tr) => (
                    <div key={tr.id} data-clip="true">
                      <AudioClipBlock
                        track={tr}
                        totalDuration={totalDuration}
                        pps={pps}
                        trackHeight={trackH}
                        isSelected={selectedClipId === tr.id}
                        locked={audioTrack.locked}
                        onSelect={() => setSelectedClipId(tr.id)}
                        onDragStart={(e, type) => startDrag(e, tr.id, "audio", type, tr.startTime ?? 0, tr.duration)}
                        onContextMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, clipId: tr.id, trackType: "audio" })}
                      />
                    </div>
                  ))}
              </div>
            )}

            {/* CAPTIONS TRACK */}
            {hasCaptions && captionTrack.visible && (
              <div
                style={{
                  height: captionTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(245,158,11,0.025)",
                  transition: "height 0.15s var(--ease-smooth)",
                }}
              >
                {!captionTrack.collapsed &&
                  scenes.map((sc, i) =>
                    sc.captions.map((cap) => {
                      const capStart = sceneOffsets[i] + cap.startTime;
                      const capDur = cap.endTime - cap.startTime;
                      return (
                        <div key={cap.id} data-clip="true">
                          <CaptionClipBlock
                            text={cap.text}
                            left={capStart * pps}
                            width={capDur * pps}
                            trackHeight={trackH}
                            isSelected={selectedClipId === cap.id}
                            onSelect={() => setSelectedClipId(cap.id)}
                          />
                        </div>
                      );
                    })
                  )}
              </div>
            )}

            {/* EFFECTS TRACK */}
            {effectsTrack.visible && (
              <div
                style={{
                  height: effectsTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(168,85,247,0.018)",
                  transition: "height 0.15s var(--ease-smooth)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {!effectsTrack.collapsed && (
                  <div style={{ paddingLeft: 12, fontSize: 10, color: "rgba(168,85,247,0.4)", fontStyle: "italic", pointerEvents: "none" }}>
                    Drop effects here
                  </div>
                )}
              </div>
            )}

            {/* TRANSITIONS TRACK */}
            {transitionsTrack.visible && (
              <div
                style={{
                  height: transitionsTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(236,72,153,0.018)",
                  transition: "height 0.15s var(--ease-smooth)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {!transitionsTrack.collapsed && scenes.length > 1 && sceneOffsets.slice(1).map((off, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: off * pps - 8,
                      width: 16,
                      height: trackH - 16,
                      top: 8,
                      background: "rgba(236,72,153,0.25)",
                      border: "1px solid rgba(236,72,153,0.5)",
                      borderRadius: "var(--r-xs)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Zap size={8} color="rgba(236,72,153,0.8)" />
                  </div>
                ))}
                {!transitionsTrack.collapsed && scenes.length <= 1 && (
                  <div style={{ paddingLeft: 12, fontSize: 10, color: "rgba(236,72,153,0.4)", fontStyle: "italic", pointerEvents: "none" }}>
                    Transitions appear between clips
                  </div>
                )}
              </div>
            )}

            {/* BRAND TRACK */}
            {brandTrack.visible && (
              <div
                style={{
                  height: brandTrack.collapsed ? collapsedH : trackH,
                  position: "relative",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(239,68,68,0.018)",
                  transition: "height 0.15s var(--ease-smooth)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {!brandTrack.collapsed && (
                  <div style={{ paddingLeft: 12, fontSize: 10, color: "rgba(239,68,68,0.4)", fontStyle: "italic", pointerEvents: "none" }}>
                    Brand assets (logo, outro)
                  </div>
                )}
              </div>
            )}

            {/* PLAYHEAD line (over tracks) */}
            <div
              style={{
                position: "absolute",
                left: playheadX,
                top: RULER_H,
                bottom: 0,
                width: 2,
                background: "#EF4444",
                pointerEvents: "none",
                zIndex: 20,
                boxShadow: "0 0 6px rgba(239,68,68,0.5)",
                opacity: 0.9,
              }}
            >
              {/* Arrowhead indicator at top */}
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "7px solid #EF4444",
                  filter: "drop-shadow(0 0 3px rgba(239,68,68,0.7))",
                }}
              />
              {/* Glow circle just below arrowhead */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "#EF4444",
                  borderRadius: "50%",
                  position: "absolute",
                  top: 0,
                  left: -3,
                  boxShadow: "0 0 8px rgba(239,68,68,0.7)",
                }}
              />
            </div>

            {/* SNAP GUIDE */}
            {snapGuideX !== null && (
              <div
                style={{
                  position: "absolute",
                  left: snapGuideX,
                  top: RULER_H,
                  bottom: 0,
                  width: 1,
                  background: "#F59E0B",
                  pointerEvents: "none",
                  zIndex: 19,
                  boxShadow: "0 0 4px rgba(245,158,11,0.5)",
                }}
              />
            )}

            {/* Empty state message */}
            {scenes.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: RULER_H,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                  fontStyle: "italic",
                  pointerEvents: "none",
                }}
              >
                No scenes — click + to add
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ClipContextMenu
            menu={contextMenu}
            onDelete={() => {
              const isScene = scenes.some((s) => s.id === contextMenu.clipId);
              if (isScene) removeScene(contextMenu.clipId);
              else removeAudioTrack(contextMenu.clipId);
              setSelectedClipId(null);
            }}
            onDuplicate={() => {
              const sc = scenes.find((s) => s.id === contextMenu.clipId);
              if (sc) duplicateScene(sc.id);
            }}
            onSplit={() => {
              // Split the scene at the playhead into two halves (preserves media + captions).
              const sc = scenes.find((s) => s.id === contextMenu.clipId);
              if (!sc) return;
              const idx = scenes.indexOf(sc);
              splitScene(sc.id, currentTime - sceneOffsets[idx]);
            }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared button style ────────────────────────────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "var(--r-sm)",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  cursor: "pointer",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
  fontFamily: "var(--font-sans)",
  transition: "background 0.1s ease, border-color 0.1s ease",
};
