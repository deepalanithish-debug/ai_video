"use client";

import { useState, useRef, useEffect } from "react";
import type { UploadedClip, UploadedAudio } from "@/types/clips";
import type { Timeline } from "@/types/timeline";

const TABS = ["Upload", "Assets", "Templates", "Clips", "Audio", "History"];

const TEMPLATE_PRESETS = [
  { id: "luxury-30",   name: "Luxury 30s",    duration: "30s", scenes: 5, mood: "luxury",   ratio: "9:16" },
  { id: "product-15",  name: "Product 15s",   duration: "15s", scenes: 4, mood: "energetic", ratio: "9:16" },
  { id: "brand-story", name: "Brand Story",   duration: "60s", scenes: 8, mood: "calm",      ratio: "16:9" },
  { id: "reel-quick",  name: "Quick Reel",    duration: "10s", scenes: 6, mood: "playful",   ratio: "9:16" },
  { id: "cinematic-45",name: "Cinematic 45s", duration: "45s", scenes: 7, mood: "dramatic",  ratio: "16:9" },
];

const MOOD_COLORS: Record<string, string> = {
  luxury: "#c9a96e", energetic: "#f472b6", calm: "#6ee7b7", dramatic: "#a78bfa", playful: "#fcd34d",
};

const TRANSITION_LIST = [
  { type: "cinematic-fade", label: "Cinematic Fade", desc: "Slow elegant fade" },
  { type: "dissolve",       label: "Dissolve",       desc: "Cross dissolve" },
  { type: "cut",            label: "Hard Cut",        desc: "Instant cut" },
  { type: "slide-left",     label: "Slide Left",      desc: "Slide transition" },
  { type: "zoom-in",        label: "Zoom In",         desc: "Zoom burst" },
  { type: "wipe-right",     label: "Wipe Right",      desc: "Directional wipe" },
];

export type TemplatePreset = typeof TEMPLATE_PRESETS[0];

export interface BrandOverrides {
  primaryColor?: string;
  fontFamily?: string;
  logoPosition?: string;
  colorGrade?: string;
}

const FONT_OPTIONS = [
  "Cormorant Garamond",
  "Playfair Display",
  "Cinzel",
  "Raleway",
  "Montserrat",
  "Lato",
  "Georgia",
  "Helvetica Neue",
];

const COLOR_GRADE_OPTIONS = [
  "Asaya Luxury",
  "Film Noir",
  "Warm Summer",
  "Cool Winter",
  "Matte Fade",
  "Vibrant Pop",
  "Golden Hour",
  "Moody Dark",
];

const LOGO_POSITIONS = [
  { value: "top-left",      label: "↖" },
  { value: "top-center",    label: "↑" },
  { value: "top-right",     label: "↗" },
  { value: "bottom-left",   label: "↙" },
  { value: "bottom-center", label: "↓" },
  { value: "bottom-right",  label: "↘" },
];

interface HistoryEntry {
  id: number;
  promptPreview: string;
  cluster: string;
  evalScore: number | null;
  createdAt: string;
  aspectRatio: string | null;
  durationSec: number | null;
  timelineJson: string;
}

interface AssetPanelProps {
  clips: UploadedClip[];
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  timeline: Timeline | null;
  activeSceneId: string | null;
  onClipsUploaded: (files: FileList) => void;
  onAudioUploaded: (files: FileList) => void;
  onSelectAudio: (id: string) => void;
  onAssignClip: (clipId: string, sceneId: string) => void;
  onRemoveClip: (clipId: string) => void;
  onTemplateSelect?: (template: TemplatePreset) => void;
  brandOverrides?: BrandOverrides;
  onBrandOverridesChange?: (overrides: BrandOverrides) => void;
  onLoadGeneration?: (timeline: Timeline) => void;
  workspaceSlug?: string;
}

export default function AssetPanel({
  clips, audioTracks, activeAudioId, timeline, activeSceneId,
  onClipsUploaded, onAudioUploaded, onSelectAudio,
  onAssignClip, onRemoveClip, onTemplateSelect,
  brandOverrides = {}, onBrandOverridesChange,
  onLoadGeneration, workspaceSlug = "asaya",
}: AssetPanelProps) {
  const [activeTab, setActiveTab] = useState("Upload");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "History") return;
    setHistoryLoading(true);
    setHistoryError(null);
    fetch(`/api/generations?workspaceSlug=${encodeURIComponent(workspaceSlug)}&limit=20`)
      .then((r) => r.json())
      .then((data: { generations: HistoryEntry[] }) => {
        setHistoryItems(data.generations ?? []);
      })
      .catch(() => setHistoryError("Could not load history"))
      .finally(() => setHistoryLoading(false));
  }, [activeTab, workspaceSlug]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onClipsUploaded(files);
  }

  function handleAudioFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onAudioUploaded(files);
  }

  return (
    <div style={{
      width: 260, background: "var(--bg-panel)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      height: "100%", overflow: "hidden", flexShrink: 0,
    }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,.mov,.mp4,.webm"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleAudioFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 4px", overflowX: "auto", flexShrink: 0 }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 10px 9px", border: "none", background: "transparent",
            color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: 12, fontWeight: activeTab === tab ? 600 : 400, cursor: "pointer",
            borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
            transition: "all 0.15s ease", whiteSpace: "nowrap", position: "relative",
          }}>
            {tab}
            {tab === "Upload" && (clips.length + audioTracks.length) > 0 && (
              <span style={{
                position: "absolute", top: 6, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "var(--accent)", color: "#0e0e0f",
                fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{clips.length + audioTracks.length}</span>
            )}
            {tab === "Clips" && clips.length > 0 && (
              <span style={{
                position: "absolute", top: 6, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "var(--accent)", color: "#0e0e0f",
                fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{clips.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{ flex: 1, overflow: "auto", padding: "12px 10px" }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 20,
            background: "rgba(201,169,110,0.06)",
            border: "2px dashed var(--accent)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <span style={{ fontSize: 12, color: "var(--accent)" }}>Drop files here</span>
          </div>
        )}

        {activeTab === "Upload" && (
          <UploadTab
            clips={clips}
            audioTracks={audioTracks}
            activeAudioId={activeAudioId}
            onVideoUpload={() => fileInputRef.current?.click()}
            onAudioUpload={() => audioInputRef.current?.click()}
            onSelectAudio={onSelectAudio}
            onRemoveClip={onRemoveClip}
            onGoToClips={() => setActiveTab("Clips")}
          />
        )}

        {activeTab === "Templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SectionLabel>PRESET TEMPLATES</SectionLabel>
            {TEMPLATE_PRESETS.map((t) => (
              <TemplateCard key={t.id} template={t} onSelect={onTemplateSelect ? () => onTemplateSelect(t) : undefined} />
            ))}
            <div style={{ marginTop: 12 }}>
              <SectionLabel>TRANSITIONS</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {TRANSITION_LIST.map((tr) => (
                  <div key={tr.type} draggable style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)", cursor: "grab",
                  }}>
                    <TransitionIcon />
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-primary)" }}>{tr.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{tr.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Assets" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <SectionLabel>BRAND ASSETS</SectionLabel>
              {Object.values(brandOverrides).some(Boolean) && (
                <button
                  onClick={() => onBrandOverridesChange?.({})}
                  style={{ fontSize: 9, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  ↺ Reset all
                </button>
              )}
            </div>
            {onBrandOverridesChange ? (
              <BrandOverrideSlots overrides={brandOverrides} onChange={onBrandOverridesChange} />
            ) : (
              <div style={{ marginTop: 8 }}>
                <AssetSlot icon="🎨" label="Color Palette" detail="Asaya Gold" />
                <AssetSlot icon="🔤" label="Brand Font"    detail="Cormorant Garamond" />
                <AssetSlot icon="◎"  label="Logo"          detail="bottom-center" />
                <AssetSlot icon="🎬" label="Color Grade"   detail="Asaya Luxury" />
              </div>
            )}
          </div>
        )}

        {activeTab === "Clips" && (
          <ClipsTab
            clips={clips}
            timeline={timeline}
            activeSceneId={activeSceneId}
            onUpload={() => fileInputRef.current?.click()}
            onAssign={onAssignClip}
            onRemove={onRemoveClip}
          />
        )}

        {activeTab === "Audio" && (
          <div>
            <SectionLabel>AUDIO TRACKS ({audioTracks.length})</SectionLabel>
            {audioTracks.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                Upload an MP3 or WAV to use as background music during preview.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {audioTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => onSelectAudio(track.id)}
                    style={{
                      padding: "7px 10px", borderRadius: 6,
                      border: activeAudioId === track.id
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border-subtle)",
                      background: activeAudioId === track.id ? "var(--accent-bg)" : "var(--bg-elevated)",
                      display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontSize: 14 }}>♪</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 500,
                        color: activeAudioId === track.id ? "var(--accent)" : "var(--text-secondary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {track.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {track.duration ? `${track.duration}s` : "—"} · BGM
                        {activeAudioId === track.id ? " · active" : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <SectionLabel>UPLOAD AUDIO</SectionLabel>
              <UploadZone onClick={() => audioInputRef.current?.click()} label="Drop audio files" />
            </div>
          </div>
        )}

        {activeTab === "History" && (
          <div>
            <SectionLabel>PAST GENERATIONS</SectionLabel>
            {historyLoading && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, textAlign: "center" }}>
                Loading history…
              </div>
            )}
            {historyError && (
              <div style={{ fontSize: 11, color: "var(--error)", marginTop: 8 }}>{historyError}</div>
            )}
            {!historyLoading && !historyError && historyItems.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                No past generations yet. Generate your first lineup to see it here.
              </div>
            )}
            {!historyLoading && historyItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {historyItems.map((item) => {
                  const clusterColor = item.cluster === "travel-cinematic" ? "#6ee7b7" : "#f472b6";
                  const scoreColor = item.evalScore != null
                    ? item.evalScore >= 80 ? "var(--success)" : item.evalScore >= 60 ? "var(--warning)" : "var(--error)"
                    : "var(--text-muted)";
                  const date = new Date(item.createdAt);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
                  return (
                    <div key={item.id} style={{
                      borderRadius: 6, border: "1px solid var(--border-subtle)",
                      background: "var(--bg-elevated)", overflow: "hidden",
                    }}>
                      <div style={{ padding: "6px 8px" }}>
                        <div style={{ fontSize: 10.5, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4 }}>
                          {item.promptPreview}
                          {item.promptPreview.length >= 120 ? "…" : ""}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 8.5, color: clusterColor, fontWeight: 600, letterSpacing: "0.05em" }}>
                            {item.cluster === "travel-cinematic" ? "CINEMATIC" : "UGC/ADS"}
                          </span>
                          {item.evalScore != null && (
                            <span style={{ fontSize: 8.5, color: scoreColor, fontWeight: 600 }}>
                              QA {item.evalScore}
                            </span>
                          )}
                          {item.durationSec && (
                            <span style={{ fontSize: 8.5, color: "var(--text-muted)" }}>{item.durationSec}s</span>
                          )}
                          {item.aspectRatio && (
                            <span style={{ fontSize: 8.5, color: "var(--text-muted)" }}>{item.aspectRatio}</span>
                          )}
                          <span style={{ fontSize: 8, color: "var(--text-muted)", marginLeft: "auto" }}>{dateStr}</span>
                        </div>
                      </div>
                      {onLoadGeneration && (
                        <button
                          onClick={() => {
                            try {
                              const tl = JSON.parse(item.timelineJson) as Timeline;
                              onLoadGeneration(tl);
                            } catch { /* skip corrupt entry */ }
                          }}
                          style={{
                            display: "block", width: "100%", padding: "5px 8px",
                            background: "var(--bg-panel)", border: "none",
                            borderTop: "1px solid var(--border-subtle)",
                            color: "var(--accent)", fontSize: 10, fontWeight: 600,
                            cursor: "pointer", letterSpacing: "0.04em",
                            transition: "background 0.1s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-bg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-panel)")}
                        >
                          ↩ Load this lineup
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Upload tab ── */
function UploadTab({
  clips, audioTracks, activeAudioId,
  onVideoUpload, onAudioUpload, onSelectAudio, onRemoveClip, onGoToClips,
}: {
  clips: UploadedClip[];
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  onVideoUpload: () => void;
  onAudioUpload: () => void;
  onSelectAudio: (id: string) => void;
  onRemoveClip: (id: string) => void;
  onGoToClips: () => void;
}) {
  const [videoDragging, setVideoDragging] = useState(false);
  const [audioDragging, setAudioDragging] = useState(false);
  const formatSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Video / Image section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionLabel>VIDEO & IMAGES</SectionLabel>
          {clips.length > 0 && (
            <button
              onClick={onGoToClips}
              style={{ fontSize: 9, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Manage {clips.length} clip{clips.length > 1 ? "s" : ""} →
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setVideoDragging(true); }}
          onDragLeave={() => setVideoDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setVideoDragging(false);
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              // Filter only video/image files inline
              const dt = new DataTransfer();
              Array.from(files).forEach((f) => {
                if (f.type.startsWith("video/") || f.type.startsWith("image/")) dt.items.add(f);
              });
              if (dt.files.length > 0) {
                const ev = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                void ev; // handled below
                // trigger parent directly
                const fakeFileList: FileList = dt.files;
                const event = new Event("change");
                Object.defineProperty(event, "target", { value: { files: fakeFileList } });
                // call onVideoUpload indirectly via DataTransfer trick
              }
            }
          }}
          onClick={onVideoUpload}
          style={{
            padding: "28px 16px",
            border: `2px dashed ${videoDragging ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 10,
            background: videoDragging ? "rgba(201,169,110,0.05)" : "var(--bg-elevated)",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { if (!videoDragging) { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.background = "rgba(201,169,110,0.03)"; } }}
          onMouseLeave={(e) => { if (!videoDragging) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; } }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={videoDragging ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1.5" style={{ transition: "stroke 0.15s ease" }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: videoDragging ? "var(--accent)" : "var(--text-secondary)" }}>
              {videoDragging ? "Drop to upload" : "Upload Videos"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
              Drag & drop or click to browse
            </div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>
              MP4 · MOV · WebM · JPG · PNG
            </div>
          </div>
          {clips.length > 0 && (
            <div style={{ marginTop: 2, fontSize: 9.5, color: "var(--accent)", fontWeight: 600 }}>
              {clips.length} file{clips.length > 1 ? "s" : ""} uploaded
            </div>
          )}
        </div>

        {/* Uploaded clips mini-list */}
        {clips.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {clips.slice(0, 4).map((clip) => (
              <div key={clip.id} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "5px 8px", borderRadius: 6,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}>
                {/* Thumbnail */}
                <div style={{ width: 36, height: 28, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "var(--bg-panel)" }}>
                  {clip.type === "video" ? (
                    <video src={clip.objectUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clip.objectUrl} alt={clip.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {clip.name}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    {formatSize(clip.size)}{clip.duration ? ` · ${clip.duration}s` : ""}
                    {clip.assignedToSceneId && <span style={{ color: "var(--accent)", marginLeft: 4 }}>· assigned</span>}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveClip(clip.id)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                  title="Remove"
                >×</button>
              </div>
            ))}
            {clips.length > 4 && (
              <button onClick={onGoToClips} style={{
                fontSize: 10, color: "var(--text-muted)", background: "none", border: "none",
                cursor: "pointer", padding: "2px 8px", textAlign: "left",
              }}>
                +{clips.length - 4} more — view all in Clips tab →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)" }} />

      {/* ── Audio section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <SectionLabel>BACKGROUND AUDIO</SectionLabel>
          {audioTracks.length > 0 && (
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{audioTracks.length} track{audioTracks.length > 1 ? "s" : ""}</span>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setAudioDragging(true); }}
          onDragLeave={() => setAudioDragging(false)}
          onDrop={(e) => { e.preventDefault(); setAudioDragging(false); }}
          onClick={onAudioUpload}
          style={{
            padding: "18px 16px",
            border: `2px dashed ${audioDragging ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 10,
            background: audioDragging ? "rgba(201,169,110,0.05)" : "var(--bg-elevated)",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-dim)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Upload Audio</div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>MP3 · WAV · M4A · AAC</div>
          </div>
        </div>

        {audioTracks.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {audioTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => onSelectAudio(track.id)}
                style={{
                  padding: "6px 10px", borderRadius: 6, textAlign: "left", cursor: "pointer",
                  border: activeAudioId === track.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                  background: activeAudioId === track.id ? "var(--accent-bg)" : "var(--bg-elevated)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ color: "var(--accent)", fontSize: 14, flexShrink: 0 }}>♪</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 500,
                    color: activeAudioId === track.id ? "var(--accent)" : "var(--text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{track.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    {track.duration ? `${track.duration}s` : "—"}{activeAudioId === track.id ? " · active" : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <div style={{
        padding: "8px 10px", borderRadius: 6,
        background: "rgba(201,169,110,0.05)",
        border: "1px solid var(--border-subtle)",
      }}>
        <div style={{ fontSize: 9.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>Tip:</span> Upload clips first, then generate a lineup — the AI analyzes your footage and builds a timeline around it.
        </div>
      </div>
    </div>
  );
}

/* ── Clips tab ── */
function ClipsTab({ clips, timeline, activeSceneId, onUpload, onAssign, onRemove }: {
  clips: UploadedClip[];
  timeline: Timeline | null;
  activeSceneId: string | null;
  onUpload: () => void;
  onAssign: (clipId: string, sceneId: string) => void;
  onRemove: (clipId: string) => void;
}) {
  const [assigningClipId, setAssigningClipId] = useState<string | null>(null);
  const scenes = timeline?.scenes ?? [];
  const canAutoFill = clips.length > 0 && scenes.length > 0;

  function handleAutoFill() {
    clips.forEach((clip, index) => {
      const scene = scenes[index];
      if (scene) onAssign(clip.id, scene.id);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionLabel>VIDEO CLIPS ({clips.length})</SectionLabel>
        <button onClick={onUpload} style={{
          padding: "3px 8px", borderRadius: 4,
          border: "1px solid var(--accent-dim)",
          background: "var(--accent-bg)", color: "var(--accent)",
          fontSize: 10, fontWeight: 600, cursor: "pointer",
        }}>+ Upload</button>
      </div>

      {canAutoFill && (
        <button onClick={handleAutoFill} style={{
          padding: "6px 10px", borderRadius: 5,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          color: "var(--text-secondary)",
          fontSize: 10, fontWeight: 600, cursor: "pointer",
          letterSpacing: "0.04em",
        }}>
          Auto-fill scenes ({Math.min(clips.length, scenes.length)} clips)
        </button>
      )}

      {clips.length === 0 ? (
        <UploadZone onClick={onUpload} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              timeline={timeline}
              activeSceneId={activeSceneId}
              isAssigning={assigningClipId === clip.id}
              onAssignOpen={() => setAssigningClipId(clip.id)}
              onAssignClose={() => setAssigningClipId(null)}
              onAssign={(sceneId) => { onAssign(clip.id, sceneId); setAssigningClipId(null); }}
              onRemove={() => onRemove(clip.id)}
            />
          ))}
          <UploadZone onClick={onUpload} compact />
        </div>
      )}
    </div>
  );
}

/* ── Single clip card ── */
function ClipCard({ clip, timeline, activeSceneId, isAssigning, onAssignOpen, onAssignClose, onAssign, onRemove }: {
  clip: UploadedClip;
  timeline: Timeline | null;
  activeSceneId: string | null;
  isAssigning: boolean;
  onAssignOpen: () => void;
  onAssignClose: () => void;
  onAssign: (sceneId: string) => void;
  onRemove: () => void;
}) {
  const [justAssigned, setJustAssigned] = useState(false);
  const assignedScene = timeline?.scenes?.find((s) => s.id === clip.assignedToSceneId);
  const formatSize = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${(b / 1e3).toFixed(0)}KB`;

  function handleAssign(sceneId: string) {
    onAssign(sceneId);
    setJustAssigned(true);
    setTimeout(() => setJustAssigned(false), 2000);
  }

  return (
    <div style={{
      borderRadius: 7, border: "1px solid var(--border-subtle)",
      background: "var(--bg-elevated)", overflow: "hidden",
    }}>
      {/* Thumbnail / preview */}
      <div style={{ height: 72, background: "var(--bg-panel)", position: "relative", overflow: "hidden" }}>
        {clip.type === "video" ? (
          <video
            src={clip.objectUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
            preload="metadata"
            onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0; (e.currentTarget as HTMLVideoElement).play(); }}
            onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0.5; }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.objectUrl}
            alt={clip.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {/* Type badge */}
        <div style={{
          position: "absolute", top: 4, left: 4,
          padding: "1px 5px", borderRadius: 3,
          background: "rgba(0,0,0,0.7)",
          color: clip.type === "video" ? "var(--accent)" : "#a5b4fc",
          fontSize: 8, fontWeight: 700, letterSpacing: "0.06em",
        }}>
          {clip.type === "video" ? "VID" : "IMG"}
        </div>
        {/* Duration badge */}
        {clip.duration && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            padding: "1px 5px", borderRadius: 3,
            background: "rgba(0,0,0,0.7)", color: "rgba(255,255,255,0.7)", fontSize: 8,
          }}>
            {clip.duration}s
          </div>
        )}
        {/* Remove */}
        <button onClick={onRemove} title="Remove clip" style={{
          position: "absolute", bottom: 4, right: 4,
          width: 18, height: 18, borderRadius: "50%",
          background: "rgba(0,0,0,0.7)", border: "none",
          color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>

      {/* Info */}
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {clip.name}
        </div>
        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>{formatSize(clip.size)}</div>

        {/* Assign button / scene picker */}
        {isAssigning ? (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.05em" }}>ASSIGN TO SCENE</div>
            {timeline ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(timeline.scenes ?? []).map((scene) => (
                  <button key={scene.id} onClick={() => handleAssign(scene.id)} style={{
                    padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border-subtle)",
                    background: scene.id === activeSceneId ? "var(--accent-bg)" : "var(--bg-panel)",
                    color: scene.id === activeSceneId ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 10, cursor: "pointer", textAlign: "left",
                  }}>
                    {scene.order + 1}. {scene.label.slice(0, 18)}
                  </button>
                ))}
                <button onClick={onAssignClose} style={{ padding: "3px", background: "none", border: "none", color: "var(--text-muted)", fontSize: 10, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Generate a lineup first</div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {justAssigned ? (
              <span style={{ fontSize: 9, color: "var(--success)", display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Added to canvas
              </span>
            ) : assignedScene ? (
              <span style={{ fontSize: 9, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
                → {assignedScene.label.slice(0, 14)}
              </span>
            ) : (
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Unassigned</span>
            )}
            <button onClick={onAssignOpen} style={{
              padding: "2px 7px", borderRadius: 3,
              border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: 9, cursor: "pointer",
            }}>
              {assignedScene ? "Re-assign" : "Assign"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Upload drop zone ── */
function UploadZone({ onClick, label = "Drop clips or click to upload", compact = false }: {
  onClick: () => void; label?: string; compact?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%",
      marginTop: compact ? 0 : 8,
      padding: compact ? "10px" : "22px 12px",
      border: "1px dashed var(--border)",
      borderRadius: 8, background: "transparent",
      color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 3 : 6,
      transition: "all 0.15s ease",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      {!compact && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )}
      <span>{label}</span>
      {!compact && <span style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>MP4, MOV, WebM, JPG, PNG</span>}
    </button>
  );
}

/* ── Helpers ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>{children}</div>;
}

function TemplateCard({ template, onSelect }: { template: typeof TEMPLATE_PRESETS[0]; onSelect?: () => void }) {
  const moodColor = MOOD_COLORS[template.mood] ?? "#888";
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "9px 10px", borderRadius: 7,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-elevated)", cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{template.name}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{template.ratio}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{template.duration}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>·</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{template.scenes} scenes</span>
        <span style={{
          marginLeft: "auto", fontSize: 9,
          padding: "2px 5px", borderRadius: 3,
          background: `${moodColor}18`, color: moodColor,
          fontWeight: 600, letterSpacing: "0.04em",
        }}>{template.mood}</span>
      </div>
    </div>
  );
}

function AssetSlot({ icon, label, detail, locked }: { icon: string; label: string; detail: string; locked?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 8px", marginBottom: 4,
      borderRadius: 6, background: "var(--bg-elevated)",
      border: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontSize: 14, opacity: 0.8 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{detail}</div>
      </div>
      {locked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-dim)" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
    </div>
  );
}

/* ── Editable brand override slots — always visible, no accordion ── */
function BrandOverrideSlots({ overrides, onChange }: { overrides: BrandOverrides; onChange: (o: BrandOverrides) => void }) {
  const primaryColor = overrides.primaryColor ?? "#C9A96E";
  const fontFamily   = overrides.fontFamily   ?? "Cormorant Garamond";
  const logoPosition = overrides.logoPosition ?? "bottom-center";
  const colorGrade   = overrides.colorGrade   ?? "Asaya Luxury";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>

      {/* Color Palette */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>🎨 COLOR PALETTE</div>
          {overrides.primaryColor && (
            <button onClick={() => onChange({ ...overrides, primaryColor: undefined })}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 10 }}>↺ reset</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="color" value={primaryColor}
            onChange={(e) => onChange({ ...overrides, primaryColor: e.target.value })}
            style={{ width: 32, height: 28, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 4, padding: 2, background: "none", flexShrink: 0 }}
          />
          <input
            type="text" value={primaryColor}
            onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange({ ...overrides, primaryColor: v }); }}
            style={{
              flex: 1, background: "var(--bg-elevated)", border: `1px solid ${overrides.primaryColor ? "var(--accent-dim)" : "var(--border)"}`,
              borderRadius: 5, padding: "4px 8px", color: "var(--text-primary)", fontSize: 11, fontFamily: "monospace",
            }}
          />
        </div>
        {/* Quick swatches */}
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {["#C9A96E","#f472b6","#6ee7b7","#a78bfa","#fcd34d","#60a5fa","#f87171","#ffffff"].map((c) => (
            <button key={c} onClick={() => onChange({ ...overrides, primaryColor: c })} title={c}
              style={{
                width: 22, height: 22, borderRadius: 4, border: primaryColor === c ? "2px solid var(--accent)" : "1px solid var(--border-subtle)",
                background: c, cursor: "pointer", flexShrink: 0,
                boxShadow: primaryColor === c ? "0 0 0 1px var(--bg-panel)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Color Grade */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>🎬 COLOR GRADE</div>
          {overrides.colorGrade && (
            <button onClick={() => onChange({ ...overrides, colorGrade: undefined })}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 10 }}>↺ reset</button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {COLOR_GRADE_OPTIONS.map((g) => (
            <button key={g} onClick={() => onChange({ ...overrides, colorGrade: g })} style={{
              padding: "6px 10px", borderRadius: 5,
              border: `1px solid ${colorGrade === g ? "var(--accent)" : "var(--border-subtle)"}`,
              background: colorGrade === g ? "var(--accent-bg)" : "var(--bg-elevated)",
              color: colorGrade === g ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 11, cursor: "pointer", textAlign: "left",
              fontWeight: colorGrade === g ? 600 : 400,
              transition: "all 0.1s ease",
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* Brand Font */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>🔤 BRAND FONT</div>
          {overrides.fontFamily && (
            <button onClick={() => onChange({ ...overrides, fontFamily: undefined })}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 10 }}>↺ reset</button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FONT_OPTIONS.map((f) => (
            <button key={f} onClick={() => onChange({ ...overrides, fontFamily: f })} style={{
              padding: "6px 10px", borderRadius: 5,
              border: `1px solid ${fontFamily === f ? "var(--accent)" : "var(--border-subtle)"}`,
              background: fontFamily === f ? "var(--accent-bg)" : "var(--bg-elevated)",
              color: fontFamily === f ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 11.5, cursor: "pointer", textAlign: "left",
              fontFamily: f,
              fontWeight: fontFamily === f ? 600 : 400,
              transition: "all 0.1s ease",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Logo Position */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>◎ LOGO POSITION</div>
          {overrides.logoPosition && (
            <button onClick={() => onChange({ ...overrides, logoPosition: undefined })}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 10 }}>↺ reset</button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {LOGO_POSITIONS.map((p) => (
            <button key={p.value} onClick={() => onChange({ ...overrides, logoPosition: p.value })} title={p.value} style={{
              padding: "9px 4px", borderRadius: 5,
              border: `1px solid ${logoPosition === p.value ? "var(--accent)" : "var(--border-subtle)"}`,
              background: logoPosition === p.value ? "var(--accent-bg)" : "var(--bg-elevated)",
              color: logoPosition === p.value ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 16, cursor: "pointer",
              transition: "all 0.1s ease",
            }}>{p.label}</button>
          ))}
        </div>
      </div>

    </div>
  );
}


function TransitionIcon() {
  return (
    <div style={{ width: 26, height: 18, borderRadius: 3, background: "var(--bg-panel)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
        <rect x="0" y="1" width="5" height="8" rx="1" fill="var(--accent-dim)" opacity="0.7" />
        <rect x="9" y="1" width="5" height="8" rx="1" fill="var(--accent)" opacity="0.5" />
        <line x1="7" y1="0" x2="7" y2="10" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 1" />
      </svg>
    </div>
  );
}
