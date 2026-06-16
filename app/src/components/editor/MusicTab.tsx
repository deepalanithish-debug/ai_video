"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { MusicTrack, MusicCategory } from "@/types/music";
import { MUSIC_LIBRARY, DEFAULT_AUDIO_SETTINGS } from "@/types/music";
import type { UploadedAudio } from "@/types/clips";
import type { Timeline } from "@/types/timeline";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
type MusicSubTab = "library" | "uploaded" | "controls";

const CATEGORY_COLORS: Record<MusicCategory | "all", string> = {
  all: "#7c3aed",
  cinematic: "#7c3aed",
  travel: "#06b6d4",
  luxury: "#c9a96e",
  ugc: "#ec4899",
  corporate: "#3b82f6",
  "product-ads": "#10b981",
  energetic: "#f59e0b",
  emotional: "#8b5cf6",
};

const CATEGORIES: { id: MusicCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cinematic", label: "Cinematic" },
  { id: "travel", label: "Travel" },
  { id: "luxury", label: "Luxury" },
  { id: "ugc", label: "UGC" },
  { id: "corporate", label: "Corporate" },
  { id: "product-ads", label: "Product Ads" },
  { id: "energetic", label: "Energetic" },
  { id: "emotional", label: "Emotional" },
];

const NOISE_TYPES = ["Background Hum", "Fan Noise", "Wind", "Environmental"] as const;
type NoiseType = typeof NOISE_TYPES[number];

function fmtDuration(d: number): string {
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
}

/* ─── CSS keyframe injection ─────────────────────────────────────────────────── */
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes waveBar {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes musicTabFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes accentGlow {
      0%, 100% { box-shadow: 0 0 6px 1px rgba(124,58,237,0.5); }
      50% { box-shadow: 0 0 14px 3px rgba(124,58,237,0.8); }
    }
    @keyframes subtabUnderline {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Waveform visualization ─────────────────────────────────────────────────── */
function WaveformBars({ waveform, isPlaying }: { waveform: number[]; isPlaying: boolean }) {
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {waveform.map((v, i) => {
        const barH = Math.max(3, v * 24);
        const x = i * 2;
        const y = (28 - barH) / 2;
        return (
          <rect
            key={i}
            x={x} y={y} width={1.2} height={barH}
            fill="url(#waveGrad)"
            rx={0.6}
            style={isPlaying ? {
              transformOrigin: `${x + 0.6}px ${y + barH / 2}px`,
              animation: `waveBar ${0.4 + (i % 5) * 0.12}s ease-in-out infinite`,
              animationDelay: `${i * 0.05}s`,
            } : undefined}
          />
        );
      })}
    </svg>
  );
}

/* ─── Track Card ─────────────────────────────────────────────────────────────── */
function TrackCard({
  track, isPlaying, isFailed, onTogglePlay, onAddToTimeline, onDelete,
  showDelete = false,
}: {
  track: MusicTrack;
  isPlaying: boolean;
  isFailed: boolean;
  onTogglePlay: (track: MusicTrack) => void;
  onAddToTimeline: (track: MusicTrack) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [addHovered, setAddHovered] = useState(false);
  const catColor = CATEGORY_COLORS[track.category] ?? "#7c3aed";

  const borderColor = isPlaying
    ? "rgba(124,58,237,0.5)"
    : hovered
      ? "rgba(124,58,237,0.3)"
      : "rgba(124,58,237,0.1)";

  const cardBg = isPlaying
    ? "rgba(124,58,237,0.05)"
    : hovered
      ? "rgba(124,58,237,0.07)"
      : "rgba(255,255,255,0.025)";

  const playBtnColor = isFailed ? "#f87171" : isPlaying ? "#7c3aed" : "rgba(124,58,237,0.15)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        border: `1px solid ${borderColor}`,
        background: cardBg,
        padding: "10px 12px 10px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
        boxShadow: isPlaying ? "0 0 16px rgba(124,58,237,0.12)" : hovered ? "0 0 12px rgba(124,58,237,0.08)" : "none",
        cursor: "default",
        animation: "musicTabFadeIn 0.2s ease both",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        background: catColor,
        borderRadius: "10px 0 0 10px",
        animation: isPlaying ? "accentGlow 1.5s ease-in-out infinite" : undefined,
      }} />

      {/* Row 1: waveform + title/artist + badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <WaveformBars waveform={track.waveform} isPlaying={isPlaying} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f1f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
              {track.title}
            </span>
            {track.isRoyaltyFree && (
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em",
                color: "#34d399", border: "1px solid rgba(52,211,153,0.35)",
                borderRadius: 3, padding: "1px 4px",
              }}>RF</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#8888a8", marginTop: 2 }}>{track.artist}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, color: "#8888a8", fontVariantNumeric: "tabular-nums" }}>
            {fmtDuration(track.duration)}
          </span>
          {track.bpm > 0 && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em",
              color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 3, padding: "1px 5px",
            }}>{track.bpm} BPM</span>
          )}
        </div>
      </div>

      {/* Row 2: category + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.07em",
          color: catColor, border: `1px solid ${catColor}44`,
          borderRadius: 4, padding: "2px 7px",
          background: `${catColor}12`,
          flexShrink: 0,
        }}>
          {track.category.toUpperCase().replace("-", " ")}
        </span>
        <div style={{ flex: 1 }} />
        {showDelete && onDelete && (
          <button
            onClick={() => onDelete(track.id)}
            title="Remove"
            style={{
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 6, color: "#f87171", cursor: "pointer",
              padding: "4px 8px", fontSize: 11,
            }}
          >
            ✕
          </button>
        )}
        {/* Play/Pause */}
        <button
          onClick={() => onTogglePlay(track)}
          title={isFailed ? "Failed to load" : isPlaying ? "Pause" : "Play preview"}
          style={{
            width: 28, height: 28, borderRadius: "50%", border: "none",
            background: playBtnColor,
            color: "#f1f1f6", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", flexShrink: 0,
          }}
        >
          {isFailed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="#f87171"><line x1="2" y1="2" x2="8" y2="8" stroke="#f87171" strokeWidth="2" /><line x1="8" y1="2" x2="2" y2="8" stroke="#f87171" strokeWidth="2" /></svg>
            : isPlaying
              ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="1" /><rect x="6" y="1" width="3" height="8" rx="1" /></svg>
              : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,1 9,5 2,9" /></svg>
          }
        </button>
        {/* Add to timeline */}
        <button
          onClick={() => onAddToTimeline(track)}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          title="Add to timeline"
          style={{
            borderRadius: 6, border: "1px solid rgba(124,58,237,0.4)",
            background: addHovered ? "rgba(124,58,237,0.35)" : "rgba(124,58,237,0.15)",
            color: "#a78bfa",
            cursor: "pointer", padding: "5px 10px", fontSize: 11, fontWeight: 600,
            letterSpacing: "0.04em",
            transition: "background 0.15s, transform 0.1s",
            transform: addHovered ? "scale(1.04)" : "scale(1)",
            flexShrink: 0,
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

/* ─── Slider ─────────────────────────────────────────────────────────────────── */
function PurpleSlider({
  value, onChange, min = 0, max = 100, label, showValue = true,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; label?: string; showValue?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "#8888a8" }}>{label}</span>
          {showValue && <span style={{ fontSize: 11.5, color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>{value}{max === 100 ? "%" : "s"}</span>}
        </div>
      )}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
        }} />
        <div style={{
          position: "absolute", left: 0, width: `${pct}%`, height: 4, borderRadius: 2,
          background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
        }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%",
            opacity: 0, height: 20, cursor: "pointer", margin: 0,
            accentColor: "#7c3aed",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Toggle ─────────────────────────────────────────────────────────────────── */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none",
        background: value ? "#7c3aed" : "rgba(255,255,255,0.1)",
        position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

/* ─── Mute button ────────────────────────────────────────────────────────────── */
function MuteBtn({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={muted ? "Unmute" : "Mute"}
      style={{
        width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
        background: muted ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)",
        color: muted ? "#f87171" : "#8888a8", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {muted
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
      }
    </button>
  );
}

/* ─── Controls section card ──────────────────────────────────────────────────── */
function ControlCard({ title, badge, icon, children }: { title: string; badge?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(124,58,237,0.12)",
      background: "rgba(255,255,255,0.02)",
      padding: 14,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ color: "#a78bfa", flexShrink: 0 }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#f1f1f6", flex: 1 }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            color: "#67e8f9",
            borderRadius: 3, padding: "2px 6px",
            background: "linear-gradient(90deg, rgba(124,58,237,0.3), rgba(6,182,212,0.3))",
          }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Library Tab ────────────────────────────────────────────────────────────── */
function LibraryTab({
  playingId, failedId, onTogglePlay, onAddToTimeline,
}: {
  playingId: string | null;
  failedId: string | null;
  onTogglePlay: (track: MusicTrack) => void;
  onAddToTimeline: (track: MusicTrack) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MusicCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MUSIC_LIBRARY.filter(t => {
      const matchCat = category === "all" || t.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    });
  }, [search, category]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#44445a" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text" placeholder="Search tracks, artist, tag…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8,
            border: "1px solid rgba(124,58,237,0.2)", background: "rgba(255,255,255,0.04)",
            color: "#f1f1f6", fontSize: 12.5, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {CATEGORIES.map(cat => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                flexShrink: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em",
                padding: "4px 10px", borderRadius: 20,
                border: isActive ? "none" : "1px solid rgba(124,58,237,0.2)",
                background: isActive
                  ? "linear-gradient(90deg, rgba(124,58,237,0.6), rgba(6,182,212,0.6))"
                  : "rgba(124,58,237,0.06)",
                color: isActive ? "#ffffff" : "#8888a8",
                cursor: "pointer", transition: "all 0.12s",
                boxShadow: isActive ? "0 0 10px rgba(124,58,237,0.3)" : undefined,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 8px rgba(124,58,237,0.15)";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Track list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: "#44445a", fontSize: 13 }}>
          No tracks match your search
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filtered.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              isPlaying={playingId === track.id}
              isFailed={failedId === track.id}
              onTogglePlay={onTogglePlay}
              onAddToTimeline={onAddToTimeline}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Uploaded Tab ───────────────────────────────────────────────────────────── */
function UploadedTab({
  audioTracks, playingId, failedId, onTogglePlay, onAddToTimeline, onUpload, onDelete,
}: {
  audioTracks: UploadedAudio[];
  playingId: string | null;
  failedId: string | null;
  onTogglePlay: (track: MusicTrack) => void;
  onAddToTimeline: (track: MusicTrack) => void;
  onUpload: () => void;
  onDelete: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  // Convert UploadedAudio to MusicTrack shape for display
  const toMusicTrack = useCallback((ua: UploadedAudio): MusicTrack => ({
    id: ua.id,
    title: ua.name.replace(/\.[^.]+$/, ""),
    artist: "Uploaded",
    duration: ua.duration ?? 0,
    category: "ugc",
    bpm: 0,
    tags: ["uploaded"],
    previewUrl: ua.objectUrl ?? "",
    waveform: Array.from({ length: 40 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 0.6))),
    mood: "custom",
    isRoyaltyFree: false,
  }), []);

  if (audioTracks.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Premium empty state dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            onUpload();
          }}
          onClick={onUpload}
          style={{
            borderRadius: 14,
            border: `2px dashed ${dragOver ? "rgba(124,58,237,0.8)" : "rgba(124,58,237,0.35)"}`,
            background: dragOver ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.03)",
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.18s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" style={{ display: "block" }}>
            <path d="M12 16V4m0 0L8 8m4-4l4 4" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          <div style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700 }}>Drop audio files here</div>
          <div style={{ fontSize: 11.5, color: "#44445a" }}>or click to browse</div>
          <div style={{ fontSize: 10.5, color: "#33334a", marginTop: 4 }}>MP3 · WAV · M4A · AAC</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          onUpload();
        }}
        onClick={onUpload}
        style={{
          borderRadius: 10, border: `2px dashed ${dragOver ? "rgba(124,58,237,0.7)" : "rgba(124,58,237,0.25)"}`,
          background: dragOver ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
          padding: "22px 18px", textAlign: "center", cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" style={{ display: "block", margin: "0 auto 8px" }}>
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <div style={{ fontSize: 12.5, color: "#a78bfa", fontWeight: 600 }}>Upload Audio</div>
        <div style={{ fontSize: 11, color: "#44445a", marginTop: 3 }}>MP3, WAV, M4A, AAC</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {audioTracks.map(ua => {
          const track = toMusicTrack(ua);
          return (
            <TrackCard
              key={ua.id}
              track={track}
              isPlaying={playingId === ua.id}
              isFailed={failedId === ua.id}
              onTogglePlay={onTogglePlay}
              onAddToTimeline={onAddToTimeline}
              showDelete
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── Controls Tab ───────────────────────────────────────────────────────────── */
function ControlsTab({ audioTracks }: { audioTracks: UploadedAudio[] }) {
  const [masterVol, setMasterVol] = useState(70);
  const [videoVol, setVideoVol] = useState(100);
  const [masterMuted, setMasterMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const [autoLevel, setAutoLevel] = useState(false);
  const [voiceIso, setVoiceIso] = useState(false);
  const [voiceIsoStrength, setVoiceIsoStrength] = useState(60);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [noiseStrength, setNoiseStrength] = useState(50);
  const [noiseType, setNoiseType] = useState<NoiseType>("Background Hum");

  // Per-track state
  const [trackVols, setTrackVols] = useState<Record<string, number>>({});
  const [trackFadeIn, setTrackFadeIn] = useState<Record<string, number>>({});
  const [trackFadeOut, setTrackFadeOut] = useState<Record<string, number>>({});
  const [trackMuted, setTrackMuted] = useState<Record<string, boolean>>({});

  const getTrackVol = (id: string) => trackVols[id] ?? 80;
  const getTrackFadeIn = (id: string) => trackFadeIn[id] ?? 0;
  const getTrackFadeOut = (id: string) => trackFadeOut[id] ?? 0;
  const getTrackMuted = (id: string) => trackMuted[id] ?? false;

  const volumeIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );

  const levelIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );

  const voiceIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );

  const noiseIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 6l4 4 4-4 4 4 4-4 4 4 4-4" /><path d="M1 12l4 4 4-4 4 4 4-4 4 4 4-4" /><path d="M1 18l4 4 4-4 4 4 4-4 4 4 4-4" />
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 1. Volume Mixer */}
      <ControlCard title="VOLUME MIXER" icon={volumeIcon}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: "#8888a8", flex: 1 }}>Master Music Volume</span>
              <span style={{ fontSize: 11, color: "#a78bfa", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{masterVol}%</span>
              <MuteBtn muted={masterMuted} onToggle={() => setMasterMuted(m => !m)} />
            </div>
            <PurpleSlider value={masterVol} onChange={setMasterVol} />
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, color: "#8888a8", flex: 1 }}>Video Audio Volume</span>
              <span style={{ fontSize: 11, color: "#a78bfa", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{videoVol}%</span>
              <MuteBtn muted={videoMuted} onToggle={() => setVideoMuted(m => !m)} />
            </div>
            <PurpleSlider value={videoVol} onChange={setVideoVol} />
          </div>
        </div>
      </ControlCard>

      {/* 2. Auto Volume Leveling */}
      <ControlCard title="AUTO VOLUME LEVELING" icon={levelIcon}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#44445a", lineHeight: 1.5 }}>
              Normalize audio across all tracks
            </div>
            {autoLevel && (
              <div style={{
                marginTop: 8, height: 6, borderRadius: 3,
                background: "linear-gradient(90deg, #7c3aed, #06b6d4, #7c3aed)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear infinite",
              }} />
            )}
            {autoLevel && (
              <div style={{ fontSize: 10.5, color: "#a78bfa", marginTop: 5 }}>Analyzing…</div>
            )}
          </div>
          <Toggle value={autoLevel} onChange={setAutoLevel} />
        </div>
      </ControlCard>

      {/* 3. Voice Isolation */}
      <ControlCard title="VOICE ISOLATION" badge="AI POWERED" icon={voiceIcon}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#44445a", lineHeight: 1.5 }}>
              Detect and isolate human speech
            </div>
          </div>
          <Toggle value={voiceIso} onChange={setVoiceIso} />
        </div>
        {voiceIso && (
          <div style={{ marginTop: 2 }}>
            <PurpleSlider label="Strength" value={voiceIsoStrength} onChange={setVoiceIsoStrength} />
          </div>
        )}
      </ControlCard>

      {/* 4. Noise Reduction */}
      <ControlCard title="NOISE REDUCTION" badge="AI POWERED" icon={noiseIcon}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#44445a", lineHeight: 1.5 }}>
              Remove unwanted background noise
            </div>
          </div>
          <Toggle value={noiseReduction} onChange={setNoiseReduction} />
        </div>
        {noiseReduction && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
            <PurpleSlider label="Strength" value={noiseStrength} onChange={setNoiseStrength} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 11, color: "#8888a8" }}>Noise Type</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {NOISE_TYPES.map(nt => (
                  <label key={nt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <div
                      onClick={() => setNoiseType(nt)}
                      style={{
                        width: 14, height: 14, borderRadius: "50%",
                        border: `2px solid ${noiseType === nt ? "#7c3aed" : "rgba(255,255,255,0.2)"}`,
                        background: noiseType === nt ? "#7c3aed" : "transparent",
                        cursor: "pointer", flexShrink: 0, transition: "all 0.12s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {noiseType === nt && (
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, color: noiseType === nt ? "#f1f1f6" : "#8888a8" }}>{nt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </ControlCard>

      {/* 5. Per-Track Controls */}
      {audioTracks.length > 0 && (
        <ControlCard title="PER-TRACK CONTROLS">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {audioTracks.map(ua => (
              <div key={ua.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#f1f1f6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ua.name.replace(/\.[^.]+$/, "")}
                  </span>
                  <MuteBtn muted={getTrackMuted(ua.id)} onToggle={() => setTrackMuted(m => ({ ...m, [ua.id]: !m[ua.id] }))} />
                </div>
                <PurpleSlider label="Volume" value={getTrackVol(ua.id)} onChange={v => setTrackVols(m => ({ ...m, [ua.id]: v }))} />
                <PurpleSlider label="Fade In" value={getTrackFadeIn(ua.id)} onChange={v => setTrackFadeIn(m => ({ ...m, [ua.id]: v }))} min={0} max={5} />
                <PurpleSlider label="Fade Out" value={getTrackFadeOut(ua.id)} onChange={v => setTrackFadeOut(m => ({ ...m, [ua.id]: v }))} min={0} max={5} />
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>
            ))}
          </div>
        </ControlCard>
      )}
    </div>
  );
}

/* ─── MusicTab (root) ────────────────────────────────────────────────────────── */
export interface MusicTabProps {
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  onSelectAudio: (id: string) => void;
  onUpload: () => void;
  timeline: Timeline | null;
  onAddMusicToTimeline?: (track: MusicTrack) => void;
  onDeleteUploaded?: (id: string) => void;
}

export default function MusicTab({
  audioTracks, activeAudioId, onSelectAudio, onUpload, timeline,
  onAddMusicToTimeline, onDeleteUploaded,
}: MusicTabProps) {
  const [subTab, setSubTab] = useState<MusicSubTab>("library");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inject CSS keyframes once
  useEffect(() => { injectStyles(); }, []);

  const handleTogglePlay = useCallback((track: MusicTrack) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const audio = new Audio(track.previewUrl);
      audio.volume = 0.7;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        setFailedId(track.id);
        setTimeout(() => setFailedId(null), 3000);
      };
      audioRef.current = audio;
      audio.play()
        .then(() => setPlayingId(track.id))
        .catch(() => {
          setFailedId(track.id);
          setTimeout(() => setFailedId(null), 3000);
        });
    }
  }, [playingId]);

  // Stop audio when tab changes
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, [subTab]);

  const handleAddToTimeline = useCallback((track: MusicTrack) => {
    onAddMusicToTimeline?.(track);
  }, [onAddMusicToTimeline]);

  const handleDelete = useCallback((id: string) => {
    onDeleteUploaded?.(id);
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [playingId, onDeleteUploaded]);

  const SUB_TABS: { id: MusicSubTab; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "uploaded", label: "Uploaded" },
    { id: "controls", label: "Controls" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Sub-tabs — premium pill container */}
      <div style={{
        display: "flex",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 20,
        padding: "3px",
        marginBottom: 12,
        flexShrink: 0,
        gap: 2,
      }}>
        {SUB_TABS.map(tab => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                flex: 1,
                padding: "6px 4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#ffffff" : "#8888a8",
                borderRadius: 17,
                position: "relative",
                transition: "color 0.14s",
                letterSpacing: "0.03em",
              }}
            >
              {tab.label}
              {isActive && (
                <span style={{
                  position: "absolute",
                  bottom: 2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  height: 2,
                  borderRadius: 1,
                  background: "#7c3aed",
                  display: "block",
                  animation: "subtabUnderline 0.18s ease both",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {subTab === "library" && (
          <LibraryTab
            playingId={playingId}
            failedId={failedId}
            onTogglePlay={handleTogglePlay}
            onAddToTimeline={handleAddToTimeline}
          />
        )}
        {subTab === "uploaded" && (
          <UploadedTab
            audioTracks={audioTracks}
            playingId={playingId}
            failedId={failedId}
            onTogglePlay={handleTogglePlay}
            onAddToTimeline={handleAddToTimeline}
            onUpload={onUpload}
            onDelete={handleDelete}
          />
        )}
        {subTab === "controls" && (
          <ControlsTab audioTracks={audioTracks} />
        )}
      </div>
    </div>
  );
}
