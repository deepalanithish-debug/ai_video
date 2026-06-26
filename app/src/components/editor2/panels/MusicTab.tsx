"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useEditorStore, type AudioTrack } from "@/store/editorStore";
import { v4 as uuidv4 } from "uuid";

// Royalty-free preview: real sample audio URLs from the internet
const STOCK_TRACKS = [
  {
    name: "Luxury Ambient",
    duration: 120, genre: "Ambient", mood: "Luxury",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "#C9A96E",
  },
  {
    name: "Energetic Beat",
    duration: 95, genre: "Electronic", mood: "Energetic",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "#EF4444",
  },
  {
    name: "Cinematic Rise",
    duration: 180, genre: "Cinematic", mood: "Dramatic",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    color: "#A78BFA",
  },
  {
    name: "Chill Vibes",
    duration: 150, genre: "Lo-Fi", mood: "Calm",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    color: "#60A5FA",
  },
  {
    name: "Epic Trailer",
    duration: 90, genre: "Orchestral", mood: "Epic",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    color: "#F59E0B",
  },
  {
    name: "Upbeat Pop",
    duration: 110, genre: "Pop", mood: "Playful",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    color: "#34D399",
  },
];

function Slider({ label, value, min, max, step = 0.01, onChange, suffix = "" }: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{Math.round(value * 100)}%{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", height: 3 }} />
    </div>
  );
}

// ── Preview Player for stock tracks ──────────────────────────────────────────
function StockTrackRow({ track, onAdd }: {
  track: typeof STOCK_TRACKS[0];
  onAdd: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(track.src);
      a.crossOrigin = "anonymous";
      a.volume = 0.6;
      a.onended = () => setPlaying(false);
      audioRef.current = a;
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        // Fallback: use Web Audio API tone
        setPlaying(false);
      });
      setPlaying(true);
    }
  }, [playing, track.src]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "9px 10px", borderRadius: "var(--r-md)",
      background: playing ? `color-mix(in srgb, ${track.color} 8%, var(--bg-elevated))` : "var(--bg-elevated)",
      border: `1px solid ${playing ? `${track.color}44` : "var(--border)"}`,
      transition: "all 0.15s ease",
    }}>
      {/* Play/stop */}
      <button
        onClick={toggle}
        title={playing ? "Stop preview" : "Preview track"}
        style={{
          width: 32, height: 32, borderRadius: "var(--r-sm)", flexShrink: 0,
          background: playing ? track.color : "var(--bg-overlay)",
          border: `1px solid ${playing ? "transparent" : "var(--border)"}`,
          color: playing ? "#fff" : "var(--text-secondary)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.12s ease",
        }}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {track.name}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 6, marginTop: 1 }}>
          <span>{track.genre}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: track.color }}>{track.mood}</span>
        </div>
      </div>

      {/* Animated bars when playing */}
      {playing && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 3, borderRadius: 99, background: track.color,
              animation: `music-bar 0.6s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.12}s`,
              height: `${20 + i * 15}%`,
            }} />
          ))}
        </div>
      )}

      {/* Add to project */}
      <button
        onClick={e => { e.stopPropagation(); onAdd(); }}
        style={{
          background: "var(--accent-bg)", border: "1px solid var(--accent-dim)",
          borderRadius: "var(--r-xs)", color: "var(--accent)", cursor: "pointer",
          padding: "4px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0,
          transition: "all 0.12s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}
      >
        + Add
      </button>
    </div>
  );
}

// ── Active track row ──────────────────────────────────────────────────────────
function TrackRow({ track }: { track: AudioTrack }) {
  const { updateAudioTrack, removeAudioTrack } = useEditorStore();
  const [expanded, setExpanded] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = useCallback(() => {
    if (!track.src) return;
    if (!previewRef.current) {
      const a = new Audio(track.src);
      a.volume = track.volume;
      a.onended = () => setPreviewPlaying(false);
      previewRef.current = a;
    }
    if (previewPlaying) {
      previewRef.current.pause();
      previewRef.current.currentTime = 0;
      setPreviewPlaying(false);
    } else {
      previewRef.current.volume = track.volume;
      previewRef.current.play().catch(() => setPreviewPlaying(false));
      setPreviewPlaying(true);
    }
  }, [previewPlaying, track.src, track.volume]);

  useEffect(() => {
    return () => { previewRef.current?.pause(); };
  }, []);

  const typeColors: Record<string, string> = { bgm: "var(--accent)", sfx: "var(--ai)", voice: "var(--success)" };

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
      <div style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Preview play */}
          {track.src && (
            <button onClick={togglePreview} style={{
              width: 26, height: 26, borderRadius: "var(--r-sm)", flexShrink: 0,
              background: previewPlaying ? "var(--accent)" : "var(--bg-overlay)",
              border: `1px solid ${previewPlaying ? "transparent" : "var(--border)"}`,
              color: previewPlaying ? "#fff" : "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {previewPlaying
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
            </button>
          )}
          {/* Mute toggle */}
          <button onClick={() => updateAudioTrack(track.id, { muted: !track.muted })} style={{
            width: 26, height: 26, borderRadius: "var(--r-sm)", flexShrink: 0,
            background: track.muted ? "var(--error-bg)" : "var(--bg-overlay)",
            border: `1px solid ${track.muted ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
            color: track.muted ? "var(--error)" : "var(--text-muted)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {track.muted
                ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                : <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/></>}
            </svg>
          </button>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {track.name}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 99,
                background: `color-mix(in srgb, ${typeColors[track.type]} 15%, transparent)`,
                color: typeColors[track.type],
                border: `1px solid color-mix(in srgb, ${typeColors[track.type]} 30%, transparent)`,
              }}>
                {track.type.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{Math.floor(track.volume * 100)}% vol</span>
            </div>
          </div>
          {/* Expand/Remove */}
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 3, display: "flex" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <button onClick={() => removeAudioTrack(track.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 3, display: "flex" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {/* Volume */}
        <div style={{ marginTop: 7 }}>
          <input type="range" min="0" max="1" step="0.01" value={track.volume}
            onChange={e => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
            style={{ width: "100%", accentColor: typeColors[track.type], height: 3 }} />
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "8px 10px 10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <Slider label="Fade In" value={track.fadeIn} min={0} max={5} step={0.1}
            onChange={v => updateAudioTrack(track.id, { fadeIn: v })} />
          <Slider label="Fade Out" value={track.fadeOut} min={0} max={5} step={0.1}
            onChange={v => updateAudioTrack(track.id, { fadeOut: v })} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["bgm", "sfx", "voice"] as const).map(t => (
                <button key={t} onClick={() => updateAudioTrack(track.id, { type: t })} style={{
                  flex: 1, padding: "4px 0", borderRadius: "var(--r-xs)", fontSize: 10, fontWeight: 700,
                  background: track.type === t ? "var(--accent-bg)" : "var(--bg-inset)",
                  border: `1px solid ${track.type === t ? "var(--accent-dim)" : "var(--border)"}`,
                  color: track.type === t ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer", textTransform: "uppercase",
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MusicTab() {
  const { audioTracks, addAudioTrack } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const src = URL.createObjectURL(file);
      const track: AudioTrack = {
        id: uuidv4(), name: file.name.replace(/\.[^.]+$/, ""),
        src, file, duration: 0, volume: 0.7,
        fadeIn: 0.5, fadeOut: 1, startTime: 0, muted: false, type: "bgm",
      };
      addAudioTrack(track);
      const el = document.createElement("audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        useEditorStore.setState(s => ({
          audioTracks: s.audioTracks.map(t =>
            t.id === track.id ? { ...t, duration: Math.round(el.duration) } : t
          ),
        }));
      };
      el.src = src;
    });
  };

  const handleAddStock = (t: typeof STOCK_TRACKS[0]) => {
    addAudioTrack({
      id: uuidv4(), name: t.name, src: t.src,
      file: new File([], t.name),
      duration: t.duration, volume: 0.7,
      fadeIn: 0.5, fadeOut: 1, startTime: 0, muted: false, type: "bgm",
    });
  };

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--bg-inset)", borderRadius: "var(--r-md)", padding: 3, gap: 3 }}>
        {(["library", "upload"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "5px 0", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600,
            background: activeTab === t ? "var(--bg-elevated)" : "transparent",
            border: activeTab === t ? "1px solid var(--border)" : "1px solid transparent",
            color: activeTab === t ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {activeTab === "upload" ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: "1.5px dashed var(--border)", borderRadius: "var(--r-lg)",
            padding: "20px 12px", textAlign: "center", cursor: "pointer",
            background: "var(--bg-inset)", transition: "all 0.12s ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-dim)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ margin: "0 auto 8px", display: "block" }}>
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Upload Music</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>MP3, WAV, AAC, M4A</div>
          <input ref={inputRef} type="file" multiple accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg" style={{ display: "none" }}
            onChange={e => handleUpload(e.target.files)} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", padding: "0 2px" }}>
            Royalty-Free Library — click ▶ to preview
          </div>
          {STOCK_TRACKS.map(t => (
            <StockTrackRow key={t.name} track={t} onAdd={() => handleAddStock(t)} />
          ))}
        </div>
      )}

      {/* Active tracks */}
      {audioTracks.length > 0 && (
        <>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Active Tracks ({audioTracks.length})
          </div>
          {audioTracks.map(t => <TrackRow key={t.id} track={t} />)}
        </>
      )}
    </div>
  );
}
