"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui";
import { MUSIC_LIBRARY } from "@/types/music";

interface Track {
  id: string;
  name: string;
  genre: string;
  mood: string;
  duration: number;
  src: string;
  isCustom?: boolean;
}

// Map the real Bensound-backed library (src/types/music.ts) into the page's Track shape.
// The playable URL is `previewUrl` (routed through /api/audio-proxy).
const STOCK_LIBRARY: Track[] = MUSIC_LIBRARY.map(t => ({
  id: t.id,
  name: t.title,
  genre: t.category,
  mood: t.mood,
  duration: t.duration,
  src: t.previewUrl,
}));

const MOODS = ["All", ...Array.from(new Set(MUSIC_LIBRARY.map(t => t.mood)))];
const GENRES = ["All", ...Array.from(new Set(MUSIC_LIBRARY.map(t => t.category)))];

function formatDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const MOOD_COLORS: Record<string, string> = {
  Luxury: "#C9A96E", Energetic: "#F87171", Calm: "#60A5FA",
  Dramatic: "#A78BFA", Playful: "#34D399", Epic: "#F59E0B",
};

export default function MusicPage() {
  const { success } = useToast();
  const [customTracks, setCustomTracks] = useState<Track[]>([]);
  const [moodFilter, setMoodFilter] = useState("All");
  const [genreFilter, setGenreFilter] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);
  const [tab, setTab] = useState<"library" | "uploads">("library");
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Keep refs of created object URLs so we can revoke them (avoid blob leaks).
  const customTracksRef = useRef<Track[]>([]);
  customTracksRef.current = customTracks;

  // Stop any playing audio and revoke custom-track object URLs on unmount/navigation.
  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
    customTracksRef.current.forEach(t => {
      if (t.isCustom && t.src) URL.revokeObjectURL(t.src);
    });
  }, []);

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const src = URL.createObjectURL(file);
      const el = document.createElement("audio");
      el.preload = "metadata";
      const id = crypto.randomUUID();
      el.onloadedmetadata = () => {
        setCustomTracks(prev => [...prev, {
          id, name: file.name.replace(/\.[^.]+$/, ""),
          genre: "Custom", mood: "Custom",
          duration: Math.round(el.duration), src, isCustom: true,
        }]);
      };
      el.src = src;
    });
  };

  const togglePlay = (track: Track) => {
    if (!track.src) return;
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      audioRef.current?.pause();
      audioRef.current = new Audio(track.src);
      audioRef.current.play().catch(() => {});
      setPlaying(track.id);
      audioRef.current.onended = () => setPlaying(null);
    }
  };

  const library = STOCK_LIBRARY.filter(t =>
    (moodFilter === "All" || t.mood === moodFilter) &&
    (genreFilter === "All" || t.genre === genreFilter)
  );

  const tracks = tab === "library" ? library : customTracks;

  return (
    <div style={{ padding: "32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Music Library</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Royalty-free tracks ready for your videos.</p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setTab("uploads"); inputRef.current?.click(); }} style={{
          padding: "9px 18px", borderRadius: "var(--r-md)",
          background: "var(--accent)", color: "#FFFFFF",
          border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Track
        </button>
        <input ref={inputRef} type="file" multiple accept="audio/*" style={{ display: "none" }}
          onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, background: "var(--bg-elevated)", borderRadius: "var(--r-md)", padding: 3, width: "fit-content", marginBottom: 20 }}>
        {(["library", "uploads"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "5px 18px", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600,
            background: tab === t ? "var(--bg-surface)" : "transparent",
            border: tab === t ? "1px solid var(--border)" : "1px solid transparent",
            color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer", textTransform: "capitalize",
          }}>
            {t === "library" ? `Library (${STOCK_LIBRARY.length})` : `My Uploads (${customTracks.length})`}
          </button>
        ))}
      </div>

      {/* Filters (library only) */}
      {tab === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", width: 42 }}>Mood</span>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMoodFilter(m)} style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: moodFilter === m ? (MOOD_COLORS[m] ? `color-mix(in srgb, ${MOOD_COLORS[m]} 15%, transparent)` : "var(--accent-bg)") : "var(--bg-elevated)",
                border: `1px solid ${moodFilter === m ? (MOOD_COLORS[m] ? MOOD_COLORS[m] + "50" : "var(--accent-dim)") : "var(--border)"}`,
                color: moodFilter === m ? (MOOD_COLORS[m] ?? "var(--accent)") : "var(--text-muted)",
                cursor: "pointer",
              }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", width: 42 }}>Genre</span>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)} style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: genreFilter === g ? "var(--accent-bg)" : "var(--bg-elevated)",
                border: `1px solid ${genreFilter === g ? "var(--accent-dim)" : "var(--border)"}`,
                color: genreFilter === g ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
              }}>{g}</button>
            ))}
          </div>
        </div>
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <div style={{
          padding: "48px", textAlign: "center", borderRadius: "var(--r-xl)",
          background: "var(--bg-surface)", border: "1.5px dashed var(--border)",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" style={{ margin: "0 auto 12px" }}>
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            {tab === "uploads" ? "No uploaded tracks" : "No tracks match filters"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {tab === "uploads" ? "Upload your own music to use in videos" : "Try a different mood or genre"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tracks.map((t, i) => {
            const isPlaying = playing === t.id;
            const moodColor = MOOD_COLORS[t.mood] ?? "var(--text-muted)";
            return (
              <div key={t.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                borderRadius: "var(--r-md)", background: isPlaying ? "var(--accent-bg)" : "var(--bg-surface)",
                border: `1px solid ${isPlaying ? "var(--accent-dim)" : "transparent"}`,
                transition: "all 0.12s ease",
              }}
                onMouseEnter={e => { if (!isPlaying) { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.borderColor = "var(--border)"; }}}
                onMouseLeave={e => { if (!isPlaying) { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = "transparent"; }}}
              >
                {/* Index / play button */}
                <button
                  onClick={() => togglePlay(t)}
                  disabled={!t.src}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: isPlaying ? "var(--accent)" : "var(--bg-elevated)",
                    border: `1px solid ${isPlaying ? "transparent" : "var(--border)"}`,
                    cursor: t.src ? "pointer" : "default", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: isPlaying ? "#0A0A0E" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}>
                  {!t.src ? (
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  ) : isPlaying ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  )}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{t.genre}</div>
                </div>

                {/* Mood badge */}
                <span style={{
                  padding: "3px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700,
                  background: `color-mix(in srgb, ${moodColor} 12%, transparent)`,
                  color: moodColor, border: `1px solid color-mix(in srgb, ${moodColor} 25%, transparent)`,
                }}>
                  {t.mood}
                </span>

                {/* Duration */}
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: 36, textAlign: "right", flexShrink: 0 }}>
                  {formatDur(t.duration)}
                </span>

                {/* Add to project */}
                <button
                  onClick={() => success(`Added "${t.name}" — open the editor to place it on the timeline.`)}
                  style={{
                    padding: "4px 10px", borderRadius: "var(--r-xs)", fontSize: 10, fontWeight: 700,
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", cursor: "pointer", flexShrink: 0,
                  }}>
                  + Use
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
