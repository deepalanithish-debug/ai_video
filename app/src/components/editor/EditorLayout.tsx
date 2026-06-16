"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import PromptBar, { type EvaluationData } from "./PromptBar";
import AssetPanel from "./AssetPanel";
import CanvasPreview from "./CanvasPreview";
import TimelinePanel from "./TimelinePanel";
import PropertiesPanel from "./PropertiesPanel";
import type { Timeline } from "@/types/timeline";
import type { UploadedClip, UploadedAudio } from "@/types/clips";
import type { StudioCaption } from "@/types/captions";
import type { TemplatePreset, BrandOverrides } from "./AssetPanel";
import type { OutroTemplate } from "@/types/outro";
import { asayaWorkspace } from "@/lib/workspaces/asaya";
import { isVideoFile, isImageFile, isAudioFile } from "@/lib/media";
import { v4 as uuidv4 } from "uuid";

export default function EditorLayout() {
  const searchParams = useSearchParams();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, unknown> | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<Record<string, unknown> | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<string | null>(null);
  const [renderDownloadUrl, setRenderDownloadUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showJSON, setShowJSON] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationData | null>(null);

  const [aspectRatio, setAspectRatio] = useState<string>("9:16");
  // Metadata chips
  const [platform, setPlatform] = useState("Instagram Reels");
  const [durationRange, setDurationRange] = useState("15-30s");
  const [style, setStyle] = useState("Fun, Fast-Paced");

  const [brandOverrides, setBrandOverrides] = useState<BrandOverrides>({});
  const [clips, setClips] = useState<UploadedClip[]>([]);
  const [audioTracks, setAudioTracks] = useState<UploadedAudio[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  // Brand Outro state
  const [outroConfig, setOutroConfig] = useState<OutroTemplate | null>(null);
  const [outroSceneId, setOutroSceneId] = useState<string | null>(null);

  const handleOutroApply = useCallback((template: OutroTemplate) => {
    setOutroConfig(template);
    // Pin outro to the last scene if timeline exists
    if (timeline?.scenes?.length) {
      const lastScene = timeline.scenes[timeline.scenes.length - 1];
      setOutroSceneId(lastScene.id);
    }
  }, [timeline]);

  const handleOutroRemove = useCallback(() => {
    setOutroConfig(null);
    setOutroSceneId(null);
  }, []);

  const handleOutroUpdate = useCallback((patch: Partial<OutroTemplate>) => {
    setOutroConfig(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  // Text Studio state (declared early so autosave useEffect can reference captions)
  const [captions, setCaptions] = useState<StudioCaption[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // Draft state
  const [draftId, setDraftId] = useState<string>(() => uuidv4());
  const [draftName, setDraftName] = useState("Untitled Draft");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft from URL ?draft= param on mount
  useEffect(() => {
    const paramDraftId = searchParams.get("draft");
    if (!paramDraftId) return;
    fetch(`/api/drafts/${paramDraftId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.draft) return;
        const d = data.draft;
        setDraftId(d.id);
        setDraftName(d.name ?? "Untitled Draft");
        if (d.timelineData) {
          setTimeline(d.timelineData);
          setActiveSceneId(d.timelineData.scenes?.[0]?.id ?? null);
        }
        if (d.captionsData) setCaptions(d.captionsData);
        if (d.brandSettings) setBrandOverrides(d.brandSettings);
        if (d.aspectRatio) setAspectRatio(d.aspectRatio);
        if (typeof d.currentPlayhead === "number") setCurrentTime(d.currentPlayhead);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave whenever timeline/captions/brandOverrides changes
  useEffect(() => {
    if (!timeline) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draftName,
            timelineData: timeline,
            captionsData: captions.length ? captions : null,
            brandSettings: Object.values(brandOverrides).some(Boolean) ? brandOverrides : null,
            aspectRatio,
            currentPlayhead: currentTime,
            status: "draft",
          }),
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2500);
      } catch { setAutoSaveStatus("idle"); }
    }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [timeline, captions, brandOverrides, aspectRatio]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showThirds, setShowThirds] = useState(false);

  const handleCaptionAdd = useCallback((c: StudioCaption) => {
    setCaptions(prev => [...prev, c]);
  }, []);

  const handleCaptionUpdate = useCallback((id: string, patch: Partial<StudioCaption>) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const handleCaptionDelete = useCallback((id: string) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
    setSelectedCaptionId(prev => prev === id ? null : prev);
  }, []);

  const handleGuideToggle = useCallback((g: "grid" | "safeZones" | "thirds") => {
    if (g === "grid") setShowGrid(p => !p);
    else if (g === "safeZones") setShowSafeZones(p => !p);
    else setShowThirds(p => !p);
  }, []);

  const handleClipsUploaded = useCallback((files: FileList) => {
    const newClips: UploadedClip[] = [];
    Array.from(files).forEach(file => {
      const isVideo = isVideoFile(file);
      const isImage = isImageFile(file);
      if (!isVideo && !isImage) return;
      const objectUrl = URL.createObjectURL(file);
      const clip: UploadedClip = { id: uuidv4(), name: file.name, type: isVideo ? "video" : "image", objectUrl, file, size: file.size };
      if (isVideo) {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => {
          setClips(prev => prev.map(c => c.id === clip.id ? { ...c, duration: parseFloat(probe.duration.toFixed(3)) } : c));
        };
        probe.src = objectUrl;
      }
      newClips.push(clip);
    });
    setClips(prev => [...prev, ...newClips]);
  }, []);

  const handleAudioUploaded = useCallback((files: FileList) => {
    const newTracks: UploadedAudio[] = [];
    Array.from(files).forEach(file => {
      if (!isAudioFile(file)) return;
      const objectUrl = URL.createObjectURL(file);
      const track: UploadedAudio = { id: uuidv4(), name: file.name, objectUrl, file, size: file.size };
      const probe = document.createElement("audio");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        setAudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, duration: Math.round(probe.duration) } : t));
      };
      probe.src = objectUrl;
      newTracks.push(track);
    });
    if (newTracks.length === 0) return;
    setAudioTracks(prev => [...prev, ...newTracks]);
    setActiveAudioId(prev => prev ?? newTracks[0].id);
    setTimeline(prevTl => {
      if (!prevTl) return prevTl;
      const bgm = newTracks[0];
      const layers = [...(prevTl.audioLayers ?? [])];
      const bgmIndex = layers.findIndex(l => l.type === "bgm");
      const bgmLayer = {
        id: bgmIndex >= 0 ? layers[bgmIndex].id : uuidv4(),
        type: "bgm" as const, src: bgm.objectUrl,
        startTime: 0, endTime: prevTl.totalDuration, volume: 0.7, fadeIn: 0.5, fadeOut: 1,
      };
      if (bgmIndex >= 0) layers[bgmIndex] = bgmLayer; else layers.unshift(bgmLayer);
      return { ...prevTl, audioLayers: layers };
    });
  }, []);

  const handleAssignClip = useCallback((clipId: string, sceneId: string) => {
    setClips(prevClips => {
      const clip = prevClips.find(c => c.id === clipId);
      if (clip) {
        setTimeline(prevTl => {
          if (!prevTl) return prevTl;
          return { ...prevTl, scenes: (prevTl.scenes ?? []).map(s => s.id === sceneId ? { ...s, clipSrc: clip.objectUrl, clipType: clip.type } : s) };
        });
        setActiveSceneId(sceneId);
      }
      return prevClips.map(c => c.id === clipId ? { ...c, assignedToSceneId: sceneId } : c);
    });
  }, []);

  const handleRemoveClip = useCallback((clipId: string) => {
    setClips(prev => {
      const clip = prev.find(c => c.id === clipId);
      if (clip) URL.revokeObjectURL(clip.objectUrl);
      return prev.filter(c => c.id !== clipId);
    });
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const workspace = asayaWorkspace;

  useEffect(() => {
    if (!isPlaying || !timeline) return;
    const tick = (now: number) => {
      if (lastTickRef.current !== null) {
        const delta = (now - lastTickRef.current) / 1000;
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= timeline.totalDuration) { setIsPlaying(false); return timeline.totalDuration; }
          return next;
        });
      }
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, timeline]);

  useEffect(() => {
    if (!timeline?.scenes?.length) return;
    let elapsed = 0;
    for (const scene of timeline.scenes) {
      if (currentTime < elapsed + scene.duration) {
        if (scene.id !== activeSceneId) setActiveSceneId(scene.id);
        return;
      }
      elapsed += scene.duration;
    }
  }, [currentTime, timeline]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScenesReorder = useCallback((fromIdx: number, toIdx: number) => {
    setTimeline(prev => {
      if (!prev) return prev;
      const scenes = [...(prev.scenes ?? [])];
      const [moved] = scenes.splice(fromIdx, 1);
      scenes.splice(toIdx, 0, moved);
      const reordered = scenes.map((s, i) => ({ ...s, order: i }));
      return { ...prev, scenes: reordered, totalDuration: reordered.reduce((sum, s) => sum + s.duration, 0) };
    });
  }, []);

  const handleClipInsert = useCallback((position: number, file: File) => {
    const isVideo = file.type.startsWith("video") || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
    const objectUrl = URL.createObjectURL(file);
    const newClipId = uuidv4();
    const newSceneId = uuidv4();

    const newClip: UploadedClip = {
      id: newClipId, name: file.name, type: isVideo ? "video" : "image",
      objectUrl, file, size: file.size, assignedToSceneId: newSceneId,
    };

    if (isVideo) {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        const dur = parseFloat(probe.duration.toFixed(3));
        setClips(prev => prev.map(c => c.id === newClipId ? { ...c, duration: dur } : c));
        setTimeline(prev => {
          if (!prev) return prev;
          const scenes = prev.scenes.map(s => s.id === newSceneId ? { ...s, duration: dur, clipTrimEnd: dur } : s);
          return { ...prev, scenes, totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0) };
        });
      };
      probe.src = objectUrl;
    }

    const newScene: import("@/types/timeline").Scene = {
      id: newSceneId, order: position, label: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
      description: "Inserted clip", duration: 5, clipSrc: objectUrl,
      clipType: isVideo ? "video" : "image", clipTrimStart: 0, clipTrimEnd: isVideo ? 5 : undefined,
      transition: { type: "cut" as const, duration: 0 }, captions: [], overlays: [],
      mood: "luxury", motionStyle: "static",
    };

    setClips(prev => [...prev, newClip]);
    setTimeline(prev => {
      if (!prev) return prev;
      const scenes = [...prev.scenes];
      scenes.splice(position, 0, newScene);
      const reordered = scenes.map((s, i) => ({ ...s, order: i }));
      return { ...prev, scenes: reordered, totalDuration: reordered.reduce((sum, s) => sum + s.duration, 0) };
    });
    setActiveSceneId(newSceneId);
  }, []);

  const handleSceneUpdate = useCallback((sceneId: string, patch: Partial<import("@/types/timeline").Scene>) => {
    setTimeline(prev => {
      if (!prev) return prev;
      const scenes = (prev.scenes ?? []).map(s => s.id === sceneId ? { ...s, ...patch } : s);
      return { ...prev, scenes, totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0) };
    });
  }, []);

  const handleSceneDurationChange = useCallback((sceneId: string, newDuration: number) => {
    setTimeline(prev => {
      if (!prev) return prev;
      const scenes = (prev.scenes ?? []).map(s => s.id === sceneId ? { ...s, duration: Math.max(1, newDuration) } : s);
      return { ...prev, scenes, totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0) };
    });
  }, []);

  const handlePlay = useCallback(() => {
    if (!timeline) return;
    if (currentTime >= timeline.totalDuration) setCurrentTime(0);
    setIsPlaying(true);
  }, [timeline, currentTime]);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleStop = useCallback(() => {
    setIsPlaying(false); setCurrentTime(0);
    if (timeline) setActiveSceneId(timeline.scenes?.[0]?.id ?? null);
  }, [timeline]);
  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t);
    if (isPlaying) lastTickRef.current = null;
  }, [isPlaying]);

  const handleLineupGenerated = useCallback((
    tl: Timeline, sug: unknown, isDemo: boolean,
    clipAssignments?: import("@/lib/gemini").ClipAssignment[],
    evaluation?: EvaluationData | null
  ) => {
    setSuggestions(sug as Record<string, unknown>);
    setActiveSceneId(tl.scenes?.[0]?.id ?? null);
    setExportResult(null); setIsDemoMode(isDemo);
    setIsPlaying(false); setCurrentTime(0);
    if (evaluation) setLastEvaluation(evaluation);

    if (clipAssignments && clipAssignments.length > 0) {
      setClips(prevClips => {
        const updatedClips = prevClips.map(c => ({ ...c, assignedToSceneId: undefined as string | undefined }));
        const claimedIndices = new Set<number>();
        const assignedScenes = (tl.scenes ?? []).map((scene, sceneIdx) => {
          const assignment = clipAssignments.find(a => a.sceneId === scene.id);
          let clipIdx = assignment?.clipIndex ?? sceneIdx;
          if (claimedIndices.has(clipIdx)) clipIdx = prevClips.findIndex((_, i) => !claimedIndices.has(i));
          if (clipIdx < 0 || clipIdx >= prevClips.length) return scene;
          claimedIndices.add(clipIdx);
          const clip = prevClips[clipIdx];
          const clipEntry = updatedClips.find(c => c.id === clip.id);
          if (clipEntry) clipEntry.assignedToSceneId = scene.id;
          return { ...scene, clipSrc: clip.objectUrl, clipType: clip.type };
        });
        setTimeline({ ...tl, scenes: assignedScenes });
        return updatedClips;
      });
    } else {
      setTimeline(tl);
    }
  }, []);

  const handleTemplateSelect = useCallback(async (template: TemplatePreset) => {
    if (isGenerating) return;
    setAspectRatio(template.ratio);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a ${template.duration} ${template.mood} video ad for Asaya. ${template.scenes} scenes. ${template.name} style with fitting transitions and captions.`,
          workspaceSlug: workspace.slug, aspectRatio: template.ratio,
          targetDuration: parseInt(template.duration, 10),
          brandOverrides: Object.values(brandOverrides).some(Boolean) ? brandOverrides : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Template generation failed");
      handleLineupGenerated(data.lineup.timeline, data.lineup.suggestions, !!data.demo, data.clipAssignments ?? []);
    } catch (e) { console.error("Template generation error:", e); }
    finally { setIsGenerating(false); }
  }, [isGenerating, workspace.slug, handleLineupGenerated, brandOverrides, aspectRatio]);

  const handleExport = useCallback(async () => {
    if (!timeline || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline, outputFilename: `${workspace.slug}-${Date.now()}.mp4` }),
      });
      const data = await res.json();
      setExportResult(data);
    } catch (e) { console.error("Export error:", e); }
    finally { setIsExporting(false); }
  }, [timeline, workspace.slug, isExporting]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = () => rej(reader.error);
      reader.readAsDataURL(file);
    });

  const handleRender = useCallback(async () => {
    if (!timeline || isRendering) return;
    setIsRendering(true); setRenderError(null); setRenderDownloadUrl(null);
    try {
      setRenderProgress("Preparing clips…");
      const scenePayloads = await Promise.all(
        (timeline.scenes ?? []).map(async scene => {
          const clip = clips.find(c => c.assignedToSceneId === scene.id);
          let clipData: string | undefined;
          if (clip?.file) { setRenderProgress(`Encoding ${clip.name}…`); clipData = await fileToBase64(clip.file); }
          return {
            id: scene.id, label: scene.label, duration: scene.duration,
            clipData, clipType: clip?.type ?? scene.clipType,
            clipTrimStart: scene.clipTrimStart, clipTrimEnd: scene.clipTrimEnd,
            playbackSpeed: scene.playbackSpeed, visualEffect: scene.visualEffect, transition: scene.transition,
          };
        })
      );

      let audioPayload: { src: string; volume?: number; fadeIn?: number; fadeOut?: number } | undefined;
      if (activeAudioId) {
        const audioTrack = audioTracks.find(t => t.id === activeAudioId);
        if (audioTrack?.file) {
          setRenderProgress("Encoding audio…");
          const audioData = await fileToBase64(audioTrack.file);
          const bgmLayer = timeline.audioLayers?.find(l => l.type === "bgm");
          audioPayload = { src: audioData, volume: bgmLayer?.volume ?? 0.7, fadeIn: bgmLayer?.fadeIn ?? 0.5, fadeOut: bgmLayer?.fadeOut ?? 1 };
        }
      }

      setRenderProgress("Rendering video on server… this may take a minute");
      const res = await fetch("/api/render", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenePayloads, audio: audioPayload, aspectRatio,
          totalDuration: timeline.totalDuration, outputFilename: `${workspace.slug}-${Date.now()}.mp4`,
        }),
        signal: AbortSignal.timeout(5 * 60 * 1000),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? data.error ?? "Render failed");
      setRenderDownloadUrl(data.downloadUrl); setRenderProgress(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRenderError(msg); setRenderProgress(null);
      console.error("Render error:", e);
    } finally { setIsRendering(false); }
  }, [timeline, clips, audioTracks, activeAudioId, aspectRatio, workspace.slug, isRendering]);

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)", overflow: "hidden" }}>

      {/* ── Top bar (single compact row) ── */}
      <div style={{
        height: 64, display: "flex", alignItems: "stretch",
        borderBottom: "1px solid rgba(124,58,237,0.2)", flexShrink: 0,
        background: "#09091a", position: "relative",
      }}>
        {/* Animated gradient line at bottom of top bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #7c3aed, #06b6d4, transparent)",
          animation: "gradientShift 4s ease infinite",
          backgroundSize: "200% 100%",
          opacity: 0.5,
          pointerEvents: "none",
        }} />

        {/* Logo — clicks go to home */}
        <a href="/" style={{
          width: 130, display: "flex", alignItems: "center", gap: 9,
          padding: "0 18px", borderRight: "1px solid rgba(124,58,237,0.2)",
          flexShrink: 0, textDecoration: "none", cursor: "pointer",
          transition: "opacity 0.15s ease",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 0 12px rgba(124,58,237,0.4)",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg, #a78bfa, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.07em" }}>
            VydeoAI
          </span>
        </a>

        {/* Prompt bar + metadata chips — flex-1 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "stretch", borderRight: "1px solid rgba(124,58,237,0.2)" }}>
          <PromptBar
            onLineupGenerated={handleLineupGenerated}
            workspaceSlug={workspace.slug}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            clips={clips}
            brandOverrides={brandOverrides}
            platform={platform}
            durationRange={durationRange}
            style={style}
            onPlatformChange={setPlatform}
            onDurationChange={setDurationRange}
            onStyleChange={setStyle}
          />
        </div>

        {/* Right: draft name + actions */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 14px", flexShrink: 0,
        }}>
          {/* Draft name (editable inline) */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
                maxWidth: 120, cursor: "text",
                borderBottom: "1px solid transparent",
                transition: "all 0.15s ease",
                padding: "2px 0",
              }}
              onFocus={e => { e.currentTarget.style.borderBottomColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onBlur={e => { e.currentTarget.style.borderBottomColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            />
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth="2" style={{ flexShrink: 0, pointerEvents: "none" }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>

          {/* Autosave indicator */}
          {autoSaveStatus !== "idle" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: autoSaveStatus === "saved" ? "#34d399" : "#7c3aed", transition: "all 0.15s ease" }}>
              {autoSaveStatus === "saving" ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              {autoSaveStatus === "saving" ? "Saving…" : "Saved"}
            </div>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "rgba(124,58,237,0.2)", flexShrink: 0 }} />

          {/* Render / JSON / Export actions */}
          {timeline && (
            <>
              <button
                onClick={handleRender}
                disabled={isRendering}
                style={{
                  padding: "7px 16px", borderRadius: 8,
                  border: "none",
                  background: isRendering
                    ? "rgba(124,58,237,0.2)"
                    : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  color: "#ffffff",
                  fontSize: 12, fontWeight: 700, cursor: isRendering ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s ease",
                  boxShadow: isRendering ? "none" : "0 2px 12px rgba(124,58,237,0.35)",
                  letterSpacing: "0.03em",
                }}
                onMouseEnter={e => { if (!isRendering) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.55), 0 2px 8px rgba(6,182,212,0.3)"; } }}
                onMouseLeave={e => { if (!isRendering) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(124,58,237,0.35)"; } }}
              >
                {isRendering ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                Render
              </button>
              <button
                onClick={() => setShowJSON(!showJSON)}
                style={{
                  padding: "7px 11px", borderRadius: 7,
                  border: `1px solid ${showJSON ? "rgba(124,58,237,0.5)" : "rgba(124,58,237,0.2)"}`,
                  background: showJSON ? "rgba(124,58,237,0.15)" : "transparent",
                  color: showJSON ? "#a78bfa" : "var(--text-muted)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.color = "#a78bfa"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = showJSON ? "rgba(124,58,237,0.5)" : "rgba(124,58,237,0.2)"; e.currentTarget.style.color = showJSON ? "#a78bfa" : "var(--text-muted)"; }}
              >JSON</button>
            </>
          )}

          {/* Home link — highlighted */}
          <a
            href="/"
            title="Back to Home"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "0 12px", height: 32, borderRadius: 7,
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(124,58,237,0.45)",
              color: "#a78bfa", fontSize: 12, fontWeight: 600,
              textDecoration: "none", flexShrink: 0, transition: "all 0.15s ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.32)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.7)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 12px rgba(124,58,237,0.35)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(124,58,237,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.45)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </a>

          {/* User avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#ffffff",
            cursor: "pointer", flexShrink: 0,
            boxShadow: "0 0 10px rgba(124,58,237,0.35)",
            transition: "all 0.15s ease",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 18px rgba(124,58,237,0.6)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 10px rgba(124,58,237,0.35)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
          >
            V
          </div>
        </div>
      </div>

      {/* Demo mode banner */}
      {isDemoMode && (
        <div style={{
          padding: "5px 20px", background: "rgba(251,191,36,0.08)",
          borderBottom: "1px solid rgba(251,191,36,0.2)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 11, color: "#fbbf24" }}>
            <strong>Demo mode</strong> — Gemini API quota unavailable. Enable billing to activate live AI generation.
          </span>
        </div>
      )}

      {/* ── Main body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: icon sidebar + content panel (AssetPanel renders both) */}
        <AssetPanel
          clips={clips} audioTracks={audioTracks} activeAudioId={activeAudioId}
          timeline={timeline} activeSceneId={activeSceneId}
          onClipsUploaded={handleClipsUploaded} onAudioUploaded={handleAudioUploaded}
          onSelectAudio={setActiveAudioId} onAssignClip={handleAssignClip}
          onRemoveClip={handleRemoveClip} onTemplateSelect={handleTemplateSelect}
          brandOverrides={brandOverrides} onBrandOverridesChange={setBrandOverrides}
          onLoadGeneration={tl => handleLineupGenerated(tl, null, false)}
          onSceneUpdate={handleSceneUpdate} workspaceSlug={workspace.slug}
          outroConfig={outroConfig} outroSceneId={outroSceneId}
          onOutroApply={handleOutroApply} onOutroRemove={handleOutroRemove}
          onOutroUpdate={handleOutroUpdate}
          captions={captions} selectedCaptionId={selectedCaptionId}
          currentTime={currentTime} totalDuration={timeline?.totalDuration ?? 30}
          onCaptionAdd={handleCaptionAdd} onCaptionUpdate={handleCaptionUpdate}
          onCaptionDelete={handleCaptionDelete} onCaptionSelect={setSelectedCaptionId}
          showGrid={showGrid} showSafeZones={showSafeZones} showThirds={showThirds}
          onGuideToggle={handleGuideToggle}
        />

        {/* Center: canvas + timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Canvas */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
            <CanvasPreview
              timeline={timeline} activeSceneId={activeSceneId}
              isGenerating={isGenerating} isPlaying={isPlaying}
              currentTime={currentTime} onPlay={handlePlay}
              onPause={handlePause} onStop={handleStop}
              onSeek={handleSeek} onSceneSelect={setActiveSceneId}
              aspectRatio={aspectRatio} audioTracks={audioTracks}
              activeAudioId={activeAudioId} brandOverrides={brandOverrides}
              captions={captions} selectedCaptionId={selectedCaptionId}
              onCaptionSelect={setSelectedCaptionId}
              onCaptionUpdate={handleCaptionUpdate}
              showGrid={showGrid} showSafeZones={showSafeZones} showThirds={showThirds}
              outroConfig={outroConfig} outroSceneId={outroSceneId}
            />

            {/* JSON overlay */}
            {showJSON && timeline && (
              <div style={{
                position: "absolute", inset: 0, background: "var(--bg-panel)",
                overflow: "auto", padding: 16, zIndex: 10, animation: "fadeIn 0.2s ease",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>LINEUP JSON</div>
                  <button onClick={() => setShowJSON(false)}
                    style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 10, cursor: "pointer" }}>
                    Close
                  </button>
                </div>
                <pre style={{ fontSize: 10.5, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {JSON.stringify(timeline, null, 2)}
                </pre>
              </div>
            )}

            {/* Render/export overlays */}
            {exportResult && <ExportResultBanner result={exportResult} onClose={() => setExportResult(null)} />}
            {(isRendering || renderDownloadUrl || renderError) && (
              <RenderStatusBanner
                isRendering={isRendering} progress={renderProgress}
                downloadUrl={renderDownloadUrl} error={renderError}
                onClose={() => { setRenderDownloadUrl(null); setRenderError(null); }}
              />
            )}
          </div>

          {/* Timeline */}
          <TimelinePanel
            timeline={timeline} activeSceneId={activeSceneId}
            onSceneSelect={id => setActiveSceneId(id)}
            onExport={handleExport} isExporting={isExporting}
            currentTime={currentTime} onSeek={handleSeek}
            onSceneDurationChange={handleSceneDurationChange}
            onSceneUpdate={handleSceneUpdate} clips={clips}
            onScenesReorder={handleScenesReorder} onClipInsert={handleClipInsert}
            captions={captions} selectedCaptionId={selectedCaptionId}
            onCaptionSelect={setSelectedCaptionId} onCaptionUpdate={handleCaptionUpdate}
            outroConfig={outroConfig} outroSceneId={outroSceneId}
          />
        </div>

        {/* Right: Properties panel */}
        <PropertiesPanel
          timeline={timeline} activeSceneId={activeSceneId}
          workspace={workspace} suggestions={suggestions}
          evaluation={lastEvaluation} onSceneUpdate={handleSceneUpdate}
          clips={clips}
        />
      </div>
    </div>
  );
}

/* ─── Render Status Banner ─────────────────────────────────────────────────── */
function RenderStatusBanner({ isRendering, progress, downloadUrl, error, onClose }: {
  isRendering: boolean; progress: string | null; downloadUrl: string | null;
  error: string | null; onClose: () => void;
}) {
  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: "var(--bg-elevated)",
      border: `1px solid ${error ? "rgba(239,68,68,0.4)" : downloadUrl ? "rgba(52,211,153,0.4)" : "var(--accent-dim)"}`,
      borderRadius: 10, padding: "14px 18px", zIndex: 30, minWidth: 320, maxWidth: 480, animation: "fadeIn 0.25s ease",
    }}>
      {isRendering && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"
            style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 3 }}>Rendering final video…</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress ?? "Processing…"}</div>
          </div>
        </div>
      )}
      {downloadUrl && !isRendering && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Video rendered successfully!
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <a href={downloadUrl} download style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "9px 16px", background: "var(--accent)", color: "#0e0e0f",
            borderRadius: 6, textDecoration: "none", fontSize: 12, fontWeight: 700,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download MP4
          </a>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>{downloadUrl.split("/").pop()}</div>
        </div>
      )}
      {error && !isRendering && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Render failed
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, maxHeight: 80, overflow: "auto" }}>{error}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Export Result Banner ─────────────────────────────────────────────────── */
function ExportResultBanner({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  const plan = result.exportPlan as Record<string, unknown>;
  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "14px 18px", zIndex: 20, minWidth: 300, animation: "fadeIn 0.25s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          Export plan ready
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
      </div>
      {plan && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {[["Duration", plan.totalDuration], ["Scenes", plan.sceneCount], ["Ratio", plan.aspectRatio], ["Path", plan.outputPath]].map(([k, v]) => (
            <div key={k as string} style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
              <span style={{ color: "var(--text-secondary)" }}>{k as string}: </span>{String(v)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
