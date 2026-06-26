"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Film, X, Play, Sparkles, ArrowRight,
  Scissors, Shuffle, Zap, Music, Clock, LayoutGrid,
  ChevronDown, AlertCircle,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useEditorStore, type AspectRatio } from "@/store/editorStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadedClip {
  id: string;
  file: File;
  src: string;
  name: string;
  duration: number;
  thumbnail?: string;
  width?: number;
  height?: number;
  frames?: string[]; // base64 JPEG keyframes for Gemini Vision
}

// ── Prompt suggestions ────────────────────────────────────────────────────────

const PROMPT_EXAMPLES = [
  "Cut to the best moments and add smooth transitions",
  "Create a cinematic highlight reel with slow motion",
  "Arrange clips chronologically with text overlays",
  "Make a fast-paced energetic edit with beat syncing",
  "Create a travel montage with warm color grading",
  "Extract the key moments and add captions",
  "Create a short 30-second highlight reel",
  "Arrange by energy — slow start, intense middle, strong finish",
];

const ASPECT_OPTIONS = [
  { value: "9:16" as AspectRatio, label: "9:16", sub: "Reels / TikTok" },
  { value: "16:9" as AspectRatio, label: "16:9", sub: "YouTube" },
  { value: "1:1" as AspectRatio, label: "1:1", sub: "Feed" },
  { value: "4:5" as AspectRatio, label: "4:5", sub: "Portrait" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: -1, label: "Use all footage" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(s: number) {
  if (s < 60) return `${s.toFixed(0)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function formatSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

async function getVideoMeta(
  file: File,
  src: string
): Promise<{ duration: number; width: number; height: number; thumbnail: string; frames: string[] }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    // Do NOT set crossOrigin on blob URLs — it prevents loadeddata from firing
    video.src = src;

    video.addEventListener("error", () => {
      resolve({ duration: 5, width: 1920, height: 1080, thumbnail: "", frames: [] });
    });

    video.addEventListener("loadeddata", async () => {
      const dur = video.duration || 5;
      const W = 240;
      const H = Math.round(W * (video.videoHeight || 9) / (video.videoWidth || 16));

      function captureAt(t: number): Promise<string> {
        return new Promise((res) => {
          let settled = false;
          const finish = (value: string) => {
            if (settled) return;
            settled = true;
            video.removeEventListener("seeked", handler);
            clearTimeout(timer);
            res(value);
          };
          function handler() {
            const cvs = document.createElement("canvas");
            cvs.width = W; cvs.height = H;
            cvs.getContext("2d")?.drawImage(video, 0, 0, W, H);
            finish(cvs.toDataURL("image/jpeg", 0.6));
          }
          // Some clips decode but never fire `seeked` — fall back to an empty
          // thumbnail after a timeout so addFiles can never hang forever.
          const timer = setTimeout(() => finish(""), 1500);
          video.addEventListener("seeked", handler);
          video.currentTime = t;
        });
      }

      // Extract 4 keyframes: ~5%, 30%, 65%, 90% of duration
      const timestamps = [0.05, 0.3, 0.65, 0.9].map(p => Math.min(dur - 0.1, dur * p));
      const frames: string[] = [];
      for (const t of timestamps) {
        try { frames.push(await captureAt(t)); } catch { /* skip */ }
      }

      resolve({
        duration: dur,
        width: video.videoWidth,
        height: video.videoHeight,
        thumbnail: frames[0] ?? "",
        frames,
      });
    });
  });
}

// ── Clip Thumbnail ────────────────────────────────────────────────────────────

function ClipCard({ clip, onRemove, index }: { clip: UploadedClip; onRemove: () => void; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -4 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", flexShrink: 0,
        width: 160, borderRadius: "var(--r-lg)",
        overflow: "hidden", background: "#0f0f14",
        border: `1.5px solid ${hovered ? "var(--accent-border)" : "var(--border)"}`,
        cursor: "default",
        transition: "border-color 0.15s",
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: "100%", paddingBottom: "56.25%", position: "relative", background: "#111118", overflow: "hidden" }}>
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt={clip.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={24} color="var(--text-tertiary)" />
          </div>
        )}
        {/* Duration badge */}
        <div style={{
          position: "absolute", bottom: 6, right: 6,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
          borderRadius: "var(--r-sm)", padding: "2px 6px",
          fontSize: 10, fontWeight: 700, color: "#fff",
          fontFamily: "var(--font-mono)",
        }}>
          {formatDuration(clip.duration)}
        </div>
        {/* Scene index */}
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "rgba(99,102,241,0.85)", backdropFilter: "blur(6px)",
          borderRadius: "var(--r-sm)", padding: "2px 7px",
          fontSize: 10, fontWeight: 700, color: "#fff",
        }}>
          {index + 1}
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: "7px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {clip.name}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 1 }}>
          {formatSize(clip.file.size)}
          {clip.width ? ` · ${clip.width}×${clip.height}` : ""}
        </div>
      </div>

      {/* Remove button */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onRemove}
            style={{
              position: "absolute", top: 6, right: 6,
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={11} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FootagePage() {
  const router = useRouter();
  const { loadTimeline } = useEditorStore();

  const [clips, setClips] = useState<UploadedClip[]>([]);
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [aspectRatio, setAspectRatioLocal] = useState<AspectRatio>("9:16");
  const [targetDuration, setTargetDuration] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const totalFootageDuration = clips.reduce((s, c) => s + c.duration, 0);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const videoFiles = Array.from(files).filter(f => f.type.startsWith("video/"));
    if (!videoFiles.length) return;

    const newClips: UploadedClip[] = [];
    for (const file of videoFiles) {
      const src = URL.createObjectURL(file);
      const meta = await getVideoMeta(file, src);
      newClips.push({
        id: uuidv4(), file, src,
        name: file.name.replace(/\.[^.]+$/, ""),
        duration: meta.duration,
        thumbnail: meta.thumbnail,
        frames: meta.frames,
        width: meta.width,
        height: meta.height,
      });
    }

    setClips(prev => {
      // Deduplicate by a content signature so two distinct files that happen to
      // share a name (e.g. "clip.mov") are both kept.
      const sig = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;
      const seen = new Set(prev.map(c => sig(c.file)));
      const deduped: UploadedClip[] = [];
      for (const c of newClips) {
        const s = sig(c.file);
        if (seen.has(s)) {
          URL.revokeObjectURL(c.src); // skipped — release its object URL
          continue;
        }
        seen.add(s);
        deduped.push(c);
      }
      return [...prev, ...deduped];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemoveClip = (id: string) => {
    setClips(prev => {
      const clip = prev.find(c => c.id === id);
      if (clip) URL.revokeObjectURL(clip.src);
      return prev.filter(c => c.id !== id);
    });
  };

  async function handleEdit() {
    if (clips.length === 0) {
      setError("Please upload at least one video clip first.");
      return;
    }
    setError(null);
    setProcessing(true);

    try {
      // Step 1: Ask AI to interpret the prompt
      setProcessingStep("Reading your prompt...");
      const clipInfos = clips.map((c, i) => ({
        index: i,
        name: c.name,
        duration: c.duration,
      }));

      // Attach up to 2 frames per clip for Gemini Vision (keep payload size reasonable)
      const clipInfosWithFrames = clips.map((c, i) => ({
        index: i,
        name: c.name,
        duration: c.duration,
        frames: (c.frames ?? []).slice(0, 2),
      }));

      let plan: EditPlan | null = null;
      if (prompt.trim()) {
        setProcessingStep("AI is analysing your clips...");
        try {
          const res = await fetch("/api/edit-footage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt.trim(), clips: clipInfosWithFrames }),
          });
          const data = await res.json();
          if (data.success && data.plan) {
            plan = data.plan as EditPlan;
          }
        } catch (apiErr) {
          console.warn("AI edit plan failed, using defaults:", apiErr);
        }
      }

      // Step 2: Build scenes applying the AI plan
      setProcessingStep("Building your timeline...");
      const effectiveDuration = targetDuration === -1 ? totalFootageDuration : targetDuration;
      const clipScenes = buildScenesFromPlan(clips, plan, effectiveDuration);

      setProcessingStep("Loading into editor...");

      // Register clips in store
      clips.forEach(c => {
        useEditorStore.getState().addClip({
          id: c.id, name: c.name, src: c.src, file: c.file,
          type: "video" as const, duration: c.duration, thumbnail: c.thumbnail,
        });
      });

      // Load timeline
      loadTimeline({
        scenes: clipScenes,
        audioTracks: [],
        totalDuration: clipScenes.reduce((s, sc) => s + sc.duration, 0),
        aspectRatio,
      });

      setProcessingStep("Opening editor...");
      await new Promise(r => setTimeout(r, 150));

      router.push("/editor/footage");
    } catch (err) {
      console.error("handleEdit error:", err);
      setError("Something went wrong — please try again.");
      setProcessing(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", padding: "48px 0" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 32px" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--r-lg)",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}>
              <Scissors size={18} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                Footage Editor
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Upload your clips, describe your vision — AI does the edit
              </p>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Drop zone */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <input
                ref={fileInputRef}
                id="footage-file-input"
                type="file"
                accept="video/*,video/quicktime,video/mp4,video/webm,video/x-msvideo"
                multiple
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderRadius: "var(--r-2xl)",
                  border: `2px dashed ${dragging ? "var(--accent)" : clips.length > 0 ? "var(--border)" : "var(--border-strong)"}`,
                  background: dragging
                    ? "rgba(99,102,241,0.06)"
                    : clips.length > 0 ? "var(--bg-elevated)" : "rgba(255,255,255,0.02)",
                  padding: clips.length > 0 ? "16px" : "48px 24px",
                  cursor: clips.length === 0 ? "pointer" : "default",
                  transition: "border-color 0.15s, background 0.15s",
                  minHeight: clips.length > 0 ? 0 : 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: clips.length === 0 ? "center" : "stretch",
                  justifyContent: clips.length === 0 ? "center" : "flex-start",
                  gap: 16,
                }}
              >
                {clips.length === 0 ? (
                  <>
                    <div style={{
                      width: 56, height: 56, borderRadius: "var(--r-xl)",
                      background: dragging ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Upload size={22} color={dragging ? "var(--accent)" : "var(--text-tertiary)"} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                        Drop your video clips here
                      </p>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        or click to browse · MP4, MOV, AVI, WebM supported
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Clip rail */}
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                      <AnimatePresence>
                        {clips.map((clip, i) => (
                          <ClipCard
                            key={clip.id}
                            clip={clip}
                            index={i}
                            onRemove={() => handleRemoveClip(clip.id)}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Add more button */}
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: 160, flexShrink: 0, borderRadius: "var(--r-lg)",
                          border: "2px dashed var(--border-strong)",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          gap: 8, cursor: "pointer", padding: "24px 12px",
                          background: "rgba(255,255,255,0.02)",
                          transition: "border-color 0.15s, background 0.15s",
                          minHeight: 128,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-border)";
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.04)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
                        }}
                      >
                        <Upload size={18} color="var(--text-tertiary)" />
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textAlign: "center" }}>Add more clips</span>
                      </motion.div>
                    </div>

                    {/* Summary bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Film size={13} color="var(--text-tertiary)" />
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                          {clips.length} clip{clips.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color="var(--text-tertiary)" />
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                          {formatDuration(totalFootageDuration)} total
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Prompt textarea */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <label htmlFor="edit-direction" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Edit Direction
              </label>
              <div style={{
                borderRadius: "var(--r-xl)",
                boxShadow: focused ? "var(--glow-accent)" : "none",
                transition: "box-shadow 0.2s ease",
              }}>
                <textarea
                  id="edit-direction"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleEdit(); }}
                  placeholder="Describe exactly how to edit the clips — who appears first/last, transitions, brightness, pacing, what to cut. AI reads every instruction. e.g. 'Start with the girl, zoom-out transition between all clips, increase brightness 20%, end with the guy in sunglasses'"
                  style={{
                    width: "100%", minHeight: 100,
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(16px)",
                    border: `1.5px solid ${focused ? "var(--accent-border)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "var(--r-xl)",
                    padding: "16px 18px",
                    fontSize: 15, color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)", lineHeight: 1.6,
                    resize: "none", outline: "none",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Quick prompt chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {PROMPT_EXAMPLES.slice(0, 4).map(ex => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    style={{
                      padding: "5px 10px", borderRadius: "var(--r-full)",
                      background: prompt === ex ? "var(--accent-subtle)" : "var(--bg-elevated)",
                      border: `1px solid ${prompt === ex ? "var(--accent-border)" : "var(--border)"}`,
                      color: prompt === ex ? "var(--accent-light)" : "var(--text-secondary)",
                      fontSize: 11, fontWeight: 500, cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px", borderRadius: "var(--r-lg)",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
                    fontSize: 13, color: "#F87171",
                  }}
                >
                  <AlertCircle size={15} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              whileTap={!processing ? { scale: 0.98 } : {}}
              whileHover={!processing ? { scale: 1.01 } : {}}
              onClick={handleEdit}
              disabled={processing}
              style={{
                width: "100%", height: 56, borderRadius: "var(--r-xl)",
                background: processing
                  ? "var(--bg-elevated)"
                  : "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: processing ? "1px solid var(--border)" : "none",
                color: processing ? "var(--text-secondary)" : "#fff",
                fontSize: 16, fontWeight: 800, cursor: processing ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: processing ? "none" : "0 4px 24px rgba(99,102,241,0.45)",
                letterSpacing: "-0.01em",
                transition: "all 0.2s ease",
              }}
            >
              {processing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={16} />
                  </motion.div>
                  {processingStep}
                </>
              ) : (
                <>
                  <Scissors size={18} />
                  {prompt.trim() ? "Edit with AI" : "Auto-Edit Footage"}
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </div>

          {/* Right column — options */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Aspect Ratio */}
            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)", padding: "16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Output Format
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ASPECT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAspectRatioLocal(opt.value)}
                    style={{
                      padding: "8px 6px", borderRadius: "var(--r-md)",
                      background: aspectRatio === opt.value ? "var(--accent-subtle)" : "var(--bg-base)",
                      border: `1.5px solid ${aspectRatio === opt.value ? "var(--accent-border)" : "var(--border)"}`,
                      color: aspectRatio === opt.value ? "var(--accent-light)" : "var(--text-secondary)",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{opt.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Duration */}
            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)", padding: "16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Target Length
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTargetDuration(opt.value)}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--r-full)",
                      background: targetDuration === opt.value ? "var(--accent-subtle)" : "var(--bg-base)",
                      border: `1.5px solid ${targetDuration === opt.value ? "var(--accent-border)" : "var(--border)"}`,
                      color: targetDuration === opt.value ? "var(--accent-light)" : "var(--text-secondary)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* What AI will do */}
            <div style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.05) 100%)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "var(--r-xl)", padding: "16px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                What AI will do
              </div>
              {[
                { icon: Shuffle, label: "Reorder clips per your prompt" },
                { icon: Zap, label: "Apply transitions you specify" },
                { icon: LayoutGrid, label: "Adjust brightness / color" },
                { icon: Scissors, label: "Trim pauses & repeats" },
                { icon: Music, label: "Suggest background music" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, fontSize: 12, color: "var(--text-secondary)" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "var(--r-sm)",
                    background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Icon size={11} color="var(--accent-light)" />
                  </div>
                  {label}
                </div>
              ))}
            </div>

            {/* Tips */}
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.6, padding: "0 4px" }}>
              <strong style={{ color: "var(--text-secondary)" }}>Tips:</strong> Longer prompts = better results. Mention mood, pace, audience, or platform. You can always refine in the editor.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditPlan {
  reasoning?: string;
  sceneOrder: number[];
  trimInstructions?: Array<{ clipIndex: number; trimStart: number; trimEnd: number | null }>;
  transitions?: Array<{ afterClipIndex: number; type: string; duration: number }>;
  globalColorAdjustments?: {
    exposure: number; contrast: number; saturation: number;
    temperature: number; tint: number; highlights: number; shadows: number;
  };
  targetDuration?: number | null;
  muteSourceAudio?: boolean;
}

// ── Scene builder (AI-plan aware) ─────────────────────────────────────────────

const VALID_TRANSITIONS = new Set([
  "cut","fade","dissolve","wipe-left","wipe-right","zoom-in","zoom-out",
  "cross-zoom","slide-left","slide-right","cinematic-fade","glitch",
  "blur","whip","light-leak","flash",
]);

function buildScenesFromPlan(
  clips: UploadedClip[],
  plan: EditPlan | null,
  targetDuration: number,
): import("@/store/editorStore").Scene[] {
  type StoreScene = import("@/store/editorStore").Scene;
  type StoreTransition = import("@/store/editorStore").Transition;
  type StoreTransitionType = import("@/store/editorStore").TransitionType;

  const DEFAULT_ADJ = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
  const colorAdj = plan?.globalColorAdjustments ?? DEFAULT_ADJ;
  const muteSourceAudio = plan?.muteSourceAudio ?? false;

  // Build clip lookup by original index
  const byIndex = new Map(clips.map((c, i) => [i, c]));

  // Determine scene order — AI-provided or original
  const order: number[] = plan?.sceneOrder?.length
    ? plan.sceneOrder.filter(i => byIndex.has(i))
    : clips.map((_, i) => i);

  // Build a lookup: originalIndex → transition that follows it
  const transitionAfter = new Map<number, { type: string; duration: number }>();
  for (const t of plan?.transitions ?? []) {
    transitionAfter.set(t.afterClipIndex, t);
  }

  // Build a lookup: originalIndex → trim info
  const trimFor = new Map<number, { trimStart: number; trimEnd: number | null }>();
  for (const t of plan?.trimInstructions ?? []) {
    trimFor.set(t.clipIndex, t);
  }

  // Scale durations to target if needed
  const orderedClips = order.map(i => byIndex.get(i)!).filter(Boolean);
  const totalRaw = orderedClips.reduce((s, c) => {
    const tr = trimFor.get(clips.indexOf(c));
    const dur = tr?.trimEnd != null ? tr.trimEnd - tr.trimStart : c.duration - (tr?.trimStart ?? 0);
    return s + dur;
  }, 0);
  const scale = targetDuration > 0 && totalRaw > targetDuration ? targetDuration / totalRaw : 1;

  return orderedClips.map((clip, i) => {
    const origIdx = clips.indexOf(clip);
    const trim = trimFor.get(origIdx);
    const rawDur = trim?.trimEnd != null
      ? trim.trimEnd - trim.trimStart
      : clip.duration - (trim?.trimStart ?? 0);
    const sceneDuration = Math.max(0.5, Math.round(rawDur * scale * 10) / 10);

    // Transition from the AI plan for this clip position
    // The transition specified "afterClipIndex X" means the transition that plays AFTER clip X
    // In scene order, scene i gets the transition specified for the clip at order[i-1]
    let transitionType: StoreTransitionType = i === 0 ? "cut" : "fade";
    let transitionDuration = 0.5;
    if (i > 0) {
      const prevOrigIdx = clips.indexOf(orderedClips[i - 1]);
      const t = transitionAfter.get(prevOrigIdx);
      if (t && VALID_TRANSITIONS.has(t.type)) {
        transitionType = t.type as StoreTransitionType;
        transitionDuration = t.duration;
      }
    }

    return {
      id: uuidv4(),
      order: i,
      label: clip.name,
      description: clip.name,
      duration: sceneDuration,
      clipId: clip.id,
      clipSrc: clip.src,
      clipType: "video" as const,
      captions: [],
      transition: { type: transitionType, duration: transitionDuration } as StoreTransition,
      mood: "neutral" as const,
      colorGrade: null,
      colorAdjustments: { ...colorAdj },
      effects: [],
      muteVideoAudio: muteSourceAudio,
    } satisfies StoreScene;
  });
}
