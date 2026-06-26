"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  RefreshCw,
  Save,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  Upload,
  Lightbulb,
  Sparkles,
  CheckCircle,
  Loader2,
  Clock,
  ArrowRight,
  Wand2,
  X,
  Image,
  Video,
  Play,
  LayoutGrid,
} from "lucide-react";
import { useEditorStore, type Scene, type AspectRatio, type Mood } from "@/store/editorStore";
import { v4 as uuidv4 } from "uuid";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedVersion {
  id: string;
  prompt: string;
  scenes: Scene[];
  totalDuration: number;
  aspectRatio: AspectRatio;
  workflow: string;
  timestamp: number;
  isDemo?: boolean;
  demoReason?: string;
  workflowId?: string;
  cluster?: string;
  musicSpec?: unknown;
}

interface HistoryEntry {
  id: string;
  prompt: string;
  timestamp: number;
  versionId: string | null;
}

const VERSIONS_LS_KEY = "vydeoai_workspace_v3";
const HISTORY_LS_KEY = "vydeoai_history_v2";

function saveToLS<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function loadFromLS<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ASPECT_OPTIONS: { value: AspectRatio; label: string; sub: string }[] = [
  { value: "9:16", label: "9:16", sub: "Reels" },
  { value: "16:9", label: "16:9", sub: "YouTube" },
  { value: "1:1",  label: "1:1",  sub: "Feed" },
  { value: "4:5",  label: "4:5",  sub: "Portrait" },
  { value: "3:4",  label: "3:4",  sub: "Portrait" },
];

const WORKFLOW_OPTIONS = [
  { value: "ugc-ads",          label: "UGC / Ads",          desc: "Product-focused, authentic feel" },
  { value: "travel-cinematic", label: "Travel Cinematic",    desc: "Sweeping visuals, story-driven" },
  { value: "brand-story",      label: "Brand Story",         desc: "Narrative arc, emotional hooks" },
  { value: "product-launch",   label: "Product Launch",      desc: "High-impact reveal, bold CTA" },
];

const DURATION_OPTIONS = [
  { value: 15,  label: "15s" },
  { value: 30,  label: "30s" },
  { value: 60,  label: "60s" },
  { value: -1,  label: "Custom" },
];

const PLATFORM_OPTIONS = ["Instagram Reels", "TikTok", "YouTube Shorts", "LinkedIn"];
const STYLE_PRESETS = ["Luxury", "Energetic", "Cinematic", "Minimal", "Bold"];

const GENERATION_STEPS = [
  { key: "brief",    label: "Analyzing your brief...",       tool: "Brief Interpreter" },
  { key: "scenes",   label: "Planning scenes...",            tool: "Scene Planner" },
  { key: "timeline", label: "Generating timeline...",        tool: "Timeline Generator" },
  { key: "music",    label: "Selecting music...",            tool: "Music Selector" },
  { key: "final",    label: "Finalizing...",                 tool: "QA Reviewer" },
];

const SUGGESTIONS = [
  { text: "Try adding a specific target audience (e.g. '25-35 year old women')", apply: " targeting 25-35 year old women" },
  { text: "Mention your brand colors for better visual alignment", apply: " with brand colors — deep navy and gold" },
  { text: "Specify the emotion you want viewers to feel", apply: " evoking a feeling of aspiration and luxury" },
  { text: "Add a call-to-action to the description", apply: " ending with a strong CTA 'Shop Now'" },
];

const MOOD_COLORS: Record<string, string> = {
  luxury:    "#C9A96E",
  energetic: "#F87171",
  calm:      "#60A5FA",
  dramatic:  "#A78BFA",
  playful:   "#34D399",
  neutral:   "#94A3B8",
  cinematic: "#818CF8",
  fun:       "#F472B6",
};

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return `${Math.floor(d / 3_600_000)}h ago`;
}

// ── Animation Variants ────────────────────────────────────────────────────────

const fadeUpProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as number[] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};


// ── Scene Card ─────────────────────────────────────────────────────────────────

function SceneCard({
  scene, index, total, isSelected, onClick, videoStatus,
}: {
  scene: Scene; index: number; total: number; isSelected: boolean; onClick: () => void;
  videoStatus?: "generating" | "done" | "error";
}) {
  const c = MOOD_COLORS[scene.mood] ?? "#6366F1";
  const hasVideo = !!scene.clipSrc;
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      style={{
        width: 180, flexShrink: 0, borderRadius: "var(--r-lg)",
        overflow: "hidden", cursor: "pointer",
        border: `1.5px solid ${isSelected ? c : hasVideo ? `${c}60` : "var(--border)"}`,
        background: "var(--bg-elevated)",
        boxShadow: isSelected ? `0 0 0 3px ${c}22, 0 8px 24px rgba(0,0,0,0.4)` : "var(--shadow-xs)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Preview */}
      <div style={{
        height: 108, position: "relative", overflow: "hidden",
        background: hasVideo ? "#000" : `linear-gradient(160deg, color-mix(in srgb, ${c} 30%, #0A0A0D) 0%, color-mix(in srgb, ${c} 8%, #08080f) 100%)`,
      }}>
        {hasVideo ? (
          <video src={scene.clipSrc!} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
        ) : (
          <>
            {/* Cinematic vignette */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
            {/* Large scene number */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: 52, fontWeight: 900,
                color: `${c}18`,
                letterSpacing: "-0.06em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            {/* Description excerpt */}
            {scene.description && (
              <div style={{
                position: "absolute", bottom: 28, left: 8, right: 8,
                fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.4,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {scene.description}
              </div>
            )}
          </>
        )}

        {/* Spinner overlay while generating */}
        {videoStatus === "generating" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ width: 22, height: 22, border: `2px solid ${c}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.08em" }}>Generating</span>
          </div>
        )}
        {videoStatus === "error" && (
          <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <span style={{ fontSize: 8, color: "#F87171", background: "rgba(0,0,0,0.75)", padding: "2px 6px", borderRadius: 4 }}>Failed</span>
          </div>
        )}

        {/* Top badges */}
        <div style={{ position: "absolute", top: 7, left: 7, padding: "2px 7px", borderRadius: "var(--r-full)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: `${c}22`, color: c, border: `1px solid ${c}40`, backdropFilter: "blur(6px)" }}>
          {scene.mood}
        </div>
        <div style={{ position: "absolute", top: 7, right: 7, padding: "2px 6px", borderRadius: "var(--r-full)", fontSize: 9, fontWeight: 700, background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)", backdropFilter: "blur(6px)" }}>
          {scene.duration}s
        </div>
        {hasVideo && videoStatus !== "generating" && (
          <div style={{ position: "absolute", bottom: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e55" }} />
        )}
        {/* Scene number chip */}
        <div style={{ position: "absolute", bottom: 7, left: 7, fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
          SC {String(index + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Info row */}
      <div style={{ padding: "9px 10px 10px", borderTop: `1px solid ${isSelected ? `${c}40` : "var(--border)"}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
          {scene.label}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4, textTransform: "capitalize" }}>
          <span>{scene.transition.type}</span>
          {index < total - 1 && <ArrowRight size={9} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
        </div>
      </div>
    </motion.div>
  );
}

// ── Scene Detail Panel ─────────────────────────────────────────────────────────

function SceneDetail({ scene, index }: { scene: Scene; index: number }) {
  const c = MOOD_COLORS[scene.mood] ?? "#6366F1";
  return (
    <motion.div
      key={scene.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      style={{ padding: "20px 24px" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>
          SCENE {String(index + 1).padStart(2, "0")}
        </span>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {scene.label}
        </h3>
        <span style={{
          padding: "2px 8px", borderRadius: "var(--r-full)",
          fontSize: 10, fontWeight: 700,
          background: "var(--bg-panel)", color: "var(--text-secondary)",
          border: "1px solid var(--border)",
        }}>
          {scene.duration}s
        </span>
        <span style={{
          padding: "2px 8px", borderRadius: "var(--r-full)",
          fontSize: 10, fontWeight: 700,
          background: `${c}18`, color: c, border: `1px solid ${c}40`,
        }}>
          {scene.mood}
        </span>
        <span style={{
          padding: "2px 8px", borderRadius: "var(--r-full)",
          fontSize: 10, fontWeight: 600,
          background: "var(--bg-panel)", color: "var(--text-tertiary)",
          border: "1px solid var(--border)", textTransform: "capitalize",
        }}>
          {scene.transition.type} transition
        </span>
      </div>

      {scene.description && (
        <p style={{
          fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7,
          marginBottom: 16,
        }}>
          {scene.description}
        </p>
      )}

      {scene.captions.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)",
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Captions ({scene.captions.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {scene.captions.map(cap => (
              <div key={cap.id} style={{
                padding: "10px 14px", borderRadius: "var(--r-md)",
                background: "var(--bg-panel)", border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
                  &ldquo;{cap.text}&rdquo;
                </div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  {cap.startTime}s &rarr; {cap.endTime}s &middot; {cap.animation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── AI Thinking State ──────────────────────────────────────────────────────────

function AIThinkingState({
  currentStep, completedSteps,
}: {
  currentStep: number; completedSteps: number[];
}) {
  const REASONING_SNIPPETS = [
    "Interpreting creative intent and identifying key themes...",
    "Structuring narrative arc — hook, build, resolution...",
    "Mapping scenes to optimal durations and pacing...",
    "Matching mood to music genre and BPM...",
    "Running quality checks on transitions and timing...",
  ];

  return (
    <motion.div
      key="thinking"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Animated icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={28} color="var(--ai-light)" />
              </motion.div>
            </div>
            {/* Pulse rings */}
            {[0, 1].map(i => (
              <motion.div
                key={i}
                style={{
                  position: "absolute", inset: -12 - i * 10,
                  borderRadius: "50%", border: "1px solid rgba(139,92,246,0.2)",
                }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              />
            ))}
          </div>
        </div>

        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: "center", marginBottom: 8 }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {GENERATION_STEPS[Math.min(currentStep, GENERATION_STEPS.length - 1)]?.label ?? "Working..."}
            </div>
            <div style={{
              fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)",
              lineHeight: 1.6,
            }}>
              {REASONING_SNIPPETS[Math.min(currentStep, REASONING_SNIPPETS.length - 1)]}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ai-light)" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
            />
          ))}
        </div>

        {/* Tool execution log */}
        <div style={{
          background: "var(--bg-panel)", border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)", padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)",
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2,
          }}>
            Tool Execution Log
          </div>
          {GENERATION_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = i === currentStep;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {isDone ? (
                  <CheckCircle size={12} color="var(--success)" />
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 size={12} color="var(--ai-light)" />
                  </motion.div>
                ) : (
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid var(--border)" }} />
                )}
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-mono)",
                  color: isDone ? "var(--text-secondary)" : isActive ? "var(--ai-light)" : "var(--text-tertiary)",
                }}>
                  {step.tool}
                </span>
                {isDone && (
                  <span style={{ fontSize: 10, color: "var(--success)", opacity: 0.7, marginLeft: "auto" }}>
                    done
                  </span>
                )}
                {isActive && (
                  <span style={{ fontSize: 10, color: "var(--ai-light)", opacity: 0.7, marginLeft: "auto" }}>
                    running...
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AIWorkspace({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPrompt = searchParams.get("prompt") ?? "";
  const urlAutoGenerate = searchParams.get("autoGenerate") === "1";
  const urlAspectRatio = (searchParams.get("aspectRatio") ?? "") as AspectRatio | "";
  const { loadTimeline, setAspectRatio: storeSetAR, setProjectName } = useEditorStore();

  // Prompt & settings
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [workflow, setWorkflow] = useState("ugc-ads");
  const [duration, setDuration] = useState(30);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  // C2 — when the API falls back to a demo storyboard, hold it here for explicit
  // user confirmation instead of silently navigating into the editor.
  const [pendingDemo, setPendingDemo] = useState<{ version: GeneratedVersion; reason?: string } | null>(null);

  // Per-scene video generation state
  const [videoGenStatus, setVideoGenStatus] = useState<Record<string, "generating" | "done" | "error">>({});

  // Cancel controller for in-flight generation
  const cancelControllerRef = useRef<AbortController | null>(null);

  // Selected scene in storyboard
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Results
  const [result, setResult] = useState<GeneratedVersion | null>(null);
  useEffect(() => {
    const stored = loadFromLS<GeneratedVersion | GeneratedVersion[] | null>(VERSIONS_LS_KEY, null);
    if (!stored) return;
    if (Array.isArray(stored)) { setResult(stored[0] ?? null); return; }
    if (!Array.isArray((stored as GeneratedVersion).scenes)) return;
    setResult(stored as GeneratedVersion);
  }, []);

  // Panels
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<"history" | "suggestions">("history");

  // Right panel state — start empty (avoid SSR/client hydration mismatch), load from LS after mount
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    setHistory(loadFromLS<HistoryEntry[]>(HISTORY_LS_KEY, []));
  }, []);

  // Left panel state
  const [platform, setPlatform] = useState("Instagram Reels");
  const [stylePreset, setStylePreset] = useState("Cinematic");
  const [uploadedRefs, setUploadedRefs] = useState<{ name: string; file: File; isVideo: boolean; src: string }[]>([]);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  // Ref that always holds the latest uploadedRefs — avoids stale closures in useCallback
  const uploadedRefsRef = useRef(uploadedRefs);
  useEffect(() => { uploadedRefsRef.current = uploadedRefs; }, [uploadedRefs]);

  // H2 — when true, the upload blob URLs have been handed to the editor store
  // (which reuses ref.src), so we must NOT revoke them on unmount.
  const handedOffRef = useRef(false);
  // H2 — track the logo blob URL so it can be revoked on unmount.
  const logoSrcRef = useRef<string | null>(null);
  useEffect(() => { logoSrcRef.current = logoSrc; }, [logoSrc]);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // H3 + H2 — cleanup on unmount: stop the step-animation timer, abort any in-flight
  // generation request, and revoke object URLs we still own.
  useEffect(() => () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    cancelControllerRef.current?.abort();
    if (logoSrcRef.current) URL.revokeObjectURL(logoSrcRef.current);
    // Only revoke upload preview blobs if we did NOT hand them to the editor.
    if (!handedOffRef.current) {
      uploadedRefsRef.current.forEach(r => URL.revokeObjectURL(r.src));
    }
  }, []);

  const selectedVersion = result;

  // Initialise from URL params (from home page "Generate" button) or sessionStorage fallback
  useEffect(() => {
    // Pick up any files transferred from the home page via window ref
    const win = window as unknown as Record<string, unknown>;
    if (win.__vydeoUploadFiles && Array.isArray(win.__vydeoUploadFiles)) {
      const files = win.__vydeoUploadFiles as File[];
      setUploadedRefs(files.map(f => ({ name: f.name, file: f, isVideo: f.type.startsWith("video/"), src: URL.createObjectURL(f) })));
      delete win.__vydeoUploadFiles;
    }

    // URL params take priority (set by home page Generate button)
    const incoming = urlPrompt ||
      (() => { const s = sessionStorage.getItem("vydeoai_workspace_prompt"); sessionStorage.removeItem("vydeoai_workspace_prompt"); return s ?? ""; })();
    const shouldAutoGen = urlAutoGenerate ||
      (() => { const v = sessionStorage.getItem("vydeoai_workspace_autoGenerate") === "1"; sessionStorage.removeItem("vydeoai_workspace_autoGenerate"); return v; })();

    if (urlAspectRatio && ["9:16","16:9","1:1","4:5","3:4"].includes(urlAspectRatio)) {
      setAspectRatio(urlAspectRatio as AspectRatio);
    }

    if (incoming) {
      setPrompt(incoming);
      if (shouldAutoGen) {
        setTimeout(() => handleGenerate(incoming), 300);
      } else {
        setTimeout(() => promptRef.current?.focus(), 120);
      }
    } else {
      setTimeout(() => promptRef.current?.focus(), 120);
    }
  // Intentionally runs once on mount — urlPrompt/urlAutoGenerate/urlAspectRatio
  // are stable URL values; handleGenerate uses overridePrompt so stale closure is safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step through generation animation
  const runStepAnimation = useCallback(() => {
    let step = 0;
    setCompletedSteps([]);
    setGenStep(0);

    const tick = () => {
      step += 1;
      if (step < GENERATION_STEPS.length) {
        setCompletedSteps(prev => [...prev, step - 1]);
        setGenStep(step);
        stepTimerRef.current = setTimeout(tick, 600 + Math.random() * 400);
      }
    };
    stepTimerRef.current = setTimeout(tick, 700);
  }, []);

  // Shared "open this version in the editor" flow — used by the normal generate
  // path, the demo "proceed anyway" action, and Continue-in-Editor.
  // H2: reuse each ref's existing blob URL (ref.src) instead of creating a second one.
  const proceedToEditor = useCallback((version: GeneratedVersion) => {
    saveToLS(VERSIONS_LS_KEY, version);
    storeSetAR(version.aspectRatio);
    setProjectName(version.prompt.slice(0, 48));

    const videoRefs = uploadedRefsRef.current.filter((r) => r.isVideo);
    if (videoRefs.length > 0) {
      // ── Uploaded clips → combine ONLY those clips (no AI video generation).
      // Build the timeline from the clips IMMEDIATELY (one scene per clip) so the editor
      // preview shows real video the moment it opens — then the editor re-orders them per
      // the prompt via Gemini in the background (combine-by-prompt). Every clip is used.
      handedOffRef.current = true; // editor store owns these blob URLs (no revoke on unmount)
      const DEFAULT_ADJ = { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 };
      Promise.all(
        videoRefs.map(
          (ref) =>
            new Promise<{ ref: typeof ref; duration: number }>((resolve) => {
              const vid = document.createElement("video");
              vid.preload = "metadata";
              const finish = (d: number) => resolve({ ref, duration: Math.max(0.5, d || 5) });
              vid.onloadedmetadata = () => finish(vid.duration);
              vid.onerror = () => finish(5);
              setTimeout(() => finish(5), 2500); // never block navigation on a slow clip
              vid.src = ref.src;
            })
        )
      ).then((loaded) => {
        const store = useEditorStore.getState();
        const scenes = loaded.map(({ ref, duration }, i): Scene => {
          const tmpl = version.scenes[i];
          const clipId = uuidv4();
          store.addClip({ id: clipId, name: ref.name, src: ref.src, file: ref.file, type: "video", duration });
          const captions = (tmpl?.captions ?? [])
            .filter((c) => c.startTime < duration)
            .map((c) => ({ ...c, endTime: Math.min(c.endTime, duration) }));
          return {
            id: uuidv4(), order: i, label: tmpl?.label ?? ref.name, description: tmpl?.description ?? "",
            duration, clipId, clipSrc: ref.src, clipType: "video", captions,
            transition: tmpl?.transition ? { ...tmpl.transition } : { type: "fade", duration: 0.5 },
            mood: tmpl?.mood ?? "neutral", colorGrade: tmpl?.colorGrade ?? null,
            colorAdjustments: tmpl?.colorAdjustments ?? DEFAULT_ADJ, effects: tmpl?.effects ?? [],
          };
        });
        store.loadTimeline({
          scenes, audioTracks: [],
          totalDuration: scenes.reduce((a, s) => a + s.duration, 0),
          aspectRatio: version.aspectRatio,
        });
        // Ask the editor to re-order these clips per the prompt (background refinement).
        sessionStorage.setItem("vydeoai_pending_clip_assign", JSON.stringify({ prompt: version.prompt }));
        router.push(`/editor/${projectId ?? "new"}`);
      });
      return;
    }

    // ── No clips → load the AI storyboard and let the editor generate each scene's video.
    loadTimeline({
      scenes: version.scenes,
      audioTracks: [],
      totalDuration: version.totalDuration,
      aspectRatio: version.aspectRatio,
    });
    sessionStorage.setItem(
      "vydeoai_pending_video_gen",
      JSON.stringify({
        aspectRatio: version.aspectRatio,
        scenes: version.scenes.map((s) => ({
          id: s.id,
          label: s.label,
          description: s.description,
          duration: s.duration,
          mood: s.mood,
        })),
      })
    );
    router.push(`/editor/${projectId ?? "new"}`);
  }, [loadTimeline, storeSetAR, setProjectName, router, projectId]);

  const handleGenerate = useCallback(async (overridePrompt?: string) => {
    const p = (overridePrompt ?? prompt).trim();
    if (!p || isGenerating) return;
    if (p.length < 10) {
      setGenError("Please write at least 10 characters.");
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setPendingDemo(null);
    setGenStep(0);
    setCompletedSteps([]);
    runStepAnimation();

    const entry: HistoryEntry = {
      id: uuidv4(),
      prompt: p,
      timestamp: Date.now(),
      versionId: null,
    };
    const newHistory = [entry, ...history].slice(0, 12);
    setHistory(newHistory);
    saveToLS(HISTORY_LS_KEY, newHistory);

    try {
      const controller = new AbortController();
      cancelControllerRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          workspaceSlug: "asaya",
          aspectRatio,
          runQA: false,
          // C1 — previously-dead user controls; now forwarded so they reach the model.
          duration,
          workflow,
          platform,
          stylePreset,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? `Server error ${res.status}`);

      const rawScenes: Record<string, unknown>[] = data.lineup?.timeline?.scenes ?? [];

      const newScenes: Scene[] = rawScenes.map((s, i) => ({
        id: (s.id as string) ?? uuidv4(),
        order: i,
        label: (s.label as string) ?? `Scene ${i + 1}`,
        description: (s.description as string) ?? "",
        duration: typeof s.duration === "number" ? s.duration : 4,
        clipId: null, clipSrc: null, clipType: null,
        captions: ((s.captions as unknown[]) ?? []).map(c => {
          const cap = c as Record<string, unknown>;
          return {
            id: (cap.id as string) ?? uuidv4(),
            text: (cap.text as string) ?? "",
            startTime: (cap.startTime as number) ?? 0,
            endTime: (cap.endTime as number) ?? 3,
            x: 10, y: 75, fontSize: 24, fontFamily: "Inter",
            color: "#FFFFFF", bgColor: "#000000", bgOpacity: 0.4,
            bold: false, italic: false, align: "center" as const,
            animation: "fade" as const, letterSpacing: 0.05, lineHeight: 1.4,
            stroke: false, strokeColor: "#000000", shadow: true,
          };
        }),
        transition: {
          type: ((s.transition as Record<string, unknown>)?.type as string ?? "fade") as Scene["transition"]["type"],
          duration: ((s.transition as Record<string, unknown>)?.duration as number) ?? 0.5,
        },
        mood: ((s.mood as string) ?? "calm") as Mood,
        colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
      }));

      if (newScenes.length === 0) throw new Error("No scenes generated. Try a more detailed prompt.");

      // Extract stock search queries suggested by Gemini per scene
      const stockQueries: string[] = rawScenes.map((s, i) =>
        (s.stockSearchQuery as string) || (s.label as string) || `Scene ${i + 1}`
      );

      // Determine Pexels orientation from aspect ratio
      const pexelsOrientation =
        aspectRatio === "16:9" ? "landscape"
        : aspectRatio === "1:1" ? "square"
        : "portrait";

      const version: GeneratedVersion = {
        id: uuidv4(),
        prompt: p,
        scenes: newScenes,
        totalDuration: newScenes.reduce((sum, sc) => sum + sc.duration, 0),
        aspectRatio,
        workflow,
        timestamp: Date.now(),
        isDemo: !!data.demo,
        demoReason: data.demoReason,
        workflowId: data.workflowId,
        cluster: data.cluster,
        musicSpec: data.musicSpec,
      };

      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      setCompletedSteps([0, 1, 2, 3, 4]);
      setGenStep(GENERATION_STEPS.length - 1);

      // C2 — AI fell back to a generic demo storyboard (quota/auth/model failure).
      // Do NOT silently navigate; surface it and require an explicit user choice.
      if (data.demo) {
        setIsGenerating(false);
        setPendingDemo({ version, reason: data.demoReason });
        return;
      }

      // Save to history and navigate directly to editor (no storyboard)
      proceedToEditor(version);

    } catch (e) {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setGenError(msg.includes("aborted") || msg.includes("AbortError")
        ? "Request timed out. Please try again."
        : msg
      );
    } finally {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      setIsGenerating(false);
    }
  }, [prompt, aspectRatio, workflow, duration, platform, stylePreset, isGenerating, history, runStepAnimation, proceedToEditor]);

  const handleEditVersion = useCallback((version: GeneratedVersion) => {
    loadTimeline({
      scenes: version.scenes,
      audioTracks: [],
      totalDuration: version.totalDuration,
      aspectRatio: version.aspectRatio,
    });
    storeSetAR(version.aspectRatio);
    setProjectName(version.prompt.slice(0, 48));
    router.push(`/editor/${projectId ?? "new"}`);
  }, [loadTimeline, storeSetAR, setProjectName, router, projectId]);

  const handleRegenerate = useCallback(() => {
    handleGenerate(prompt);
  }, [handleGenerate, prompt]);

  const handleCancelGeneration = useCallback(() => {
    if (cancelControllerRef.current) {
      cancelControllerRef.current.abort();
      cancelControllerRef.current = null;
    }
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    setIsGenerating(false);
    setGenStep(0);
    setCompletedSteps([]);
  }, []);

  const handleUseFootage = useCallback(() => {
    const videoFiles = uploadedRefsRef.current.filter(r => r.isVideo).map(r => r.file);
    if (!videoFiles.length) return;
    const win = window as unknown as Record<string, unknown>;
    win.__vydeoUploadFiles = videoFiles;
    router.push("/footage");
  }, [router]);

  const handleContinueToEditor = useCallback(() => {
    if (!result) return;
    proceedToEditor(result);
  }, [result, proceedToEditor]);

  // C2 — explicit user choices when the AI fell back to a demo storyboard.
  const handleProceedWithDemo = useCallback(() => {
    if (!pendingDemo) return;
    const version = pendingDemo.version;
    setPendingDemo(null);
    setResult(version);
    proceedToEditor(version);
  }, [pendingDemo, proceedToEditor]);

  const handleRetryFromDemo = useCallback(() => {
    setPendingDemo(null);
    handleGenerate(prompt);
  }, [handleGenerate, prompt]);

  const generateVideosForVersion = useCallback(async (version: GeneratedVersion) => {
    const orientation =
      version.aspectRatio === "16:9" ? "landscape"
      : version.aspectRatio === "1:1" ? "square"
      : "portrait";

    // Mark all scenes as generating
    const initial: Record<string, "generating" | "done" | "error"> = {};
    version.scenes.forEach(sc => { initial[sc.id] = "generating"; });
    setVideoGenStatus(initial);

    await Promise.all(version.scenes.map(async (scene) => {
      try {
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: scene.description || scene.label,
            duration: String(Math.min(Math.round(scene.duration), 8)),
            aspectRatio: version.aspectRatio,
            motion: "cinematic slow motion",
            style: `${scene.mood} cinematic`,
          }),
        });
        const data = await res.json() as { videoUrl?: string; url?: string; error?: string };
        const videoUrl = data.videoUrl ?? data.url ?? null;
        if (videoUrl) {
          setResult(prev => prev?.id === version.id
            ? { ...prev, scenes: prev.scenes.map(sc => sc.id === scene.id ? { ...sc, clipSrc: videoUrl, clipType: "video" as const } : sc) }
            : prev
          );
          setVideoGenStatus(prev => ({ ...prev, [scene.id]: "done" }));
        } else {
          setVideoGenStatus(prev => ({ ...prev, [scene.id]: "error" }));
        }
      } catch {
        setVideoGenStatus(prev => ({ ...prev, [scene.id]: "error" }));
      }
    }));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", height: "100%", overflow: "hidden",
      background: "var(--bg-base)",
    }}>
      {/* ── LEFT PANEL ────────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {leftPanelOpen && (
          <motion.div
            key="left-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              flexShrink: 0, overflow: "hidden",
              borderRight: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <div style={{
              width: 280, height: "100%", display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{
                padding: "14px 16px 12px",
                borderBottom: "1px solid var(--border)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  Context
                </span>
                <button
                  onClick={() => setLeftPanelOpen(false)}
                  style={{
                    width: 24, height: 24, borderRadius: "var(--r-sm)",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-tertiary)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Brand Assets */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Palette size={13} color="var(--accent-light)" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Brand Assets</span>
                  </div>
                  {/* Logo upload */}
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    style={{
                      border: "1.5px dashed var(--border)", borderRadius: "var(--r-md)",
                      padding: "12px", textAlign: "center", cursor: "pointer",
                      marginBottom: 10,
                      background: "var(--bg-elevated)",
                      transition: "border-color 0.15s, background 0.15s",
                      minHeight: 56, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 4,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                    }}
                  >
                    {logoSrc ? (
                      <img src={logoSrc} style={{ height: 36, maxWidth: "100%", objectFit: "contain", borderRadius: 4 }} alt="logo" />
                    ) : (
                      <>
                        <Upload size={14} color="var(--text-tertiary)" />
                        <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Upload logo</div>
                      </>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setLogoSrc(prev => {
                          if (prev) URL.revokeObjectURL(prev); // H2 — free the previous logo blob
                          return URL.createObjectURL(f);
                        });
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {/* Brand colors */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    {["#6366F1", "#818CF8", "#F0F0F8"].map((c, i) => (
                      <div key={i} style={{
                        width: 24, height: 24, borderRadius: "var(--r-sm)",
                        background: c, border: "1.5px solid var(--border)", cursor: "pointer",
                      }} title={c} />
                    ))}
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Brand palette</span>
                  </div>
                  {/* Font */}
                  <div style={{
                    padding: "6px 10px", borderRadius: "var(--r-sm)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    fontSize: 11, color: "var(--text-secondary)",
                  }}>
                    Inter <span style={{ color: "var(--text-tertiary)" }}>— Primary font</span>
                  </div>
                </section>

                {/* Reference Clips */}
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Film size={13} color="var(--accent-light)" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                        Reference Clips {uploadedRefs.length > 0 && <span style={{ color: "var(--accent-light)" }}>({uploadedRefs.length})</span>}
                      </span>
                    </div>
                    {uploadedRefs.length > 0 && (
                      <label
                        htmlFor="workspace-ref-clips-input"
                        style={{ fontSize: 10, color: "var(--accent-light)", cursor: "pointer" }}
                      >
                        + Add more
                      </label>
                    )}
                  </div>

                  {/* Hidden input — always rendered so ref is always valid */}
                  <input
                    ref={refInputRef}
                    id="workspace-ref-clips-input"
                    type="file"
                    multiple
                    accept="video/*,video/quicktime,video/mp4,video/webm,image/*"
                    style={{ display: "none" }}
                    onChange={e => {
                      if (e.target.files) {
                        setUploadedRefs(prev => [...prev, ...Array.from(e.target.files!).map(f => ({
                          name: f.name, file: f,
                          isVideo: f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|avi|webm|mkv)$/i) !== null,
                          src: URL.createObjectURL(f),
                        }))]);
                      }
                      e.target.value = "";
                    }}
                  />

                  {uploadedRefs.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {uploadedRefs.map((r, i) => (
                        <div key={i} style={{ position: "relative", borderRadius: "var(--r-sm)", overflow: "hidden", aspectRatio: "16/9", background: "#000", border: "1px solid var(--border)" }}>
                          {r.isVideo ? (
                            <video src={r.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <img src={r.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                          )}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 5px", background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)", fontSize: 8, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.name}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setUploadedRefs(prev => {
                                const removed = prev[i];
                                if (removed) URL.revokeObjectURL(removed.src); // H2 — free the preview blob
                                return prev.filter((_, j) => j !== i);
                              });
                            }}
                            style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label
                      htmlFor="workspace-ref-clips-input"
                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; }}
                      onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                      onDrop={e => {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        const files = Array.from(e.dataTransfer.files).slice(0, 8);
                        setUploadedRefs(prev => [...prev, ...files.map(f => ({
                          name: f.name, file: f,
                          isVideo: f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|avi|webm|mkv)$/i) !== null,
                          src: URL.createObjectURL(f),
                        }))]);
                      }}
                      style={{ display: "block", border: "1.5px dashed var(--border)", borderRadius: "var(--r-md)", padding: "18px 12px", textAlign: "center", cursor: "pointer", background: "var(--bg-elevated)", transition: "all 0.15s ease" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                    >
                      <Upload size={14} color="var(--text-tertiary)" />
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 5 }}>Click or drag & drop clips here</div>
                    </label>
                  )}
                </section>

                {/* Target Platform */}
                <section>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                    Target Platform
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {PLATFORM_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        style={{
                          padding: "7px 12px", borderRadius: "var(--r-md)",
                          background: platform === p ? "var(--accent-subtle)" : "transparent",
                          border: `1px solid ${platform === p ? "var(--accent-border)" : "var(--border)"}`,
                          color: platform === p ? "var(--accent-light)" : "var(--text-secondary)",
                          fontSize: 11, fontWeight: platform === p ? 600 : 400,
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Style Preset */}
                <section>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                    Style Preset
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {STYLE_PRESETS.map(s => (
                      <button
                        key={s}
                        onClick={() => setStylePreset(s)}
                        style={{
                          padding: "5px 10px", borderRadius: "var(--r-full)",
                          background: stylePreset === s ? "var(--accent-subtle)" : "var(--bg-elevated)",
                          border: `1px solid ${stylePreset === s ? "var(--accent-border)" : "var(--border)"}`,
                          color: stylePreset === s ? "var(--accent-light)" : "var(--text-secondary)",
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.12s ease",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left panel toggle when closed */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            zIndex: 20, width: 20, height: 48, borderRadius: "0 var(--r-sm) var(--r-sm) 0",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderLeft: "none", cursor: "pointer", color: "var(--text-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronRight size={11} />
        </button>
      )}

      {/* ── CENTER PANEL ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── STICKY PROMPT BAR ─────────────────────────────────────────────── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
          background: "rgba(10,10,13,0.85)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          borderBottom: "1px solid var(--border)",
          padding: "16px 20px",
        }}>
          {/* Textarea */}
          <div style={{
            borderRadius: "var(--r-lg)", overflow: "hidden",
            transition: "box-shadow 0.15s ease",
          }}>
            <textarea
              ref={promptRef}
              aria-label="Describe your video"
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setGenError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Describe your video idea in detail..."
              rows={3}
              style={{
                width: "100%", minHeight: 80, resize: "none",
                background: "var(--bg-panel)",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--r-lg)",
                padding: "14px 16px",
                fontSize: 15, lineHeight: 1.6,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "var(--border-focus)";
                e.currentTarget.style.boxShadow = "var(--glow-accent)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Settings row */}
          <div style={{
            display: "flex", gap: 12, alignItems: "center",
            marginTop: 10, flexWrap: "wrap",
          }}>
            {/* Aspect ratio pills */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginRight: 4 }}>Format</span>
              {ASPECT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setAspectRatio(o.value)}
                  style={{
                    padding: "4px 10px", borderRadius: "var(--r-full)",
                    background: aspectRatio === o.value ? "var(--accent-subtle)" : "var(--bg-panel)",
                    border: `1px solid ${aspectRatio === o.value ? "var(--accent-border)" : "var(--border)"}`,
                    color: aspectRatio === o.value ? "var(--accent-light)" : "var(--text-tertiary)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />

            {/* Workflow dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Workflow</span>
              <select
                aria-label="Workflow"
                value={workflow}
                onChange={e => setWorkflow(e.target.value)}
                style={{
                  padding: "4px 8px", borderRadius: "var(--r-sm)",
                  background: "var(--bg-panel)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", fontSize: 11, cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {WORKFLOW_OPTIONS.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />

            {/* Duration */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Duration</span>
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  style={{
                    padding: "4px 9px", borderRadius: "var(--r-full)",
                    background: duration === d.value ? "var(--accent-subtle)" : "var(--bg-panel)",
                    border: `1px solid ${duration === d.value ? "var(--accent-border)" : "var(--border)"}`,
                    color: duration === d.value ? "var(--accent-light)" : "var(--text-tertiary)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            {/* Generate button */}
            <motion.button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
              style={{
                flex: 1, height: 42, borderRadius: "var(--r-lg)",
                background: !prompt.trim() || isGenerating
                  ? "var(--bg-panel)"
                  : "linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)",
                border: `1px solid ${!prompt.trim() || isGenerating ? "var(--border)" : "transparent"}`,
                color: !prompt.trim() || isGenerating ? "var(--text-tertiary)" : "#fff",
                fontSize: 13, fontWeight: 700, cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: prompt.trim() && !isGenerating ? "var(--glow-accent)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {isGenerating ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Loader2 size={14} />
                  </motion.div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Video
                </>
              )}
            </motion.button>

            {/* Refine with AI */}
            <motion.button
              onClick={() => {
                if (!prompt.trim()) return;
                const refinement = " — make it more cinematic with dramatic transitions";
                setPrompt(prev => prev + refinement);
                promptRef.current?.focus();
              }}
              whileTap={{ scale: 0.97 }}
              disabled={!prompt.trim()}
              style={{
                height: 42, padding: "0 16px", borderRadius: "var(--r-lg)",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
                cursor: !prompt.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.12s ease", flexShrink: 0,
                opacity: !prompt.trim() ? 0.4 : 1,
              }}
              onMouseEnter={e => {
                if (!prompt.trim()) return;
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent-light)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              <Wand2 size={13} />
              Refine with AI
            </motion.button>

            {/* Upload clips — label triggers hidden input natively, no programmatic click needed */}
            <label
              htmlFor="workspace-ref-clips-input"
              style={{
                height: 42, padding: "0 14px", borderRadius: "var(--r-lg)",
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.12s ease", flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <Upload size={13} />
              Upload
            </label>
          </div>

          {/* Hint + reference upload row */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>
              Press <kbd style={{ padding: "1px 4px", borderRadius: 3, background: "var(--bg-panel)", border: "1px solid var(--border)", fontSize: 9 }}>⌘ Enter</kbd> to generate
            </div>
            <div style={{ flex: 1 }} />
            {/* Reference upload buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>References:</span>
              <label
                htmlFor="workspace-ref-clips-input"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.12s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.color = "var(--accent-light)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                <Image size={11} />
                Image
              </label>
              <label
                htmlFor="workspace-ref-clips-input"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.12s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.color = "var(--accent-light)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
              >
                <Video size={11} />
                Video
              </label>
              {uploadedRefs.length > 0 && (
                <span style={{
                  fontSize: 10, color: "var(--accent-light)",
                  background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                  padding: "2px 8px", borderRadius: "var(--r-full)",
                }}>
                  {uploadedRefs.length} file{uploadedRefs.length > 1 ? "s" : ""} attached
                </span>
              )}
            </div>
          </div>

          {/* Recent prompt chips */}
          {history.length > 0 && !isGenerating && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>Recent:</span>
              {history.slice(0, 4).map(entry => (
                <button
                  key={entry.id}
                  onClick={() => { setPrompt(entry.prompt); promptRef.current?.focus(); }}
                  style={{
                    padding: "3px 10px", borderRadius: "var(--r-full)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-tertiary)", fontSize: 10, cursor: "pointer",
                    maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--accent-light)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
                  }}
                  title={entry.prompt}
                >
                  {entry.prompt.length > 40 ? entry.prompt.slice(0, 38) + "…" : entry.prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── USE MY FOOTAGE BANNER ─────────────────────────────────────────── */}
          {uploadedRefs.some(r => r.isVideo) && !isGenerating && !result && (
            <div style={{
              margin: "12px 20px 0",
              padding: "12px 16px",
              borderRadius: "var(--r-lg)",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <Film size={16} color="var(--accent-light)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                  {uploadedRefs.filter(r => r.isVideo).length} video clip{uploadedRefs.filter(r => r.isVideo).length > 1 ? "s" : ""} ready
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Edit your footage directly — or describe a new video below
                </div>
              </div>
              <button
                onClick={handleUseFootage}
                style={{
                  padding: "6px 14px", borderRadius: "var(--r-full)",
                  background: "linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)",
                  border: "none", color: "#fff",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                <LayoutGrid size={12} />
                Edit my footage
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* C2 — DEMO FALLBACK NOTICE (requires explicit user action) */}
            {pendingDemo && !isGenerating && (
              <motion.div
                key="demo-notice"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ margin: "16px 20px" }}
              >
                <div style={{
                  padding: "16px 18px", borderRadius: "var(--r-lg)",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚠️</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warning)" }}>
                      AI is busy — this is a sample storyboard, not generated from your prompt
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 14px 28px" }}>
                    {pendingDemo.reason ?? "We couldn't generate a custom storyboard right now."}{" "}
                    Retry to generate from your prompt, or continue with this generic sample.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginLeft: 28, flexWrap: "wrap" }}>
                    <button
                      onClick={handleRetryFromDemo}
                      style={{
                        height: 36, padding: "0 18px", borderRadius: "var(--r-md)",
                        background: "linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)",
                        border: "none", color: "#fff",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <RefreshCw size={13} />
                      Retry
                    </button>
                    <button
                      onClick={handleProceedWithDemo}
                      style={{
                        height: 36, padding: "0 16px", borderRadius: "var(--r-md)",
                        background: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.12s ease",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                    >
                      <ArrowRight size={13} />
                      Continue with sample
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {genError && !isGenerating && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ margin: "16px 20px" }}
              >
                <div style={{
                  padding: "12px 16px", borderRadius: "var(--r-lg)",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 13, color: "var(--error)", lineHeight: 1.5,
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}>
                  <span style={{ flex: 1 }}>{genError}</span>
                  <button
                    onClick={() => setGenError(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", padding: 0, flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* GENERATING — polished status overlay */}
            {isGenerating && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "40px 24px",
                }}
              >
                <div style={{ width: "100%", maxWidth: 500 }}>
                  {/* Animated icon */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles size={28} color="var(--ai-light)" />
                        </motion.div>
                      </div>
                      {[0, 1].map(i => (
                        <motion.div
                          key={i}
                          style={{
                            position: "absolute", inset: -12 - i * 10,
                            borderRadius: "50%", border: "1px solid rgba(139,92,246,0.2)",
                          }}
                          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Step label + estimated time */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={genStep}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{ textAlign: "center", marginBottom: 6 }}
                    >
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                        {GENERATION_STEPS[Math.min(genStep, GENERATION_STEPS.length - 1)]?.label ?? "Working..."}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                        Step {Math.min(genStep + 1, GENERATION_STEPS.length)} of {GENERATION_STEPS.length}
                        {" · "}
                        <span style={{ color: "var(--ai-light)" }}>
                          ~{Math.max(2, (GENERATION_STEPS.length - genStep - 1) * 4)}s remaining
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Progress bar */}
                  <div style={{
                    margin: "14px 0 8px",
                    height: 4, borderRadius: 2,
                    background: "var(--bg-panel)", border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}>
                    <motion.div
                      animate={{ width: `${Math.round(((completedSteps.length) / GENERATION_STEPS.length) * 100)}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        height: "100%",
                        background: "linear-gradient(90deg, var(--accent) 0%, #7C3AED 100%)",
                        borderRadius: 2,
                        boxShadow: "0 0 8px rgba(99,102,241,0.6)",
                        minWidth: 8,
                      }}
                    />
                  </div>

                  {/* Animated dots */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24, marginTop: 12 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ai-light)" }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
                      />
                    ))}
                  </div>

                  {/* Tool execution log */}
                  <div style={{
                    background: "var(--bg-panel)", border: "1px solid var(--border)",
                    borderRadius: "var(--r-lg)", padding: "14px 16px",
                    display: "flex", flexDirection: "column", gap: 8, marginBottom: 16,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)",
                      letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2,
                    }}>
                      Tool Execution Log
                    </div>
                    {GENERATION_STEPS.map((step, i) => {
                      const isDone = completedSteps.includes(i);
                      const isActive = i === genStep;
                      return (
                        <motion.div
                          key={step.key}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: i <= genStep ? 1 : 0.3, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          style={{ display: "flex", alignItems: "center", gap: 8 }}
                        >
                          {isDone ? (
                            <CheckCircle size={12} color="var(--success)" />
                          ) : isActive ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 size={12} color="var(--ai-light)" />
                            </motion.div>
                          ) : (
                            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid var(--border)" }} />
                          )}
                          <span style={{
                            fontSize: 11, fontFamily: "var(--font-mono)",
                            color: isDone ? "var(--text-secondary)" : isActive ? "var(--ai-light)" : "var(--text-tertiary)",
                          }}>
                            {step.tool}
                          </span>
                          {isDone && (
                            <span style={{ fontSize: 10, color: "var(--success)", opacity: 0.7, marginLeft: "auto" }}>done</span>
                          )}
                          {isActive && (
                            <span style={{ fontSize: 10, color: "var(--ai-light)", opacity: 0.7, marginLeft: "auto" }}>running...</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Cancel button */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={handleCancelGeneration}
                      style={{
                        padding: "8px 20px", borderRadius: "var(--r-full)",
                        background: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-tertiary)", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.12s ease",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--error)";
                        (e.currentTarget as HTMLElement).style.color = "var(--error)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
                      }}
                    >
                      <X size={12} />
                      Cancel Generation
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* RESULTS — storyboard + CTA */}
            {!isGenerating && selectedVersion && !genError && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{ padding: "20px" }}
              >
                {/* Success header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 16, flexWrap: "wrap", gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <CheckCircle size={16} color="#22c55e" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        Storyboard Ready
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {selectedVersion.scenes.length} scenes · {selectedVersion.totalDuration}s · {selectedVersion.aspectRatio}
                        {selectedVersion.isDemo && (
                          <span style={{ marginLeft: 6, color: "var(--warning)", fontSize: 10 }}>(demo mode)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <motion.button
                    onClick={handleContinueToEditor}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      height: 44, padding: "0 22px", borderRadius: "var(--r-lg)",
                      background: "linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)",
                      border: "none", color: "#fff",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      boxShadow: "var(--glow-accent), 0 4px 16px rgba(99,102,241,0.35)",
                      flexShrink: 0,
                    }}
                  >
                    <Play size={14} style={{ fill: "#fff" }} />
                    Continue in Editor
                    <ArrowRight size={14} />
                  </motion.button>
                </div>

                {/* Secondary actions */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <button
                    onClick={handleRegenerate}
                    style={{
                      padding: "6px 14px", borderRadius: "var(--r-full)",
                      background: "transparent", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      transition: "all 0.12s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    <RefreshCw size={11} />
                    Regenerate
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    style={{
                      padding: "6px 14px", borderRadius: "var(--r-full)",
                      background: "transparent", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.12s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }}
                  >
                    Start Over
                  </button>
                </div>

                {/* Storyboard strip */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
                  }}>
                    <LayoutGrid size={13} color="var(--accent-light)" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Storyboard
                    </span>
                  </div>
                  <div style={{
                    display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8,
                    scrollbarWidth: "thin",
                  }}>
                    {selectedVersion.scenes.map((scene, i) => (
                      <SceneCard
                        key={scene.id}
                        scene={scene}
                        index={i}
                        total={selectedVersion.scenes.length}
                        isSelected={selectedSceneId === scene.id}
                        onClick={() => setSelectedSceneId(scene.id === selectedSceneId ? null : scene.id)}
                        videoStatus={videoGenStatus[scene.id]}
                      />
                    ))}
                  </div>
                </div>

                {/* Scene detail panel */}
                <AnimatePresence mode="wait">
                  {selectedSceneId && (() => {
                    const idx = selectedVersion.scenes.findIndex(s => s.id === selectedSceneId);
                    const scene = selectedVersion.scenes[idx];
                    return scene ? (
                      <motion.div
                        key={selectedSceneId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          borderRadius: "var(--r-lg)", border: "1px solid var(--border)",
                          background: "var(--bg-elevated)", overflow: "hidden",
                        }}
                      >
                        <SceneDetail scene={scene} index={idx} />
                      </motion.div>
                    ) : null;
                  })()}
                </AnimatePresence>
              </motion.div>
            )}

            {/* EMPTY STATE */}
            {!isGenerating && !selectedVersion && !genError && !pendingDemo && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "60px 24px", minHeight: "60vh",
                }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Sparkles size={28} color="var(--ai-light)" />
                </motion.div>
                <h2 style={{
                  fontSize: 20, fontWeight: 700, color: "var(--text-secondary)",
                  marginBottom: 8, letterSpacing: "-0.02em",
                }}>
                  Describe your idea above to get started
                </h2>
                <p style={{
                  fontSize: 13, color: "var(--text-tertiary)", maxWidth: 380,
                  lineHeight: 1.7, textAlign: "center", marginBottom: 28,
                }}>
                  VydeoAI will analyze your brief, plan every scene, select music, and build a complete video structure — ready to edit.
                </p>
                {/* Example prompts */}
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 560 }}
                >
                  {[
                    "15-second luxury skincare ad, elegant fade transitions",
                    "60-second brand story for a sustainable startup",
                    "TikTok product launch with a strong hook",
                    "Instagram Reel for a fashion collection reveal",
                  ].map(s => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => { setPrompt(s); promptRef.current?.focus(); }}
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: "7px 14px", borderRadius: "var(--r-full)",
                        background: "var(--bg-elevated)", border: "1px solid var(--border)",
                        color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                        transition: "border-color 0.12s, color 0.12s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--accent-light)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {rightPanelOpen && (
          <motion.div
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              flexShrink: 0, overflow: "hidden",
              borderLeft: "1px solid var(--border)",
              background: "var(--bg-surface)",
            }}
          >
            <div style={{
              width: 300, height: "100%", display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              {/* Header + tabs */}
              <div style={{
                padding: "14px 14px 0",
                borderBottom: "1px solid var(--border)", flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    style={{
                      width: 24, height: 24, borderRadius: "var(--r-sm)",
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "var(--text-tertiary)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 2 }}>
                  {(["history", "suggestions"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setRightTab(tab)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: "var(--r-sm) var(--r-sm) 0 0",
                        background: "transparent", border: "none",
                        borderBottom: `2px solid ${rightTab === tab ? "var(--accent)" : "transparent"}`,
                        color: rightTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.12s ease",
                      }}
                    >
                      {tab === "history" ? "History" : "Suggestions"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                <AnimatePresence mode="wait">

                  {/* HISTORY TAB */}
                  {rightTab === "history" && (
                    <motion.div
                      key="history-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {history.length === 0 ? (
                        <div style={{
                          padding: "28px 8px", textAlign: "center",
                          fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6,
                        }}>
                          Your generation history will appear here.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {history.map(entry => (
                            <motion.div
                              key={entry.id}
                              whileHover={{ scale: 1.01 }}
                              style={{
                                padding: "10px 12px", borderRadius: "var(--r-lg)",
                                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                                cursor: "pointer", transition: "border-color 0.12s",
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
                            >
                              <div style={{
                                fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                                overflow: "hidden", display: "-webkit-box",
                                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                marginBottom: 6,
                              }}>
                                {entry.prompt}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-tertiary)" }}>
                                  <Clock size={10} />
                                  {timeAgo(entry.timestamp)}
                                </div>
                                <button
                                  onClick={() => {
                                    setPrompt(entry.prompt);
                                    promptRef.current?.focus();
                                  }}
                                  style={{
                                    padding: "3px 9px", borderRadius: "var(--r-full)",
                                    background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                    color: "var(--accent-light)", fontSize: 10, fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.12s",
                                  }}
                                >
                                  Re-run
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* SUGGESTIONS TAB */}
                  {rightTab === "suggestions" && (
                    <motion.div
                      key="suggestions-tab"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div style={{ marginBottom: 10, fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                        AI-powered refinement suggestions to improve your results.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {SUGGESTIONS.map((s, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            style={{
                              padding: "12px 14px", borderRadius: "var(--r-lg)",
                              background: "var(--bg-elevated)", border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                              <Lightbulb size={13} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                {s.text}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setPrompt(prev => prev + s.apply);
                                promptRef.current?.focus();
                              }}
                              style={{
                                padding: "4px 10px", borderRadius: "var(--r-full)",
                                background: "var(--accent-subtle)", border: "1px solid var(--accent-border)",
                                color: "var(--accent-light)", fontSize: 10, fontWeight: 600,
                                cursor: "pointer", transition: "all 0.12s",
                              }}
                            >
                              Apply
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right panel toggle when closed */}
      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            zIndex: 20, width: 20, height: 48, borderRadius: "var(--r-sm) 0 0 var(--r-sm)",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRight: "none", cursor: "pointer", color: "var(--text-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChevronLeft size={11} />
        </button>
      )}
    </div>
  );
}
