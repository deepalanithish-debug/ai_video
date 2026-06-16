"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { StudioCaption } from "@/types/captions";

interface CaptionLayerProps {
  captions: StudioCaption[];
  currentTime: number;
  selectedCaptionId: string | null;
  onCaptionSelect: (id: string | null) => void;
  onCaptionUpdate: (id: string, patch: Partial<StudioCaption>) => void;
  showGrid: boolean;
  showSafeZones: boolean;
  showThirds: boolean;
  isPlaying: boolean;
}

type HandleType = "move" | "resize-se" | "resize-sw" | "resize-ne" | "resize-nw" | "rotate";

interface DragState {
  handle: HandleType;
  captionId: string;
  startX: number;  // normalized 0-1
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origRot: number;
  centerX: number;
  centerY: number;
}

export default function CaptionLayer({
  captions, currentTime, selectedCaptionId, onCaptionSelect,
  onCaptionUpdate, showGrid, showSafeZones, showThirds, isPlaying,
}: CaptionLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const visibleCaptions = captions.filter(c =>
    c.visible && currentTime >= c.startTime && currentTime <= c.endTime
  );

  const toNorm = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  }, []);

  const onPointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    captionId: string,
    handle: HandleType,
  ) => {
    e.stopPropagation();
    if (handle !== "move") e.preventDefault();
    const cap = captions.find(c => c.id === captionId);
    if (!cap || cap.locked) return;

    onCaptionSelect(captionId);
    const { x, y } = toNorm(e.clientX, e.clientY);
    dragRef.current = {
      handle, captionId,
      startX: x, startY: y,
      origX: cap.x, origY: cap.y, origW: cap.width, origRot: cap.rotation,
      centerX: cap.x + cap.width / 2, centerY: cap.y + 0.05,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [captions, onCaptionSelect, toNorm]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const { x, y } = toNorm(e.clientX, e.clientY);
    const dx = x - drag.startX;
    const dy = y - drag.startY;

    if (drag.handle === "move") {
      onCaptionUpdate(drag.captionId, {
        x: Math.max(0, Math.min(1 - drag.origW, drag.origX + dx)),
        y: Math.max(0, Math.min(0.95, drag.origY + dy)),
      });
    } else if (drag.handle === "resize-se") {
      const newW = Math.max(0.1, drag.origW + dx);
      onCaptionUpdate(drag.captionId, { width: Math.min(1 - drag.origX, newW) });
    } else if (drag.handle === "resize-sw") {
      const newW = Math.max(0.1, drag.origW - dx);
      const newX = drag.origX + drag.origW - newW;
      onCaptionUpdate(drag.captionId, { width: newW, x: Math.max(0, newX) });
    } else if (drag.handle === "resize-ne") {
      const newW = Math.max(0.1, drag.origW + dx);
      onCaptionUpdate(drag.captionId, { width: Math.min(1 - drag.origX, newW) });
    } else if (drag.handle === "resize-nw") {
      const newW = Math.max(0.1, drag.origW - dx);
      const newX = drag.origX + drag.origW - newW;
      onCaptionUpdate(drag.captionId, { width: newW, x: Math.max(0, newX) });
    } else if (drag.handle === "rotate") {
      const angle = Math.atan2(y - drag.centerY, x - drag.centerX) * (180 / Math.PI);
      const startAngle = Math.atan2(drag.startY - drag.centerY, drag.startX - drag.centerX) * (180 / Math.PI);
      onCaptionUpdate(drag.captionId, { rotation: drag.origRot + (angle - startAngle) });
    }
  }, [onCaptionUpdate, toNorm]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDblClick = useCallback((e: React.MouseEvent, captionId: string) => {
    e.stopPropagation();
    const cap = captions.find(c => c.id === captionId);
    if (!cap) return;
    setEditingId(captionId);
    setEditText(cap.text);
  }, [captions]);

  const commitEdit = useCallback(() => {
    if (editingId) {
      onCaptionUpdate(editingId, { text: editText });
      setEditingId(null);
    }
  }, [editingId, editText, onCaptionUpdate]);

  // Cancel edit on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setEditingId(null); }
      if (e.key === "Delete" && selectedCaptionId && !editingId) {
        // handled by parent via keyboard
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedCaptionId, editingId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute", inset: 0, zIndex: 10,
        pointerEvents: isPlaying ? "none" : "auto",
        cursor: "default",
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={() => { if (!isPlaying) onCaptionSelect(null); }}
    >
      {/* ── Guide overlays ── */}
      {showGrid && <GridOverlay />}
      {showThirds && <ThirdsOverlay />}
      {showSafeZones && <SafeZonesOverlay />}

      {/* ── Caption renderings ── */}
      {visibleCaptions.map(cap => {
        const isSelected = cap.id === selectedCaptionId && !isPlaying;
        const isEditing = cap.id === editingId;

        const textShadow = cap.shadowEnabled
          ? `${cap.shadowOffsetX}px ${cap.shadowOffsetY}px ${cap.shadowBlur}px ${cap.shadowColor}`
          : undefined;
        const WebkitTextStroke = cap.strokeWidth > 0
          ? `${cap.strokeWidth}px ${cap.strokeColor}`
          : undefined;

        return (
          <div
            key={cap.id}
            style={{
              position: "absolute",
              left: `${cap.x * 100}%`,
              top: `${cap.y * 100}%`,
              width: `${cap.width * 100}%`,
              transform: `rotate(${cap.rotation}deg)`,
              transformOrigin: "top left",
              cursor: cap.locked ? "default" : "move",
              userSelect: "none",
              outline: isSelected ? "1.5px solid rgba(201,169,110,0.9)" : "none",
              outlineOffset: 2,
            }}
            onPointerDown={e => onPointerDown(e, cap.id, "move")}
            onDoubleClick={e => onDblClick(e, cap.id)}
          >
            {/* Background box */}
            {cap.bgEnabled && (
              <div style={{
                position: "absolute", inset: 0,
                background: cap.bgColor,
                opacity: cap.bgOpacity,
                borderRadius: cap.bgRadius,
                padding: cap.bgPadding,
                zIndex: 0,
              }} />
            )}

            {/* Text or inline editor */}
            {isEditing ? (
              <textarea
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } }}
                style={{
                  width: "100%", minHeight: 40,
                  background: "rgba(0,0,0,0.7)", color: cap.color,
                  border: "1px solid var(--accent)", borderRadius: 4,
                  padding: `${cap.bgPadding}px`,
                  fontFamily: cap.fontFamily, fontSize: cap.fontSize * 0.45,
                  fontWeight: cap.fontWeight, fontStyle: cap.fontStyle,
                  textAlign: cap.textAlign, lineHeight: cap.lineHeight,
                  letterSpacing: cap.letterSpacing,
                  resize: "none", outline: "none", zIndex: 2, position: "relative",
                }}
              />
            ) : (
              <div style={{
                position: "relative", zIndex: 1,
                fontFamily: cap.fontFamily,
                fontSize: `${cap.fontSize * 0.45}px`,
                fontWeight: cap.fontWeight,
                fontStyle: cap.fontStyle,
                textDecoration: cap.textDecoration,
                color: cap.color,
                textAlign: cap.textAlign,
                lineHeight: cap.lineHeight,
                letterSpacing: `${cap.letterSpacing}px`,
                textShadow,
                WebkitTextStroke,
                padding: cap.bgEnabled ? `${cap.bgPadding}px` : undefined,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                pointerEvents: "none",
              }}>
                {cap.text}
              </div>
            )}

            {/* Selection handles */}
            {isSelected && !isEditing && (
              <>
                {/* Rotation handle */}
                <Handle
                  top={-24} left={`calc(50% - 7px)`}
                  cursor="crosshair"
                  onPointerDown={e => onPointerDown(e, cap.id, "rotate")}
                  icon="↻"
                />
                {/* Corner resize handles */}
                <Handle top={-5} left={-5} cursor="nw-resize" onPointerDown={e => onPointerDown(e, cap.id, "resize-nw")} />
                <Handle top={-5} right={-5} cursor="ne-resize" onPointerDown={e => onPointerDown(e, cap.id, "resize-ne")} />
                <Handle bottom={-5} left={-5} cursor="sw-resize" onPointerDown={e => onPointerDown(e, cap.id, "resize-sw")} />
                <Handle bottom={-5} right={-5} cursor="se-resize" onPointerDown={e => onPointerDown(e, cap.id, "resize-se")} />
                {/* Rotation line */}
                <div style={{
                  position: "absolute", top: -20, left: "calc(50% - 0.5px)",
                  width: 1, height: 16, background: "rgba(201,169,110,0.7)",
                  pointerEvents: "none",
                }} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Selection handle dot ─────────────────────────────────────────────────── */
function Handle({
  top, bottom, left, right, cursor, onPointerDown, icon,
}: {
  top?: number | string; bottom?: number | string;
  left?: number | string; right?: number | string;
  cursor: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  icon?: string;
}) {
  return (
    <div
      onPointerDown={e => { e.stopPropagation(); onPointerDown(e); }}
      style={{
        position: "absolute",
        top: top !== undefined ? top : undefined,
        bottom: bottom !== undefined ? bottom : undefined,
        left: left !== undefined ? left : undefined,
        right: right !== undefined ? right : undefined,
        width: 14, height: 14, borderRadius: "50%",
        background: "#c9a96e",
        border: "2px solid #0e0e0f",
        cursor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: "#0e0e0f", fontWeight: 700,
        zIndex: 20, userSelect: "none",
      }}
    >
      {icon ?? ""}
    </div>
  );
}

/* ── Guide overlays ───────────────────────────────────────────────────────── */
function GridOverlay() {
  const lines = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 8 }}>
      {lines.map(p => (
        <div key={`h${p}`} style={{
          position: "absolute", left: 0, right: 0,
          top: `${p}%`, height: 1,
          background: "rgba(255,255,255,0.08)",
        }} />
      ))}
      {lines.map(p => (
        <div key={`v${p}`} style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${p}%`, width: 1,
          background: "rgba(255,255,255,0.08)",
        }} />
      ))}
    </div>
  );
}

function ThirdsOverlay() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 8 }}>
      {[33.33, 66.66].map(p => (
        <div key={`h${p}`} style={{
          position: "absolute", left: 0, right: 0,
          top: `${p}%`, height: 1,
          background: "rgba(96,165,250,0.35)",
        }} />
      ))}
      {[33.33, 66.66].map(p => (
        <div key={`v${p}`} style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${p}%`, width: 1,
          background: "rgba(96,165,250,0.35)",
        }} />
      ))}
      {/* Intersection dots */}
      {[33.33, 66.66].flatMap(y => [33.33, 66.66].map(x => (
        <div key={`d${x}${y}`} style={{
          position: "absolute",
          left: `calc(${x}% - 4px)`, top: `calc(${y}% - 4px)`,
          width: 8, height: 8, borderRadius: "50%",
          background: "rgba(96,165,250,0.7)",
        }} />
      )))}
    </div>
  );
}

function SafeZonesOverlay() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 8 }}>
      {/* Action safe — 90% */}
      <div style={{
        position: "absolute", inset: "5%",
        border: "1px dashed rgba(52,211,153,0.4)",
        borderRadius: 2,
      }}>
        <span style={{
          position: "absolute", top: 3, left: 4,
          fontSize: 7, color: "rgba(52,211,153,0.6)", letterSpacing: "0.1em",
        }}>ACTION SAFE</span>
      </div>
      {/* Title safe — 80% */}
      <div style={{
        position: "absolute", inset: "10%",
        border: "1px dashed rgba(251,191,36,0.35)",
        borderRadius: 2,
      }}>
        <span style={{
          position: "absolute", top: 3, left: 4,
          fontSize: 7, color: "rgba(251,191,36,0.55)", letterSpacing: "0.1em",
        }}>TITLE SAFE</span>
      </div>
    </div>
  );
}
