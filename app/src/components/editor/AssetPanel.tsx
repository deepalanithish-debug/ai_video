"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { UploadedClip, UploadedAudio } from "@/types/clips";
import type { Timeline, Scene } from "@/types/timeline";
import type { StudioCaption } from "@/types/captions";
import {
  TEXT_TEMPLATES, ENTRANCE_ANIMS, EXIT_ANIMS, LOOP_ANIMS, FONT_FAMILIES,
  DEFAULT_CAPTION_STYLE,
} from "@/types/captions";
import TransitionLibrary from "./TransitionLibrary";
import {
  TRANSITION_CATALOG, runTransitionAnimation, cancelTransitionAnimations, DEFAULT_ANIM_CONFIG,
} from "@/lib/transitionAnimations";
import { v4 as uuidv4 } from "uuid";
import type { OutroTemplate } from "@/types/outro";
import { OUTRO_PRESETS } from "@/types/outro";

export type TemplatePreset = {
  id: string; name: string; duration: string; scenes: number; mood: string; ratio: string;
};

export interface BrandOverrides {
  primaryColor?: string;
  fontFamily?: string;
  logoPosition?: string;
  colorGrade?: string;
}

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
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
  workspaceSlug?: string;
  // Brand Outro
  outroConfig?: OutroTemplate | null;
  outroSceneId?: string | null;
  onOutroApply?: (template: OutroTemplate) => void;
  onOutroRemove?: () => void;
  onOutroUpdate?: (patch: Partial<OutroTemplate>) => void;
  // Text Studio
  captions?: StudioCaption[];
  selectedCaptionId?: string | null;
  currentTime?: number;
  totalDuration?: number;
  onCaptionAdd?: (c: StudioCaption) => void;
  onCaptionUpdate?: (id: string, patch: Partial<StudioCaption>) => void;
  onCaptionDelete?: (id: string) => void;
  onCaptionSelect?: (id: string | null) => void;
  // Canvas guides
  showGrid?: boolean;
  showSafeZones?: boolean;
  showThirds?: boolean;
  onGuideToggle?: (g: "grid" | "safeZones" | "thirds") => void;
}

type NavTab = "media" | "transitions" | "text" | "audio" | "elements" | "brand" | "ai";

const NAV_ITEMS: { id: NavTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "media", label: "Media",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </svg>
    ),
  },
  {
    id: "transitions", label: "Transitions",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 3l6 6-6 6" /><path d="M13 3l6 6-6 6" />
      </svg>
    ),
  },
  {
    id: "text", label: "Text",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7V5h16v2" /><path d="M9 5v14" /><path d="M15 5v14" /><path d="M9 19h6" />
      </svg>
    ),
  },
  {
    id: "audio", label: "Audio",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: "elements", label: "Elements",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "brand", label: "Brand",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
  },
  {
    id: "ai", label: "AI Tools",
    icon: (
      <svg width="25.5" height="25.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
      </svg>
    ),
  },
];

const TEMPLATE_PRESETS: TemplatePreset[] = [
  { id: "luxury-30",    name: "Luxury 30s",    duration: "30s", scenes: 5, mood: "luxury",   ratio: "9:16" },
  { id: "product-15",  name: "Product 15s",   duration: "15s", scenes: 4, mood: "energetic", ratio: "9:16" },
  { id: "brand-story", name: "Brand Story",   duration: "60s", scenes: 8, mood: "calm",      ratio: "16:9" },
  { id: "reel-quick",  name: "Quick Reel",    duration: "10s", scenes: 6, mood: "playful",   ratio: "9:16" },
  { id: "cinematic-45",name: "Cinematic 45s", duration: "45s", scenes: 7, mood: "dramatic",  ratio: "16:9" },
];

const FONT_OPTIONS = [
  "Cormorant Garamond", "Playfair Display", "Cinzel", "Raleway",
  "Montserrat", "Lato", "Georgia", "Helvetica Neue",
];
const COLOR_GRADE_OPTIONS = [
  "Asaya Luxury", "Film Noir", "Warm Summer", "Cool Winter",
  "Matte Fade", "Vibrant Pop", "Golden Hour", "Moody Dark",
];
const LOGO_POSITIONS = [
  { value: "top-left", label: "↖" }, { value: "top-center", label: "↑" }, { value: "top-right", label: "↗" },
  { value: "bottom-left", label: "↙" }, { value: "bottom-center", label: "↓" }, { value: "bottom-right", label: "↘" },
];

export default function AssetPanel({
  clips, audioTracks, activeAudioId, timeline, activeSceneId,
  onClipsUploaded, onAudioUploaded, onSelectAudio,
  onAssignClip, onRemoveClip, onTemplateSelect,
  brandOverrides = {}, onBrandOverridesChange,
  onLoadGeneration, onSceneUpdate, workspaceSlug = "asaya",
  outroConfig = null, outroSceneId = null,
  onOutroApply, onOutroRemove, onOutroUpdate,
  captions = [], selectedCaptionId = null, currentTime = 0, totalDuration = 30,
  onCaptionAdd, onCaptionUpdate, onCaptionDelete, onCaptionSelect,
  showGrid = false, showSafeZones = false, showThirds = false, onGuideToggle,
}: AssetPanelProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("transitions");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "elements") return;
    setHistoryLoading(true);
    fetch(`/api/generations?workspaceSlug=${encodeURIComponent(workspaceSlug)}&limit=20`)
      .then(r => r.json())
      .then((d: { generations: HistoryEntry[] }) => setHistoryItems(d.generations ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [activeTab, workspaceSlug]);

  return (
    <div style={{ display: "flex", height: "100%", flexShrink: 0 }}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="video/*,image/*,.mov,.mp4,.webm" multiple style={{ display: "none" }}
        onChange={e => { if (e.target.files) onClipsUploaded(e.target.files); (e.target as HTMLInputElement).value = ""; }} />
      <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac" multiple style={{ display: "none" }}
        onChange={e => { if (e.target.files) onAudioUploaded(e.target.files); (e.target as HTMLInputElement).value = ""; }} />

      {/* ── Icon sidebar ── */}
      <div style={{
        width: 66, background: "#0f0f11",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 12, gap: 3, flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              style={{
                width: 60, height: 69, borderRadius: 10.5,
                border: "none",
                background: isActive ? "rgba(201,169,110,0.1)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4.5, transition: "all 0.12s ease", position: "relative",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
            >
              {isActive && (
                <div style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3.75, height: 24, background: "var(--accent)", borderRadius: "0 2px 2px 0",
                }} />
              )}
              {item.icon}
              <span style={{ fontSize: 10.5, letterSpacing: "0.01em", fontWeight: 500, lineHeight: 1 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content panel ── */}
      <div style={{
        width: 339, background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden", flexShrink: 0,
      }}>
        {/* Panel title row */}
        <div style={{
          padding: "13.5px 18px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 17.25, fontWeight: 600, color: "var(--text-primary)" }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </span>
          {activeTab === "transitions" && (
            <span style={{ fontSize: 14.25, color: "var(--text-muted)", cursor: "pointer" }}>
              {(timeline?.scenes?.length ?? 0) > 0 ? `${timeline!.scenes.length} scenes` : ""}
            </span>
          )}
          {activeTab === "media" && clips.length > 0 && (
            <span style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 600 }}>{clips.length} uploaded</span>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "15px" }}>
          {activeTab === "media" && (
            <MediaTab
              clips={clips} audioTracks={audioTracks} activeAudioId={activeAudioId}
              onVideoUpload={() => fileInputRef.current?.click()}
              onAudioUpload={() => audioInputRef.current?.click()}
              onSelectAudio={onSelectAudio} onRemoveClip={onRemoveClip}
            />
          )}
          {activeTab === "transitions" && (
            <TransitionsTab
              timeline={timeline} activeSceneId={activeSceneId} onSceneUpdate={onSceneUpdate}
            />
          )}
          {activeTab === "text" && (
            <TextStudioTab
              captions={captions}
              selectedCaptionId={selectedCaptionId}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onCaptionAdd={onCaptionAdd}
              onCaptionUpdate={onCaptionUpdate}
              onCaptionDelete={onCaptionDelete}
              onCaptionSelect={onCaptionSelect}
              showGrid={showGrid}
              showSafeZones={showSafeZones}
              showThirds={showThirds}
              onGuideToggle={onGuideToggle}
            />
          )}
          {activeTab === "audio" && (
            <AudioTabContent
              audioTracks={audioTracks} activeAudioId={activeAudioId}
              onSelectAudio={onSelectAudio} onUpload={() => audioInputRef.current?.click()}
            />
          )}
          {activeTab === "elements" && (
            <ElementsTab historyItems={historyItems} loading={historyLoading} onLoadGeneration={onLoadGeneration} />
          )}
          {activeTab === "brand" && (
            <BrandTab
              overrides={brandOverrides}
              onChange={onBrandOverridesChange}
              onTemplateSelect={onTemplateSelect}
              outroConfig={outroConfig}
              outroSceneId={outroSceneId}
              onOutroApply={onOutroApply}
              onOutroRemove={onOutroRemove}
              onOutroUpdate={onOutroUpdate}
            />
          )}
          {activeTab === "ai" && (
            <AIGenerationTab onAssetGenerated={(url, name, type) => {
              const a = document.createElement("a");
              a.href = url; a.download = name; a.click();
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Media Tab ─────────────────────────────────────────────────────────────── */
function MediaTab({
  clips, audioTracks, activeAudioId,
  onVideoUpload, onAudioUpload, onSelectAudio, onRemoveClip,
}: {
  clips: UploadedClip[];
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  onVideoUpload: () => void;
  onAudioUpload: () => void;
  onSelectAudio: (id: string) => void;
  onRemoveClip: (id: string) => void;
}) {
  const fmt = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${(b / 1e3).toFixed(0)}KB`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 21 }}>
      <div>
        <Label>VIDEO & IMAGES</Label>
        <DropZone onClick={onVideoUpload} label="Upload Videos / Images" />
        {clips.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4.5 }}>
            {clips.slice(0, 6).map(c => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "6px 10.5px",
                borderRadius: 7.5, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
              }}>
                <div style={{ width: 45, height: 33, borderRadius: 4.5, overflow: "hidden", flexShrink: 0, background: "var(--bg-panel)" }}>
                  {c.type === "video"
                    ? <video src={c.objectUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={c.objectUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 12.75, color: "var(--text-muted)" }}>{fmt(c.size)}{c.duration ? ` · ${c.duration}s` : ""}</div>
                </div>
                <button onClick={() => onRemoveClip(c.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 19.5, lineHeight: 1, padding: "0 3px" }}>×</button>
              </div>
            ))}
            {clips.length > 6 && <div style={{ fontSize: 13.5, color: "var(--text-muted)", paddingLeft: 9 }}>+{clips.length - 6} more</div>}
          </div>
        )}
      </div>
      <Sep />
      <div>
        <Label>AUDIO</Label>
        <DropZone onClick={onAudioUpload} label="Upload Audio" compact />
        {audioTracks.map(t => (
          <button key={t.id} onClick={() => onSelectAudio(t.id)} style={{
            marginTop: 6, width: "100%", padding: "7.5px 12px", borderRadius: 7.5, textAlign: "left", cursor: "pointer",
            border: activeAudioId === t.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
            background: activeAudioId === t.id ? "var(--accent-bg)" : "var(--bg-elevated)",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <span style={{ color: "var(--accent)", fontSize: 19.5 }}>♪</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: activeAudioId === t.id ? "var(--accent)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
              <div style={{ fontSize: 12.75, color: "var(--text-muted)" }}>{t.duration ? `${t.duration}s` : "—"}{activeAudioId === t.id ? " · active" : ""}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Transitions Tab ───────────────────────────────────────────────────────── */
const FILTER_CATS: { label: string; types: string[] | null }[] = [
  { label: "All",   types: null },
  { label: "Basic", types: ["cut", "fade", "dissolve"] },
  { label: "Zoom",  types: ["zoom-in", "zoom-out"] },
  { label: "Blur",  types: ["cinematic-fade"] },
  { label: "Slide", types: ["slide-left", "slide-right"] },
  { label: "Wipe",  types: ["wipe-left", "wipe-right"] },
];

function TransitionsTab({
  timeline, activeSceneId, onSceneUpdate,
}: {
  timeline: Timeline | null;
  activeSceneId: string | null;
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [applyAllDur, setApplyAllDur] = useState(0.5);

  const scenes = timeline?.scenes ?? [];
  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;
  const activeType = activeScene?.transition?.type ?? "cut";
  const hasTimeline = scenes.length > 1;
  const activeSceneIdx = scenes.findIndex(s => s.id === activeSceneId);
  const prevScene = activeSceneIdx > 0 ? scenes[activeSceneIdx - 1] : null;

  const activeCat = FILTER_CATS.find(c => c.label === filterCat) ?? FILTER_CATS[0];
  const filtered = TRANSITION_CATALOG.filter(d => {
    if (search && !d.label.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCat.types) return activeCat.types.includes(d.type);
    return true;
  });
  const popular = filtered.slice(0, 9);

  const handleApply = useCallback((type: string) => {
    if (!activeSceneId || !onSceneUpdate) return;
    const def = TRANSITION_CATALOG.find(d => d.type === type);
    const dur = type === "cut" || type === "hard-cut" ? 0 : (def?.defaultDuration ?? 0.5);
    onSceneUpdate(activeSceneId, {
      transition: { type: type as import("@/types/timeline").TransitionType, duration: dur },
    });
  }, [activeSceneId, onSceneUpdate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          width="16.5" height="16.5" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search transitions..."
          style={{
            width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: 9, padding: "9px 12px 9px 39px", color: "var(--text-primary)",
            fontSize: 16.5, outline: "none",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 19.5, padding: 0,
          }}>×</button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, scrollbarWidth: "none" }}>
        {FILTER_CATS.map(cat => {
          const isActive = filterCat === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setFilterCat(cat.label)}
              style={{
                padding: "4.5px 13.5px", borderRadius: 30, fontSize: 15, fontWeight: isActive ? 600 : 400,
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                background: isActive ? "var(--accent)" : "var(--bg-elevated)",
                color: isActive ? "#0e0e0f" : "var(--text-secondary)",
                whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0, transition: "all 0.1s ease",
              }}
            >{cat.label}</button>
          );
        })}
      </div>

      {!hasTimeline && (
        <p style={{ fontSize: 15.75, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
          Generate a lineup first, then select a scene to set its transition.
        </p>
      )}

      {/* Popular grid */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10.5 }}>
          <Label>POPULAR</Label>
          <button onClick={() => setLibraryOpen(true)} style={{
            fontSize: 14.25, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600,
          }}>View All</button>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9,
          opacity: !activeSceneId ? 0.5 : 1,
          pointerEvents: !activeSceneId || !onSceneUpdate ? "none" : "auto",
        }}>
          {popular.map(def => (
            <TransitionThumb
              key={def.type} type={def.type} label={def.label}
              isActive={activeType === def.type && !!activeSceneId}
              onClick={() => handleApply(def.type)}
            />
          ))}
        </div>
      </div>

      {/* Applied section */}
      {activeScene && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10.5 }}>
            <Label>APPLIED TO THIS CLIP</Label>
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10.5px 15px", borderRadius: 9,
            background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
          }}>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 600, color: "var(--text-primary)" }}>
                {TRANSITION_CATALOG.find(d => d.type === activeType)?.label ?? activeType}
              </div>
              {activeScene.transition?.duration ? (
                <div style={{ fontSize: 14.25, color: "var(--text-muted)", marginTop: 1.5 }}>
                  {activeScene.transition.duration}s
                </div>
              ) : null}
            </div>
            <button
              onClick={() => setLibraryOpen(true)}
              style={{
                fontSize: 14.25, color: "var(--accent)", background: "var(--accent-bg)",
                border: "1px solid var(--accent-dim)", borderRadius: 6,
                padding: "4.5px 12px", cursor: "pointer", fontWeight: 600,
              }}
            >Edit</button>
          </div>

          {activeScene.transition?.type && activeScene.transition.type !== "cut" && onSceneUpdate && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14.25, color: "var(--text-muted)" }}>Duration</span>
                <span style={{ fontSize: 14.25, color: "var(--accent)", fontWeight: 600 }}>
                  {(activeScene.transition.duration ?? 0.5).toFixed(1)}s
                </span>
              </div>
              <input type="range" min="0.1" max="2.0" step="0.1"
                value={activeScene.transition.duration ?? 0.5}
                onChange={e => onSceneUpdate(activeSceneId!, {
                  transition: { type: activeScene.transition!.type, duration: parseFloat(e.target.value) },
                })}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
              />
            </div>
          )}
        </div>
      )}

      {/* Apply to all */}
      {hasTimeline && onSceneUpdate && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 15 }}>
          <Label>APPLY TO ALL</Label>
          <div style={{ display: "flex", gap: 4.5, marginTop: 9 }}>
            {["dissolve", "fade", "slide-left", "zoom-in", "cut"].map(t => {
              const def = TRANSITION_CATALOG.find(d => d.type === t);
              return (
                <button key={t}
                  onClick={() => scenes.forEach(s => onSceneUpdate(s.id, {
                    transition: { type: t as import("@/types/timeline").TransitionType, duration: t === "cut" ? 0 : applyAllDur },
                  }))}
                  style={{
                    flex: 1, padding: "7.5px 0", borderRadius: 7.5, cursor: "pointer",
                    border: "1px solid var(--border-subtle)", background: "var(--bg-panel)",
                    color: "var(--text-secondary)", fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 15, marginBottom: 1.5 }}>{def?.icon}</div>
                  {def?.label.split(" ")[0]}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10.5, marginTop: 9 }}>
            <span style={{ fontSize: 13.5, color: "var(--text-muted)", flexShrink: 0 }}>Dur</span>
            <input type="range" min="0.2" max="2.0" step="0.1" value={applyAllDur}
              onChange={e => setApplyAllDur(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
            <span style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 600, minWidth: 36, textAlign: "right" }}>
              {applyAllDur.toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {libraryOpen && (
        <TransitionLibrary
          sceneId={activeSceneId ?? "preview"}
          sceneName={activeScene?.label ?? "Select a scene"}
          currentTransition={activeScene?.transition}
          scene={activeScene}
          prevScene={prevScene}
          timeline={timeline}
          onApply={cfg => {
            if (!activeSceneId || !onSceneUpdate) { setLibraryOpen(false); return; }
            onSceneUpdate(activeSceneId, {
              transition: {
                type: cfg.type as import("@/types/timeline").TransitionType,
                duration: cfg.duration, speed: cfg.speed,
                intensity: cfg.intensity, direction: cfg.direction,
                mode: cfg.mode, easing: cfg.easing,
                blurAmount: cfg.blurAmount, motionStrength: cfg.motionStrength,
              },
            });
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Transition thumbnail card ─────────────────────────────────────────────── */
function TransitionThumb({ type, label, isActive, onClick }: {
  type: string; label: string; isActive: boolean; onClick: () => void;
}) {
  const outRef = useRef<HTMLDivElement>(null);
  const inRef  = useRef<HTMLDivElement>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    const a = outRef.current; const b = inRef.current;
    if (!a || !b) return;
    cancelTransitionAnimations(a, b);
    // Reset only animated properties — preserve background/layout styles set by React
    a.style.transform = ""; a.style.opacity = "1"; a.style.filter = ""; a.style.clipPath = "";
    b.style.transform = ""; b.style.opacity = "0"; b.style.filter = ""; b.style.clipPath = "";
  }, []);

  const play = useCallback(() => {
    const a = outRef.current; const b = inRef.current;
    if (!a || !b) return;
    reset();
    if (type === "cut" || type === "hard-cut") { b.style.opacity = "1"; return; }
    runTransitionAnimation(a, b, { ...DEFAULT_ANIM_CONFIG, type, durationMs: 600 });
  }, [type, reset]);

  const startLoop = useCallback(() => { play(); loopRef.current = setInterval(play, 1300); }, [play]);
  const stopLoop = useCallback(() => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    reset();
  }, [reset]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  return (
    <button onClick={onClick} onMouseEnter={startLoop} onMouseLeave={stopLoop}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", outline: "none", padding: 0 }}
    >
      <div style={{
        width: "100%", aspectRatio: "4/3", borderRadius: 9, overflow: "hidden", position: "relative",
        background: "#080809",
        border: `${isActive ? 2 : 1}px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
        boxShadow: isActive ? "0 0 0 2px rgba(201,169,110,0.15)" : "none",
        transition: "border-color 0.12s, box-shadow 0.12s",
      }}>
        <div ref={outRef} style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(135deg, rgba(201,169,110,0.4) 0%, rgba(201,169,110,0.1) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, opacity: 0.5 }}>A</span>
        </div>
        <div ref={inRef} style={{
          position: "absolute", inset: 0, zIndex: 2, opacity: 0,
          background: "linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0.1) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 700, opacity: 0.5 }}>B</span>
        </div>
        {(type === "cut" || type === "hard-cut") && (
          <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 1.5, height: "55%", background: "var(--accent)", opacity: 0.4 }} />
          </div>
        )}
      </div>
      <span style={{
        fontSize: 12, color: isActive ? "var(--accent)" : "var(--text-secondary)",
        fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap",
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2, textAlign: "center",
      }}>{label}</span>
    </button>
  );
}

/* ─── Text Tab ─────────────────────────────────────────────────────────────── */
/* ─── Text Studio Tab ───────────────────────────────────────────────────────── */
function TextStudioTab({
  captions, selectedCaptionId, currentTime, totalDuration,
  onCaptionAdd, onCaptionUpdate, onCaptionDelete, onCaptionSelect,
  showGrid, showSafeZones, showThirds, onGuideToggle,
}: {
  captions: StudioCaption[];
  selectedCaptionId: string | null;
  currentTime: number;
  totalDuration: number;
  onCaptionAdd?: (c: StudioCaption) => void;
  onCaptionUpdate?: (id: string, patch: Partial<StudioCaption>) => void;
  onCaptionDelete?: (id: string) => void;
  onCaptionSelect?: (id: string | null) => void;
  showGrid: boolean; showSafeZones: boolean; showThirds: boolean;
  onGuideToggle?: (g: "grid" | "safeZones" | "thirds") => void;
}) {
  const [animTab, setAnimTab] = useState<"entrance" | "exit" | "loop">("entrance");
  const [fontSearch, setFontSearch] = useState("");
  const [showFontDrop, setShowFontDrop] = useState(false);
  const selectedCap = captions.find(c => c.id === selectedCaptionId) ?? null;

  const addCaption = useCallback((tpl?: typeof TEXT_TEMPLATES[number]) => {
    const id = uuidv4();
    const endT = Math.min(currentTime + 4, totalDuration);
    const newCap: StudioCaption = {
      id,
      text: tpl ? tpl.preview : "Your text here",
      startTime: currentTime,
      endTime: endT,
      x: 0.1, y: 0.78, width: 0.8, rotation: 0,
      ...(tpl ? tpl.style : DEFAULT_CAPTION_STYLE),
      locked: false, visible: true,
    };
    onCaptionAdd?.(newCap);
    onCaptionSelect?.(id);
  }, [currentTime, totalDuration, onCaptionAdd, onCaptionSelect]);

  const upd = useCallback((patch: Partial<StudioCaption>) => {
    if (selectedCaptionId) onCaptionUpdate?.(selectedCaptionId, patch);
  }, [selectedCaptionId, onCaptionUpdate]);

  const filteredFonts = FONT_FAMILIES.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Add Text button ── */}
      <button
        onClick={() => addCaption()}
        style={{
          width: "100%", padding: "10px 0",
          background: "var(--accent)", border: "none", borderRadius: 8,
          color: "#0e0e0f", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          letterSpacing: "0.04em",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        ADD TEXT
      </button>

      {/* ── Templates ── */}
      <div>
        <TSLabel>TEMPLATES</TSLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
          {TEXT_TEMPLATES.map(tpl => (
            <button
              key={tpl.name}
              onClick={() => addCaption(tpl)}
              style={{
                padding: "9px 10px", borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)", cursor: "pointer",
                textAlign: "left", transition: "border-color 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            >
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, letterSpacing: "0.04em" }}>
                {tpl.name.toUpperCase()}
              </div>
              <div style={{
                fontSize: 13, fontWeight: tpl.style.fontWeight as React.CSSProperties["fontWeight"],
                fontStyle: tpl.style.fontStyle,
                color: "var(--text-primary)", overflow: "hidden",
                whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>{tpl.preview}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Captions list ── */}
      {captions.length > 0 && (
        <div>
          <TSLabel>CAPTIONS ({captions.length})</TSLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
            {captions.map(cap => {
              const isSel = cap.id === selectedCaptionId;
              return (
                <div
                  key={cap.id}
                  onClick={() => onCaptionSelect?.(cap.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 11px", borderRadius: 8, cursor: "pointer",
                    background: isSel ? "rgba(201,169,110,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${isSel ? "rgba(201,169,110,0.4)" : "var(--border-subtle)"}`,
                    transition: "all 0.1s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: isSel ? "var(--accent)" : "var(--text-secondary)",
                      overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                    }}>{cap.text}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {cap.startTime.toFixed(1)}s – {cap.endTime.toFixed(1)}s
                    </div>
                  </div>
                  {/* Visibility toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); onCaptionUpdate?.(cap.id, { visible: !cap.visible }); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: cap.visible ? "var(--text-secondary)" : "var(--text-muted)" }}
                    title={cap.visible ? "Hide" : "Show"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      {cap.visible
                        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      }
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); onCaptionDelete?.(cap.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)" }}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Style editor (shown when a caption is selected) ── */}
      {selectedCap && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
          <div style={{ height: 1, background: "var(--border-subtle)" }} />

          {/* Timing row */}
          <div>
            <TSLabel>TIMING</TSLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
              <TSField label="Start (s)">
                <input type="number" step="0.1" min="0" max={selectedCap.endTime - 0.5}
                  value={selectedCap.startTime.toFixed(1)}
                  onChange={e => upd({ startTime: parseFloat(e.target.value) })}
                  style={inputStyle} />
              </TSField>
              <TSField label="End (s)">
                <input type="number" step="0.1" min={selectedCap.startTime + 0.5} max={totalDuration}
                  value={selectedCap.endTime.toFixed(1)}
                  onChange={e => upd({ endTime: parseFloat(e.target.value) })}
                  style={inputStyle} />
              </TSField>
            </div>
          </div>

          {/* Text content */}
          <div>
            <TSLabel>TEXT</TSLabel>
            <textarea
              value={selectedCap.text}
              onChange={e => upd({ text: e.target.value })}
              rows={2}
              style={{ ...inputStyle, width: "100%", resize: "vertical", marginTop: 8, lineHeight: 1.5 }}
            />
          </div>

          {/* Font */}
          <div>
            <TSLabel>FONT</TSLabel>
            <div style={{ position: "relative", marginTop: 8 }}>
              <input
                value={showFontDrop ? fontSearch : selectedCap.fontFamily}
                onChange={e => { setFontSearch(e.target.value); setShowFontDrop(true); }}
                onFocus={() => { setFontSearch(""); setShowFontDrop(true); }}
                onBlur={() => setTimeout(() => setShowFontDrop(false), 150)}
                placeholder="Search fonts…"
                style={{ ...inputStyle, width: "100%" }}
              />
              {showFontDrop && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  borderRadius: 8, maxHeight: 180, overflowY: "auto", marginTop: 2,
                }}>
                  {filteredFonts.map(f => (
                    <div key={f}
                      onMouseDown={() => { upd({ fontFamily: f }); setShowFontDrop(false); }}
                      style={{
                        padding: "7px 12px", fontSize: 13, cursor: "pointer",
                        color: selectedCap.fontFamily === f ? "var(--accent)" : "var(--text-secondary)",
                        background: selectedCap.fontFamily === f ? "rgba(201,169,110,0.08)" : "transparent",
                        fontFamily: f,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = selectedCap.fontFamily === f ? "rgba(201,169,110,0.08)" : "transparent")}
                    >{f}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Size + Weight */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 7 }}>
              <TSField label="Size">
                <input type="number" min="8" max="200" value={selectedCap.fontSize}
                  onChange={e => upd({ fontSize: parseInt(e.target.value) })}
                  style={inputStyle} />
              </TSField>
              <TSField label="Weight">
                <select value={selectedCap.fontWeight} onChange={e => upd({ fontWeight: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  {["100","200","300","400","500","600","700","800","900"].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </TSField>
            </div>

            {/* Style toggles */}
            <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
              {[
                { label: "B", title: "Bold", active: selectedCap.fontWeight === "700" || selectedCap.fontWeight === "800", action: () => upd({ fontWeight: (selectedCap.fontWeight === "700" || selectedCap.fontWeight === "800") ? "400" : "700" }) },
                { label: "I", title: "Italic", active: selectedCap.fontStyle === "italic", action: () => upd({ fontStyle: selectedCap.fontStyle === "italic" ? "normal" : "italic" }) },
                { label: "U", title: "Underline", active: selectedCap.textDecoration === "underline", action: () => upd({ textDecoration: selectedCap.textDecoration === "underline" ? "none" : "underline" }) },
              ].map(({ label, title, active, action }) => (
                <button key={label} onClick={action} title={title} style={{
                  width: 34, height: 30, borderRadius: 6, border: `1px solid ${active ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
                  background: active ? "rgba(201,169,110,0.12)" : "var(--bg-elevated)",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontStyle: label === "I" ? "italic" : "normal",
                  textDecoration: label === "U" ? "underline" : "none",
                }}>
                  {label}
                </button>
              ))}
              {/* Alignment */}
              {(["left","center","right"] as const).map(align => (
                <button key={align} onClick={() => upd({ textAlign: align })} title={`Align ${align}`} style={{
                  width: 34, height: 30, borderRadius: 6, border: `1px solid ${selectedCap.textAlign === align ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
                  background: selectedCap.textAlign === align ? "rgba(201,169,110,0.12)" : "var(--bg-elevated)",
                  color: selectedCap.textAlign === align ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {align === "left"   && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></>}
                    {align === "center" && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>}
                    {align === "right"  && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></>}
                  </svg>
                </button>
              ))}
            </div>

            {/* Letter spacing + line height */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 7 }}>
              <TSField label="Spacing">
                <input type="number" step="0.5" min="-5" max="30" value={selectedCap.letterSpacing}
                  onChange={e => upd({ letterSpacing: parseFloat(e.target.value) })}
                  style={inputStyle} />
              </TSField>
              <TSField label="Line H.">
                <input type="number" step="0.05" min="0.8" max="3" value={selectedCap.lineHeight.toFixed(2)}
                  onChange={e => upd({ lineHeight: parseFloat(e.target.value) })}
                  style={inputStyle} />
              </TSField>
            </div>
          </div>

          {/* Colors */}
          <div>
            <TSLabel>COLORS</TSLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginTop: 8 }}>
              {[
                { label: "Text", color: selectedCap.color, onChange: (v: string) => upd({ color: v }) },
                { label: "Stroke", color: selectedCap.strokeColor, onChange: (v: string) => upd({ strokeColor: v }) },
                { label: "Shadow", color: selectedCap.shadowColor, onChange: (v: string) => upd({ shadowColor: v }) },
                { label: "BG", color: selectedCap.bgColor, onChange: (v: string) => upd({ bgColor: v }) },
              ].map(({ label, color, onChange }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <label style={{ position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 36, height: 28, borderRadius: 6, background: color, border: "1px solid var(--border)", cursor: "pointer" }} />
                    <input type="color" value={color.startsWith("rgba") ? "#000000" : color}
                      onChange={e => onChange(e.target.value)}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                  </label>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{label.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stroke */}
          <div>
            <TSLabel>STROKE</TSLabel>
            <div style={{ marginTop: 8 }}>
              <TSSlider label={`Width: ${selectedCap.strokeWidth}px`} min={0} max={10} step={0.5}
                value={selectedCap.strokeWidth} onChange={v => upd({ strokeWidth: v })} />
            </div>
          </div>

          {/* Shadow */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TSLabel>SHADOW</TSLabel>
              <TSToggle value={selectedCap.shadowEnabled} onChange={v => upd({ shadowEnabled: v })} />
            </div>
            {selectedCap.shadowEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <TSSlider label={`Blur: ${selectedCap.shadowBlur}px`} min={0} max={40} step={1} value={selectedCap.shadowBlur} onChange={v => upd({ shadowBlur: v })} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <TSField label="X Offset">
                    <input type="number" step="1" min="-20" max="20" value={selectedCap.shadowOffsetX}
                      onChange={e => upd({ shadowOffsetX: parseInt(e.target.value) })}
                      style={inputStyle} />
                  </TSField>
                  <TSField label="Y Offset">
                    <input type="number" step="1" min="-20" max="20" value={selectedCap.shadowOffsetY}
                      onChange={e => upd({ shadowOffsetY: parseInt(e.target.value) })}
                      style={inputStyle} />
                  </TSField>
                </div>
              </div>
            )}
          </div>

          {/* Background box */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TSLabel>BACKGROUND BOX</TSLabel>
              <TSToggle value={selectedCap.bgEnabled} onChange={v => upd({ bgEnabled: v })} />
            </div>
            {selectedCap.bgEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <TSSlider label={`Opacity: ${Math.round(selectedCap.bgOpacity * 100)}%`} min={0} max={1} step={0.05} value={selectedCap.bgOpacity} onChange={v => upd({ bgOpacity: v })} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <TSField label="Padding">
                    <input type="number" min="0" max="40" value={selectedCap.bgPadding}
                      onChange={e => upd({ bgPadding: parseInt(e.target.value) })}
                      style={inputStyle} />
                  </TSField>
                  <TSField label="Radius">
                    <input type="number" min="0" max="40" value={selectedCap.bgRadius}
                      onChange={e => upd({ bgRadius: parseInt(e.target.value) })}
                      style={inputStyle} />
                  </TSField>
                </div>
              </div>
            )}
          </div>

          {/* Animations */}
          <div>
            <TSLabel>ANIMATIONS</TSLabel>
            <div style={{ display: "flex", gap: 5, margin: "8px 0 10px" }}>
              {(["entrance","exit","loop"] as const).map(tab => (
                <button key={tab} onClick={() => setAnimTab(tab)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  border: `1px solid ${animTab === tab ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
                  background: animTab === tab ? "rgba(201,169,110,0.12)" : "transparent",
                  color: animTab === tab ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {(animTab === "entrance" ? ENTRANCE_ANIMS : animTab === "exit" ? EXIT_ANIMS : LOOP_ANIMS).map(a => {
                const isActive =
                  animTab === "entrance" ? selectedCap.entranceAnim === (a.id === "none" ? null : a.id)
                  : animTab === "exit" ? selectedCap.exitAnim === (a.id === "none" ? null : a.id)
                  : selectedCap.loopAnim === (a.id === "none" ? null : a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      const val = a.id === "none" ? null : a.id;
                      if (animTab === "entrance") upd({ entranceAnim: val });
                      else if (animTab === "exit") upd({ exitAnim: val });
                      else upd({ loopAnim: val });
                    }}
                    style={{
                      padding: "8px 4px", borderRadius: 7,
                      border: `1px solid ${isActive ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
                      background: isActive ? "rgba(201,169,110,0.12)" : "var(--bg-elevated)",
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{a.icon}</span>
                    <span style={{ fontSize: 9, color: isActive ? "var(--accent)" : "var(--text-muted)", letterSpacing: "0.03em" }}>
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Anim duration */}
            <div style={{ marginTop: 8 }}>
              <TSSlider label={`Duration: ${selectedCap.animDuration.toFixed(1)}s`} min={0.1} max={2} step={0.1}
                value={selectedCap.animDuration} onChange={v => upd({ animDuration: v })} />
            </div>
          </div>

          {/* Lock toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>LOCK POSITION</span>
            <TSToggle value={selectedCap.locked} onChange={v => upd({ locked: v })} />
          </div>
        </div>
      )}

      {/* ── Canvas Guides ── */}
      <div style={{ paddingTop: selectedCap ? 4 : 0 }}>
        <div style={{ height: 1, background: "var(--border-subtle)", marginBottom: 12 }} />
        <TSLabel>CANVAS GUIDES</TSLabel>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[
            { key: "grid" as const, label: "Grid", active: showGrid },
            { key: "safeZones" as const, label: "Safe Zones", active: showSafeZones },
            { key: "thirds" as const, label: "Thirds", active: showThirds },
          ].map(({ key, label, active }) => (
            <button key={key} onClick={() => onGuideToggle?.(key)} style={{
              flex: 1, padding: "6px 4px", borderRadius: 7, fontSize: 10, fontWeight: 600,
              border: `1px solid ${active ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
              background: active ? "rgba(201,169,110,0.12)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer", letterSpacing: "0.04em",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Tools ── */}
      <div>
        <div style={{ height: 1, background: "var(--border-subtle)", marginBottom: 12 }} />
        <TSLabel>AI TOOLS</TSLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
          {[
            { label: "✦ AI Caption Placement", desc: "Auto-position based on scene analysis" },
            { label: "✦ Improve Text", desc: "Enhance copy with AI suggestions" },
            { label: "✦ Generate Captions", desc: "Auto-caption from video speech" },
          ].map(({ label, desc }) => (
            <button key={label} onClick={() => {}} style={{
              padding: "9px 12px", borderRadius: 8, textAlign: "left", cursor: "pointer",
              border: "1px solid rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.05)",
              width: "100%",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.25)")}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Text Studio helpers ───────────────────────────────────────────────────── */
function TSLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>{children}</div>;
}

function TSField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}

function TSSlider({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
    </div>
  );
}

function TSToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 36, height: 20, borderRadius: 10,
      background: value ? "var(--accent)" : "var(--bg-elevated)",
      border: `1px solid ${value ? "var(--accent)" : "var(--border)"}`,
      cursor: "pointer", position: "relative", transition: "all 0.15s ease",
      padding: 0,
    }}>
      <div style={{
        position: "absolute", top: 2, left: value ? 17 : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: value ? "#0e0e0f" : "var(--text-muted)",
        transition: "left 0.15s ease",
      }} />
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 9px", borderRadius: 6,
  border: "1px solid var(--border-subtle)", background: "var(--bg-base)",
  color: "var(--text-primary)", fontSize: 12,
  outline: "none", boxSizing: "border-box",
};

/* ─── Audio Tab ─────────────────────────────────────────────────────────────── */
function AudioTabContent({ audioTracks, activeAudioId, onSelectAudio, onUpload }: {
  audioTracks: UploadedAudio[];
  activeAudioId: string | null;
  onSelectAudio: (id: string) => void;
  onUpload: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
      <Label>TRACKS ({audioTracks.length})</Label>
      {audioTracks.length === 0 && (
        <p style={{ fontSize: 15.75, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
          Upload MP3 or WAV to add background music.
        </p>
      )}
      {audioTracks.map(t => (
        <button key={t.id} onClick={() => onSelectAudio(t.id)} style={{
          padding: "9px 13.5px", borderRadius: 7.5, textAlign: "left", cursor: "pointer",
          border: activeAudioId === t.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
          background: activeAudioId === t.id ? "var(--accent-bg)" : "var(--bg-elevated)",
          display: "flex", alignItems: "center", gap: 10.5,
        }}>
          <span style={{ color: "var(--accent)", fontSize: 19.5, flexShrink: 0 }}>♪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: activeAudioId === t.id ? "var(--accent)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
            <div style={{ fontSize: 12.75, color: "var(--text-muted)" }}>{t.duration ? `${t.duration}s` : "—"}{activeAudioId === t.id ? " · active" : ""}</div>
          </div>
        </button>
      ))}
      <DropZone onClick={onUpload} label="Upload Audio" compact />
    </div>
  );
}

/* ─── Elements Tab (History) ─────────────────────────────────────────────────── */
function ElementsTab({ historyItems, loading, onLoadGeneration }: {
  historyItems: HistoryEntry[];
  loading: boolean;
  onLoadGeneration?: (timeline: Timeline) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10.5 }}>
      <Label>PAST GENERATIONS</Label>
      {loading && <div style={{ fontSize: 15.75, color: "var(--text-muted)", textAlign: "center", paddingTop: 15 }}>Loading…</div>}
      {!loading && historyItems.length === 0 && (
        <p style={{ fontSize: 15.75, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>No past generations yet.</p>
      )}
      {historyItems.map(item => {
        const d = new Date(item.createdAt);
        const ds = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
        return (
          <div key={item.id} style={{ borderRadius: 9, border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", overflow: "hidden" }}>
            <div style={{ padding: "9px 12px" }}>
              <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 4.5 }}>{item.promptPreview}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.evalScore != null && <span style={{ fontSize: 12.75, color: "var(--accent)", fontWeight: 600 }}>QA {item.evalScore}</span>}
                {item.durationSec && <span style={{ fontSize: 12.75, color: "var(--text-muted)" }}>{item.durationSec}s</span>}
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{ds}</span>
              </div>
            </div>
            {onLoadGeneration && (
              <button
                onClick={() => { try { onLoadGeneration(JSON.parse(item.timelineJson) as Timeline); } catch { /* skip */ } }}
                style={{
                  display: "block", width: "100%", padding: "6px 12px",
                  background: "var(--bg-panel)", border: "none", borderTop: "1px solid var(--border-subtle)",
                  color: "var(--accent)", fontSize: 14.25, fontWeight: 600, cursor: "pointer",
                }}
              >↩ Load lineup</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Brand Tab ─────────────────────────────────────────────────────────────── */
function BrandTab({ overrides, onChange, onTemplateSelect, outroConfig, outroSceneId, onOutroApply, onOutroRemove, onOutroUpdate }: {
  overrides: BrandOverrides;
  onChange?: (o: BrandOverrides) => void;
  onTemplateSelect?: (t: TemplatePreset) => void;
  outroConfig?: OutroTemplate | null;
  outroSceneId?: string | null;
  onOutroApply?: (template: OutroTemplate) => void;
  onOutroRemove?: () => void;
  onOutroUpdate?: (patch: Partial<OutroTemplate>) => void;
}) {
  const primaryColor = overrides.primaryColor ?? "#C9A96E";
  const fontFamily   = overrides.fontFamily   ?? "Cormorant Garamond";
  const colorGrade   = overrides.colorGrade   ?? "Asaya Luxury";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 21 }}>
      <div>
        <Label>PRESET TEMPLATES</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 9 }}>
          {TEMPLATE_PRESETS.map(t => (
            <div key={t.id} onClick={() => onTemplateSelect?.(t)} style={{
              padding: "10.5px 13.5px", borderRadius: 7.5, border: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)", cursor: "pointer", transition: "border-color 0.12s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 15.75, fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{t.ratio}</span>
              </div>
              <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 3 }}>{t.duration} · {t.scenes} scenes</div>
            </div>
          ))}
        </div>
      </div>

      {onChange && (
        <>
          <Sep />
          <div>
            <Label>PRIMARY COLOR</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
              <input type="color" value={primaryColor} onChange={e => onChange({ ...overrides, primaryColor: e.target.value })}
                style={{ width: 42, height: 36, cursor: "pointer", border: "1px solid var(--border)", borderRadius: 6, padding: 3, background: "none", flexShrink: 0 }} />
              <input type="text" value={primaryColor}
                onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange({ ...overrides, primaryColor: e.target.value }); }}
                style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 7.5, padding: "6px 10.5px", color: "var(--text-primary)", fontSize: 15.75, fontFamily: "monospace" }} />
            </div>
          </div>
          <div>
            <Label>BRAND FONT</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 9 }}>
              {FONT_OPTIONS.map(f => (
                <button key={f} onClick={() => onChange({ ...overrides, fontFamily: f })} style={{
                  padding: "6px 10.5px", borderRadius: 6,
                  border: `1px solid ${fontFamily === f ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: fontFamily === f ? "var(--accent-bg)" : "var(--bg-elevated)",
                  color: fontFamily === f ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 15.75, cursor: "pointer", textAlign: "left", fontFamily: f,
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>COLOR GRADE</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 9 }}>
              {COLOR_GRADE_OPTIONS.map(g => (
                <button key={g} onClick={() => onChange({ ...overrides, colorGrade: g })} style={{
                  padding: "6px 10.5px", borderRadius: 6,
                  border: `1px solid ${colorGrade === g ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: colorGrade === g ? "var(--accent-bg)" : "var(--bg-elevated)",
                  color: colorGrade === g ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 15.75, cursor: "pointer", textAlign: "left",
                }}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>LOGO POSITION</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 9 }}>
              {LOGO_POSITIONS.map(p => (
                <button key={p.value} onClick={() => onChange({ ...overrides, logoPosition: p.value })} title={p.value} style={{
                  padding: "10.5px 6px", borderRadius: 7.5,
                  border: `1px solid ${overrides.logoPosition === p.value ? "var(--accent)" : "var(--border-subtle)"}`,
                  background: overrides.logoPosition === p.value ? "var(--accent-bg)" : "var(--bg-elevated)",
                  color: overrides.logoPosition === p.value ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 21, cursor: "pointer",
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Brand Outro ── */}
      <div style={{ marginTop: 16 }}>
        <div style={{ height: 1, background: "var(--border-subtle)", marginBottom: 14 }} />
        <div style={{ fontSize: 14.25, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 12 }}>BRAND OUTRO</div>

        {outroConfig && outroSceneId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Active outro indicator */}
            <div style={{ padding: "10px 13px", borderRadius: 9, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{outroConfig.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{outroConfig.duration}s · {outroConfig.platform}</div>
              </div>
              <button onClick={onOutroRemove} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }} title="Remove outro">×</button>
            </div>
            {/* Quick edits */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>BG COLOR</div>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <div style={{ width: 32, height: 24, borderRadius: 5, background: outroConfig.backgroundColor, border: "1px solid var(--border)" }} />
                  <input type="color" value={outroConfig.backgroundColor} onChange={e => onOutroUpdate?.({ backgroundColor: e.target.value })} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{outroConfig.backgroundColor}</span>
                </label>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>LOGO COLOR</div>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <div style={{ width: 32, height: 24, borderRadius: 5, background: outroConfig.logoColor, border: "1px solid var(--border)" }} />
                  <input type="color" value={outroConfig.logoColor} onChange={e => onOutroUpdate?.({ logoColor: e.target.value })} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{outroConfig.logoColor}</span>
                </label>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>BRAND NAME</div>
              <input value={outroConfig.brandName} onChange={e => onOutroUpdate?.({ brandName: e.target.value })} style={{ width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>TAGLINE</div>
              <input value={outroConfig.tagline} onChange={e => onOutroUpdate?.({ tagline: e.target.value })} style={{ width: "100%", padding: "6px 9px", borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>DURATION: {outroConfig.duration}s</div>
              <input type="range" min={2} max={10} step={0.5} value={outroConfig.duration} onChange={e => onOutroUpdate?.({ duration: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: "var(--accent)" }} />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
              Add a branded end card to your video. Reuse the same template across campaigns.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {OUTRO_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onOutroApply?.(preset)}
                  style={{
                    padding: "10px 13px", borderRadius: 9, textAlign: "left", cursor: "pointer", width: "100%",
                    border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)",
                    display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-dim)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                >
                  {/* Color swatch */}
                  <div style={{ width: 36, height: 28, borderRadius: 5, background: preset.backgroundColor, flexShrink: 0, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: preset.logoColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{preset.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{preset.duration}s · {preset.logoAnimation}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AI Generation Tab ─────────────────────────────────────────────────────── */
function AIGenerationTab({ onAssetGenerated }: {
  onAssetGenerated?: (url: string, name: string, type: "image" | "video") => void;
}) {
  const [genTab, setGenTab] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Image controls
  const [imgAspect, setImgAspect] = useState("9:16");
  const [imgMood, setImgMood] = useState("luxury");
  const [imgStyle, setImgStyle] = useState("cinematic");
  const [imgRealism, setImgRealism] = useState("photorealistic");

  // Video controls
  const [vidDuration, setVidDuration] = useState("5s");
  const [vidAspect, setVidAspect] = useState("9:16");
  const [vidMotion, setVidMotion] = useState("slow");
  const [vidStyle, setVidStyle] = useState("cinematic");

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true); setGenError(null); setResult(null);
    try {
      const endpoint = genTab === "image" ? "/api/generate-image" : "/api/generate-video";
      const body: Record<string, unknown> = { prompt };

      if (genTab === "image") {
        body.aspectRatio = imgAspect; body.mood = imgMood;
        body.style = imgStyle; body.realism = imgRealism;
      } else {
        body.duration = vidDuration; body.aspectRatio = vidAspect;
        body.motion = vidMotion; body.style = vidStyle;
      }

      if (referenceFile) {
        const toB64 = (f: File) => new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
        });
        body.referenceImage = await toB64(referenceFile);
      }

      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResult({ url: data.url ?? data.imageUrl ?? data.videoUrl, type: genTab });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally { setIsGenerating(false); }
  }, [genTab, prompt, imgAspect, imgMood, imgStyle, imgRealism, vidDuration, vidAspect, vidMotion, vidStyle, referenceFile]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 5 }}>
        {(["image", "video"] as const).map(tab => (
          <button key={tab} onClick={() => { setGenTab(tab); setResult(null); setGenError(null); }} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: `1px solid ${genTab === tab ? "rgba(201,169,110,0.5)" : "var(--border-subtle)"}`,
            background: genTab === tab ? "rgba(201,169,110,0.12)" : "transparent",
            color: genTab === tab ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" as const,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {tab === "image"
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            }
            {tab === "image" ? "Image Gen" : "Video Gen"}
          </button>
        ))}
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, padding: "8px 11px", background: "rgba(167,139,250,0.05)", borderRadius: 7, border: "1px solid rgba(167,139,250,0.15)" }}>
        {genTab === "image"
          ? "Generate high-fidelity product or lifestyle images using AI. Best model available is selected automatically."
          : "Generate short video clips from a text prompt. AI selects the optimal model for motion quality and visual fidelity."}
      </div>

      {/* Prompt */}
      <div>
        <Label>{genTab === "image" ? "IMAGE PROMPT" : "VIDEO PROMPT"}</Label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={genTab === "image"
            ? "A luxury perfume bottle on a marble surface, dramatic side lighting, 8K detail…"
            : "Slow-motion close-up of a luxury watch on a dark background, cinematic depth of field…"}
          rows={4}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, resize: "vertical" as const,
            border: "1px solid var(--border-subtle)", background: "var(--bg-base)",
            color: "var(--text-primary)", fontSize: 12, lineHeight: 1.6,
            outline: "none", boxSizing: "border-box" as const, marginTop: 8,
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Reference upload */}
      <div>
        <Label>REFERENCE (OPTIONAL)</Label>
        <div style={{ marginTop: 8 }}>
          {referenceFile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 7, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referenceFile.name}</span>
              <button onClick={() => setReferenceFile(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
          ) : (
            <button onClick={() => refInputRef.current?.click()} style={{
              width: "100%", padding: "9px 12px", borderRadius: 7, border: "1px dashed var(--border)",
              background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload reference image
            </button>
          )}
          <input ref={refInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) setReferenceFile(e.target.files[0]); (e.target as HTMLInputElement).value = ""; }} />
        </div>
      </div>

      {/* Controls */}
      {genTab === "image" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Label>STYLE CONTROLS</Label>
          {[
            { label: "Aspect Ratio", value: imgAspect, onChange: setImgAspect, opts: ["9:16","16:9","1:1","4:5"] },
            { label: "Mood", value: imgMood, onChange: setImgMood, opts: ["luxury","energetic","calm","dramatic","playful"] },
            { label: "Style", value: imgStyle, onChange: setImgStyle, opts: ["cinematic","editorial","product","lifestyle","abstract"] },
            { label: "Realism", value: imgRealism, onChange: setImgRealism, opts: ["photorealistic","semi-realistic","illustrated","artistic"] },
          ].map(({ label, value, onChange, opts }) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={{
                padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-subtle)",
                background: "var(--bg-base)", color: "var(--text-secondary)", fontSize: 11,
                outline: "none", cursor: "pointer",
              }}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Label>STYLE CONTROLS</Label>
          {[
            { label: "Duration", value: vidDuration, onChange: setVidDuration, opts: ["3s","5s","8s","10s","15s"] },
            { label: "Aspect Ratio", value: vidAspect, onChange: setVidAspect, opts: ["9:16","16:9","1:1"] },
            { label: "Motion", value: vidMotion, onChange: setVidMotion, opts: ["slow","normal","fast","hyper"] },
            { label: "Style", value: vidStyle, onChange: setVidStyle, opts: ["cinematic","documentary","commercial","artistic"] },
          ].map(({ label, value, onChange, opts }) => (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>{label.toUpperCase()}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={{
                padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border-subtle)",
                background: "var(--bg-base)", color: "var(--text-secondary)", fontSize: 11,
                outline: "none", cursor: "pointer",
              }}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={isGenerating || !prompt.trim()}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 9, border: "none",
          background: !prompt.trim() ? "rgba(167,139,250,0.2)" : isGenerating ? "rgba(167,139,250,0.4)" : "rgba(167,139,250,0.85)",
          color: !prompt.trim() ? "rgba(167,139,250,0.5)" : "#ffffff",
          fontSize: 13, fontWeight: 700, cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: "0.06em",
        }}
      >
        {isGenerating ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
            </svg>
            GENERATE {genTab.toUpperCase()}
          </>
        )}
      </button>

      {/* Error */}
      {genError && (
        <div style={{ padding: "9px 12px", borderRadius: 7, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", fontSize: 11, color: "#f87171", lineHeight: 1.5 }}>
          {genError}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ height: 1, background: "var(--border-subtle)" }} />
          <Label>RESULT</Label>
          {result.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.url} alt="Generated" style={{ width: "100%", borderRadius: 9, border: "1px solid var(--border)" }} />
          ) : (
            <video src={result.url} controls style={{ width: "100%", borderRadius: 9, border: "1px solid var(--border)" }} />
          )}
          <div style={{ display: "flex", gap: 7 }}>
            <button
              onClick={() => onAssetGenerated?.(result.url, `generated-${genTab}-${Date.now()}.${result.type === "image" ? "jpg" : "mp4"}`, result.type)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid var(--accent-dim)", background: "rgba(201,169,110,0.1)", color: "var(--accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em" }}
            >
              ADD TO MEDIA
            </button>
            <button
              onClick={() => { const a = document.createElement("a"); a.href = result.url; a.download = `generated.${result.type === "image" ? "jpg" : "mp4"}`; a.click(); }}
              style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}
            >
              Download
            </button>
            <button onClick={() => { setPrompt(""); setResult(null); }} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared helpers ─────────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14.25, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Sep() {
  return <div style={{ height: 1, background: "var(--border-subtle)" }} />;
}

function DropZone({ onClick, label = "Upload", compact = false }: {
  onClick: () => void; label?: string; compact?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: compact ? "10.5px 18px" : "27px 18px",
      border: "1px dashed var(--border)", borderRadius: 10.5, background: "transparent",
      color: "var(--text-muted)", fontSize: 15.75, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: compact ? 0 : 7.5,
      transition: "all 0.15s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      {!compact && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
