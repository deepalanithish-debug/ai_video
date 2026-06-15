"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import PromptBar, { type EvaluationData } from "./PromptBar";
import AssetPanel from "./AssetPanel";
import CanvasPreview from "./CanvasPreview";
import TimelinePanel from "./TimelinePanel";
import PropertiesPanel from "./PropertiesPanel";
import type { Timeline } from "@/types/timeline";
import type { UploadedClip, UploadedAudio } from "@/types/clips";
import type { TemplatePreset, BrandOverrides } from "./AssetPanel";
import { asayaWorkspace } from "@/lib/workspaces/asaya";
import { isVideoFile, isImageFile, isAudioFile } from "@/lib/media";
import { v4 as uuidv4 } from "uuid";

export default function EditorLayout() {
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

  // Format
  const [aspectRatio, setAspectRatio] = useState<string>("9:16");

  // Brand overrides
  const [brandOverrides, setBrandOverrides] = useState<BrandOverrides>({});

  // Uploaded clips + audio
  const [clips, setClips] = useState<UploadedClip[]>([]);
  const [audioTracks, setAudioTracks] = useState<UploadedAudio[]>([]);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const handleClipsUploaded = useCallback((files: FileList) => {
    const newClips: UploadedClip[] = [];
    Array.from(files).forEach((file) => {
      const isVideo = isVideoFile(file);
      const isImage = isImageFile(file);
      if (!isVideo && !isImage) return;
      const objectUrl = URL.createObjectURL(file);
      const clip: UploadedClip = {
        id: uuidv4(),
        name: file.name,
        type: isVideo ? "video" : "image",
        objectUrl,
        file,
        size: file.size,
      };
      if (isVideo) {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.onloadedmetadata = () => {
          setClips((prev) =>
            prev.map((c) => c.id === clip.id ? { ...c, duration: Math.round(probe.duration) } : c)
          );
          // Do NOT revoke objectUrl — the clip preview and canvas still need it
        };
        probe.src = objectUrl;
      }
      newClips.push(clip);
    });
    setClips((prev) => [...prev, ...newClips]);
  }, []);

  const handleAudioUploaded = useCallback((files: FileList) => {
    const newTracks: UploadedAudio[] = [];
    Array.from(files).forEach((file) => {
      if (!isAudioFile(file)) return;
      const objectUrl = URL.createObjectURL(file);
      const track: UploadedAudio = {
        id: uuidv4(),
        name: file.name,
        objectUrl,
        file,
        size: file.size,
      };
      const probe = document.createElement("audio");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        setAudioTracks((prev) =>
          prev.map((t) => t.id === track.id ? { ...t, duration: Math.round(probe.duration) } : t)
        );
      };
      probe.src = objectUrl;
      newTracks.push(track);
    });
    if (newTracks.length === 0) return;
    setAudioTracks((prev) => [...prev, ...newTracks]);
    setActiveAudioId((prev) => prev ?? newTracks[0].id);
    // Attach BGM to timeline so playback engine can use it
    setTimeline((prevTl) => {
      if (!prevTl) return prevTl;
      const bgm = newTracks[0];
      const layers = [...(prevTl.audioLayers ?? [])];
      const bgmIndex = layers.findIndex((l) => l.type === "bgm");
      const bgmLayer = {
        id: bgmIndex >= 0 ? layers[bgmIndex].id : uuidv4(),
        type: "bgm" as const,
        src: bgm.objectUrl,
        startTime: 0,
        endTime: prevTl.totalDuration,
        volume: 0.7,
        fadeIn: 0.5,
        fadeOut: 1,
      };
      if (bgmIndex >= 0) layers[bgmIndex] = bgmLayer;
      else layers.unshift(bgmLayer);
      return { ...prevTl, audioLayers: layers };
    });
  }, []);

  const handleAssignClip = useCallback((clipId: string, sceneId: string) => {
    // Read clips synchronously from current state to avoid stale closure
    setClips((prevClips) => {
      const clip = prevClips.find((c) => c.id === clipId);
      if (clip) {
        // Update timeline with both clipSrc + clipType so canvas can render correctly
        setTimeline((prevTl) => {
          if (!prevTl) return prevTl;
          return {
            ...prevTl,
            scenes: (prevTl.scenes ?? []).map((s) =>
              s.id === sceneId
                ? { ...s, clipSrc: clip.objectUrl, clipType: clip.type }
                : s
            ),
          };
        });
        // Switch canvas to the scene that just received the clip
        setActiveSceneId(sceneId);
      }
      return prevClips.map((c) =>
        c.id === clipId ? { ...c, assignedToSceneId: sceneId } : c
      );
    });
  }, []);

  const handleRemoveClip = useCallback((clipId: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (clip) URL.revokeObjectURL(clip.objectUrl);
      return prev.filter((c) => c.id !== clipId);
    });
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const workspace = asayaWorkspace;

  // Advance playhead via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !timeline) return;

    const tick = (now: number) => {
      if (lastTickRef.current !== null) {
        const delta = (now - lastTickRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= timeline.totalDuration) {
            setIsPlaying(false);
            return timeline.totalDuration;
          }
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

  // Sync active scene with playhead position
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

  const handleSceneUpdate = useCallback((sceneId: string, patch: Partial<import("@/types/timeline").Scene>) => {
    setTimeline((prev) => {
      if (!prev) return prev;
      const scenes = (prev.scenes ?? []).map((s) =>
        s.id === sceneId ? { ...s, ...patch } : s
      );
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      return { ...prev, scenes, totalDuration };
    });
  }, []);

  const handleSceneDurationChange = useCallback((sceneId: string, newDuration: number) => {
    setTimeline((prev) => {
      if (!prev) return prev;
      const scenes = (prev.scenes ?? []).map((s) =>
        s.id === sceneId ? { ...s, duration: Math.max(1, newDuration) } : s
      );
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      return { ...prev, scenes, totalDuration };
    });
  }, []);

  const handlePlay = useCallback(() => {
    if (!timeline) return;
    if (currentTime >= timeline.totalDuration) setCurrentTime(0);
    setIsPlaying(true);
  }, [timeline, currentTime]);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (timeline) setActiveSceneId(timeline.scenes?.[0]?.id ?? null);
  }, [timeline]);

  const handleSeek = useCallback((t: number) => {
    setCurrentTime(t);
    if (isPlaying) lastTickRef.current = null;
  }, [isPlaying]);

  const handleLineupGenerated = useCallback((
    tl: Timeline,
    sug: unknown,
    isDemo: boolean,
    clipAssignments?: import("@/lib/gemini").ClipAssignment[],
    evaluation?: EvaluationData | null
  ) => {
    setSuggestions(sug as Record<string, unknown>);
    setActiveSceneId(tl.scenes?.[0]?.id ?? null);
    setExportResult(null);
    setIsDemoMode(isDemo);
    setIsPlaying(false);
    setCurrentTime(0);
    if (evaluation) setLastEvaluation(evaluation);

    if (clipAssignments && clipAssignments.length > 0) {
      // Build the assigned timeline inside setClips to access latest clip state
      setClips((prevClips) => {
        const updatedClips = prevClips.map((c) => ({ ...c, assignedToSceneId: undefined as string | undefined }));
        const assignedScenes = (tl.scenes ?? []).map((scene) => {
          const assignment = clipAssignments.find((a) => a.sceneId === scene.id);
          if (!assignment) return scene;
          const clip = prevClips[assignment.clipIndex];
          if (!clip) return scene;
          const clipEntry = updatedClips.find((c) => c.id === clip.id);
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
      const durationSec = parseInt(template.duration, 10);
      const res = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Create a ${template.duration} ${template.mood} video ad for Asaya. ${template.scenes} scenes. ${template.name} style with fitting transitions and captions.`,
          workspaceSlug: workspace.slug,
          aspectRatio: template.ratio,
          targetDuration: durationSec,
          brandOverrides: Object.values(brandOverrides).some(Boolean) ? brandOverrides : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Template generation failed");
      handleLineupGenerated(data.lineup.timeline, data.lineup.suggestions, !!data.demo, data.clipAssignments ?? []);
    } catch (e) {
      console.error("Template generation error:", e);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, workspace.slug, handleLineupGenerated]);

  const handleExport = useCallback(async () => {
    if (!timeline || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline, outputFilename: `${workspace.slug}-${Date.now()}.mp4` }),
      });
      const data = await res.json();
      setExportResult(data);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setIsExporting(false);
    }
  }, [timeline, workspace.slug, isExporting]);

  // Convert a File to base64 data-url
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = () => rej(reader.error);
      reader.readAsDataURL(file);
    });

  const handleRender = useCallback(async () => {
    if (!timeline || isRendering) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderDownloadUrl(null);

    try {
      // Build scene payloads — convert blob File → base64 for API
      setRenderProgress("Preparing clips…");
      const scenePayloads = await Promise.all(
        (timeline.scenes ?? []).map(async (scene) => {
          // Find the clip assigned to this scene
          const clip = clips.find((c) => c.assignedToSceneId === scene.id);
          let clipData: string | undefined;
          if (clip?.file) {
            setRenderProgress(`Encoding ${clip.name}…`);
            clipData = await fileToBase64(clip.file);
          }
          return {
            id: scene.id,
            label: scene.label,
            duration: scene.duration,
            clipData,
            clipType: clip?.type ?? scene.clipType,
            clipTrimStart: scene.clipTrimStart,
            clipTrimEnd: scene.clipTrimEnd,
            playbackSpeed: scene.playbackSpeed,
            visualEffect: scene.visualEffect,
            transition: scene.transition,
          };
        })
      );

      // Build audio payload from the active BGM track
      let audioPayload: { src: string; volume?: number; fadeIn?: number; fadeOut?: number } | undefined;
      if (activeAudioId) {
        const audioTrack = audioTracks.find((t) => t.id === activeAudioId);
        if (audioTrack?.file) {
          setRenderProgress("Encoding audio…");
          const audioData = await fileToBase64(audioTrack.file);
          const bgmLayer = timeline.audioLayers?.find((l) => l.type === "bgm");
          audioPayload = {
            src: audioData,
            volume: bgmLayer?.volume ?? 0.7,
            fadeIn: bgmLayer?.fadeIn ?? 0.5,
            fadeOut: bgmLayer?.fadeOut ?? 1,
          };
        }
      }

      setRenderProgress("Rendering video on server… this may take a minute");

      const outputFilename = `${workspace.slug}-${Date.now()}.mp4`;
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenePayloads,
          audio: audioPayload,
          aspectRatio,
          totalDuration: timeline.totalDuration,
          outputFilename,
        }),
        signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? data.error ?? "Render failed");
      }

      setRenderDownloadUrl(data.downloadUrl);
      setRenderProgress(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRenderError(msg);
      setRenderProgress(null);
      console.error("Render error:", e);
    } finally {
      setIsRendering(false);
    }
  }, [timeline, clips, audioTracks, activeAudioId, aspectRatio, workspace.slug, isRendering]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        overflow: "hidden",
      }}
    >
      {/* Top bar: logo + prompt */}
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {/* Logo */}
        <div
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRight: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--bg-panel)",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e0e0f" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            FRAMEAI
          </span>
        </div>

        {/* Prompt bar */}
        <div style={{ flex: 1 }}>
          <PromptBar
            onLineupGenerated={handleLineupGenerated}
            workspaceSlug={workspace.slug}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            clips={clips}
            brandOverrides={brandOverrides}
          />
        </div>

        {/* Top-right actions */}
        <div
          style={{
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderLeft: "1px solid var(--border)",
            background: "var(--bg-panel)",
            flexShrink: 0,
          }}
        >
          {timeline && (
            <>
              {/* Render Video button */}
              <button
                onClick={handleRender}
                disabled={isRendering}
                style={{
                  padding: "5px 12px",
                  borderRadius: 5,
                  border: "none",
                  background: isRendering ? "rgba(201,169,110,0.4)" : "var(--accent)",
                  color: "#0e0e0f",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: isRendering ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {isRendering ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Rendering…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5z"/>
                      <path d="M14 2v5h5"/>
                      <line x1="12" y1="10" x2="12" y2="16"/>
                      <polyline points="9 13 12 16 15 13"/>
                    </svg>
                    Render Video
                  </>
                )}
              </button>

              <button
                onClick={() => setShowJSON(!showJSON)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 5,
                  border: "1px solid var(--border)",
                  background: showJSON ? "var(--accent-bg)" : "transparent",
                  color: showJSON ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                JSON
              </button>
            </>
          )}
          <WorkspaceIndicator name={workspace.name} />
        </div>
      </div>

      {/* Demo mode banner */}
      {isDemoMode && (
        <div style={{
          padding: "6px 20px",
          background: "rgba(251,191,36,0.08)",
          borderBottom: "1px solid rgba(251,191,36,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 11.5, color: "#fbbf24" }}>
            <strong>Demo mode</strong> — Gemini API quota unavailable. Showing a pre-built Asaya lineup. Enable billing at{" "}
            <a href="https://console.cloud.google.com/billing" target="_blank" rel="noreferrer"
              style={{ color: "#fbbf24", textDecoration: "underline" }}>
              console.cloud.google.com/billing
            </a>{" "}
            to activate live AI generation.
          </span>
        </div>
      )}

      {/* Main body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel */}
        <AssetPanel
          clips={clips}
          audioTracks={audioTracks}
          activeAudioId={activeAudioId}
          timeline={timeline}
          activeSceneId={activeSceneId}
          onClipsUploaded={handleClipsUploaded}
          onAudioUploaded={handleAudioUploaded}
          onSelectAudio={setActiveAudioId}
          onAssignClip={handleAssignClip}
          onRemoveClip={handleRemoveClip}
          onTemplateSelect={handleTemplateSelect}
          brandOverrides={brandOverrides}
          onBrandOverridesChange={setBrandOverrides}
          onLoadGeneration={(tl) => handleLineupGenerated(tl, null, false)}
          workspaceSlug={workspace.slug}
        />

        {/* Center: canvas + timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Canvas preview */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
            <CanvasPreview
              timeline={timeline}
              activeSceneId={activeSceneId}
              isGenerating={isGenerating}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onSeek={handleSeek}
              onSceneSelect={setActiveSceneId}
              aspectRatio={aspectRatio}
              audioTracks={audioTracks}
              activeAudioId={activeAudioId}
              brandOverrides={brandOverrides}
            />

            {/* JSON overlay */}
            {showJSON && timeline && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--bg-panel)",
                  overflow: "auto",
                  padding: 16,
                  zIndex: 10,
                  animation: "fadeIn 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>
                    LINEUP JSON
                  </div>
                  <button
                    onClick={() => setShowJSON(false)}
                    style={{
                      padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)",
                      background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {JSON.stringify(timeline, null, 2)}
                </pre>
              </div>
            )}

            {/* Export result overlay */}
            {exportResult && (
              <ExportResultBanner result={exportResult} onClose={() => setExportResult(null)} />
            )}

            {/* Render progress / download overlay */}
            {(isRendering || renderDownloadUrl || renderError) && (
              <RenderStatusBanner
                isRendering={isRendering}
                progress={renderProgress}
                downloadUrl={renderDownloadUrl}
                error={renderError}
                onClose={() => { setRenderDownloadUrl(null); setRenderError(null); }}
              />
            )}
          </div>

          {/* Timeline */}
          <TimelinePanel
            timeline={timeline}
            activeSceneId={activeSceneId}
            onSceneSelect={(id) => { setActiveSceneId(id); }}
            onExport={handleExport}
            isExporting={isExporting}
            currentTime={currentTime}
            onSeek={handleSeek}
            onSceneDurationChange={handleSceneDurationChange}
            clips={clips}
          />
        </div>

        {/* Right panel */}
        <PropertiesPanel
          timeline={timeline}
          activeSceneId={activeSceneId}
          workspace={workspace}
          suggestions={suggestions}
          evaluation={lastEvaluation}
          onSceneUpdate={handleSceneUpdate}
        />
      </div>
    </div>
  );
}

function WorkspaceIndicator({ name }: { name: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 5,
        background: "var(--accent-bg)",
        border: "1px solid var(--accent-dim)",
      }}
    >
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>
        {name.toUpperCase()}
      </span>
    </div>
  );
}

function RenderStatusBanner({
  isRendering,
  progress,
  downloadUrl,
  error,
  onClose,
}: {
  isRendering: boolean;
  progress: string | null;
  downloadUrl: string | null;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--bg-elevated)",
        border: `1px solid ${error ? "rgba(239,68,68,0.4)" : downloadUrl ? "rgba(52,211,153,0.4)" : "var(--accent-dim)"}`,
        borderRadius: 10,
        padding: "14px 18px",
        zIndex: 30,
        minWidth: 320,
        maxWidth: 480,
        animation: "fadeIn 0.25s ease",
      }}
    >
      {isRendering && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"
            style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 3 }}>
              Rendering final video…
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress ?? "Processing…"}</div>
          </div>
        </div>
      )}

      {downloadUrl && !isRendering && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Video rendered successfully!
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <a
            href={downloadUrl}
            download
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 16px",
              background: "var(--accent)",
              color: "#0e0e0f",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download MP4
          </a>
          <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-muted)", textAlign: "center" }}>
            {downloadUrl.split("/").pop()}
          </div>
        </div>
      )}

      {error && !isRendering && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              Render failed
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, maxHeight: 80, overflow: "auto" }}>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportResultBanner({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  const plan = result.exportPlan as Record<string, unknown>;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 18px",
        zIndex: 20,
        minWidth: 300,
        animation: "fadeIn 0.25s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
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
