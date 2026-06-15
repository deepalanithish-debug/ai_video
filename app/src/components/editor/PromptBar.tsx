"use client";

import { useState, useEffect } from "react";
import type { Timeline } from "@/types/timeline";
import type { UploadedClip } from "@/types/clips";
import type { ClipAssignment, BrandOverrides } from "@/lib/gemini";
import type { ClarifyQuestion } from "@/app/api/lineup/clarify/route";
import type { AgentStep, WorkflowCluster } from "@/lib/agent-pipeline";

const ASPECT_RATIOS = [
  { label: "9:16", sub: "Reels/TikTok" },
  { label: "16:9", sub: "YouTube" },
  { label: "1:1",  sub: "Square" },
  { label: "4:5",  sub: "Feed" },
];


const CLUSTER_LABELS: Record<WorkflowCluster, { label: string; model: string; color: string }> = {
  "ugc-ads":           { label: "UGC / Ads",         model: "gemini-2.5-flash", color: "#f472b6" },
  "travel-cinematic":  { label: "Travel / Cinematic", model: "gemini-2.5-pro",   color: "#6ee7b7" },
};

export interface EvaluationData {
  overallScore: number;
  passedQA: boolean;
  improvements: string[];
  issues: string[];
  compliments: string[];
  criteriaScores: Array<{ criterion: string; score: number; rating: string; notes: string }>;
  platformScores: Array<{ platform: string; score: number; rating: string; insight: string }>;
}

interface PromptBarProps {
  onLineupGenerated: (timeline: Timeline, suggestions: unknown, isDemo: boolean, clipAssignments?: ClipAssignment[], evaluation?: EvaluationData | null) => void;
  workspaceSlug: string;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  aspectRatio: string;
  onAspectRatioChange: (r: string) => void;
  clips?: UploadedClip[];
  brandOverrides?: BrandOverrides;
}

export default function PromptBar({
  onLineupGenerated,
  workspaceSlug,
  isGenerating,
  setIsGenerating,
  aspectRatio,
  onAspectRatioChange,
  clips = [],
  brandOverrides,
}: PromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Clarify flow
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showClarify, setShowClarify] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);

  // Agent trace (shown after generation)
  const [lastTrace, setLastTrace] = useState<AgentStep[]>([]);
  const [lastCluster, setLastCluster] = useState<WorkflowCluster | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    if (!isGenerating) { setElapsedSec(0); return; }
    const id = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isGenerating]);

  async function handleClarify() {
    if (!prompt.trim() || isClarifying) return;
    setIsClarifying(true);
    setQuestions([]);
    setAnswers({});
    try {
      const res = await fetch("/api/lineup/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), hasClips: clips.length > 0, workspaceSlug }),
      });
      const data = await res.json() as { questions: ClarifyQuestion[] };
      if (data.questions?.length) {
        setQuestions(data.questions);
        setShowClarify(true);
      } else {
        // Brief is complete — go straight to generate
        handleGenerate();
      }
    } catch {
      handleGenerate(); // clarify failed, generate anyway
    } finally {
      setIsClarifying(false);
    }
  }

  function buildEnrichedPrompt(): string {
    const answeredParts = questions
      .filter(q => answers[q.id]?.trim())
      .map(q => `${q.question}: ${answers[q.id].trim()}`);
    if (answeredParts.length === 0) return prompt.trim();
    return `${prompt.trim()}\n\nAdditional context:\n${answeredParts.join("\n")}`;
  }

  // Extract evenly-spaced JPEG frames from a video file using an offscreen canvas.
  // Sends ~4 images per clip (≈200KB each) instead of the full video (tens of MB).
  async function extractClipForAnalysis(clip: UploadedClip, index: number) {
    try {
      if (clip.type === "image") {
        const frame = await resizeImageToFrame(clip.file);
        return { frames: [frame], frameTimestamps: [0], mimeType: "image/jpeg", name: clip.name, duration: clip.duration, index };
      }

      const FRAME_COUNT = 10;
      const MAX_WIDTH = 480;
      const { frames, timestamps } = await extractVideoFrames(clip.file, FRAME_COUNT, MAX_WIDTH);
      return { frames, frameTimestamps: timestamps, mimeType: "image/jpeg", name: clip.name, duration: clip.duration, index };
    } catch {
      return null;
    }
  }

  async function handleGenerate(enrichedPromptOverride?: string) {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setUploadStatus(null);
    setShowClarify(false);
    setIsGenerating(true);
    setLastTrace([]);

    try {
      let geminiClips: Awaited<ReturnType<typeof extractClipForAnalysis>>[] = [];
      if (clips.length > 0) {
        setUploadStatus(`Extracting frames from ${clips.length} clip${clips.length > 1 ? "s" : ""}…`);
        const results = await Promise.all(clips.map((c, i) => extractClipForAnalysis(c, i)));
        geminiClips = results.filter((r): r is NonNullable<typeof r> => r !== null);
        setUploadStatus(null);
      }

      const finalPrompt = enrichedPromptOverride ?? buildEnrichedPrompt();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300_000);

      let res: Response;
      try {
        res = await fetch("/api/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            workspaceSlug,
            aspectRatio,

            geminiClips: geminiClips.length > 0 ? geminiClips : undefined,
            brandOverrides: brandOverrides && Object.values(brandOverrides).some(Boolean) ? brandOverrides : undefined,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ? `${data.error ?? "Generation failed"}: ${data.message}` : (data.error ?? "Generation failed"));
      }

      if (data.trace?.length) {
        setLastTrace(data.trace as AgentStep[]);
        setLastCluster(data.cluster as WorkflowCluster ?? null);
      }

      onLineupGenerated(
        data.lineup.timeline,
        data.lineup.suggestions,
        !!data.demo,
        data.clipAssignments ?? [],
        data.evaluation ?? null,
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Generation timed out. Check your connection and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      setIsGenerating(false);
      setUploadStatus(null);
    }
  }

  // Planner determines cluster at generation time; show UGC/Ads as default
  // (clips → editorial mode within ugc-ads; no clips → concept mode)
  const hasClips = clips.length > 0;
  const cluster: WorkflowCluster = lastCluster ?? "ugc-ads";
  const clusterMeta = CLUSTER_LABELS[cluster];
  const modeLabel = hasClips ? "editorial" : "concept";
  const hasOverrides = brandOverrides && Object.values(brandOverrides).some(Boolean);

  return (
    <div style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Top row: format */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 2, letterSpacing: "0.07em", fontWeight: 600 }}>FORMAT</span>
          {ASPECT_RATIOS.map(r => (
            <button key={r.label} onClick={() => onAspectRatioChange(r.label)} title={r.sub} style={{
              padding: "3px 9px", borderRadius: 5,
              border: aspectRatio === r.label ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: aspectRatio === r.label ? "var(--accent-bg)" : "var(--bg-elevated)",
              color: aspectRatio === r.label ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease",
            }}>{r.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", padding: "3px 9px", borderRadius: 5, border: "1px solid var(--accent-dim)", background: "var(--accent-bg)", color: "var(--accent)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0 }}>
          {workspaceSlug.toUpperCase()}
        </div>
      </div>

      {/* Prompt input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            onClick={() => setShowModal(true)}
            onFocus={() => setShowModal(true)}
            placeholder="Click here to write your prompt… e.g. '30-second luxury Instagram ad for Asaya'"
            rows={2}
            readOnly={!showModal}
            style={{
              width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 36px 10px 14px", color: "var(--text-primary)",
              fontSize: 13.5, lineHeight: 1.5, resize: "none", transition: "border-color 0.15s ease",
              cursor: "pointer",
            }}
          />
          {/* Expand button */}
          <button
            onClick={() => setShowModal(true)}
            title="Expand prompt editor"
            style={{
              position: "absolute", top: 6, right: 6,
              width: 24, height: 24, borderRadius: 4,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-panel)", color: "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Clarify + Generate buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => handleGenerate()} disabled={!prompt.trim() || isGenerating} style={{
            padding: "10px 22px", borderRadius: 8, border: "none",
            background: isGenerating || !prompt.trim() ? "var(--bg-elevated)" : "var(--accent)",
            color: isGenerating || !prompt.trim() ? "var(--text-muted)" : "#0e0e0f",
            fontSize: 13, fontWeight: 700, cursor: isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
            transition: "all 0.15s ease", whiteSpace: "nowrap", minWidth: 120,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {isGenerating ? (
              <><SpinnerIcon />{elapsedSec > 3 ? `${elapsedSec}s…` : "Generating…"}</>
            ) : (
              <><SparkleIcon />Generate</>
            )}
          </button>
          {prompt.trim().length >= 10 && !isGenerating && (
            <button onClick={handleClarify} disabled={isClarifying} style={{
              padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--bg-elevated)", color: "var(--text-secondary)",
              fontSize: 10, fontWeight: 500, cursor: isClarifying ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 5, justifyContent: "center",
            }}>
              {isClarifying ? <SpinnerIcon /> : "?"}
              {isClarifying ? "Checking…" : "Clarify brief"}
            </button>
          )}
        </div>
      </div>

      {/* Clarifying questions */}
      {showClarify && questions.length > 0 && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-dim)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>
              A FEW QUICK QUESTIONS
            </span>
            <button onClick={() => { setShowClarify(false); handleGenerate(); }}
              style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
              Skip → generate now
            </button>
          </div>
          {questions.map(q => (
            <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-primary)", fontWeight: 500 }}>{q.question}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{q.why}</div>
              {q.type === "text" && (
                <input type="text" placeholder={q.placeholder ?? "Your answer…"} value={answers[q.id] ?? ""}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", color: "var(--text-primary)", fontSize: 12 }}
                />
              )}
              {(q.type === "choice" || q.type === "multichoice") && q.choices && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {q.choices.map(c => (
                    <button key={c} onClick={() => setAnswers(a => ({ ...a, [q.id]: c }))}
                      style={{
                        padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                        border: answers[q.id] === c ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: answers[q.id] === c ? "var(--accent-bg)" : "var(--bg-panel)",
                        color: answers[q.id] === c ? "var(--accent)" : "var(--text-secondary)",
                      }}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => handleGenerate(buildEnrichedPrompt())} style={{
            padding: "8px 16px", borderRadius: 6, border: "none",
            background: "var(--accent)", color: "#0e0e0f",
            fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <SparkleIcon /> Generate with answers
          </button>
        </div>
      )}

      {/* Upload status */}
      {uploadStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--accent)" }}>
          <SpinnerIcon />{uploadStatus}
        </div>
      )}

      {/* Clips indicator */}
      {clips.length > 0 && !isGenerating && (
        <div style={{ fontSize: 10.5, color: "var(--accent)", letterSpacing: "0.03em" }}>
          {clips.length} clip{clips.length > 1 ? "s" : ""} ready — editorial mode (gemini-2.5-pro analyzes footage)
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "7px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, color: "var(--error)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Agent trace (last run) */}
      {lastTrace.length > 0 && (
        <div>
          <button onClick={() => setShowTrace(t => !t)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, color: lastCluster ? CLUSTER_LABELS[lastCluster].color : "var(--accent)", letterSpacing: "0.08em", fontWeight: 700 }}>
              ▸ {lastCluster ? CLUSTER_LABELS[lastCluster].label.toUpperCase() : ""} PIPELINE
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{showTrace ? "▲ hide" : "▼ show trace"}</span>
          </button>
          {showTrace && (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
              {lastTrace.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 9.5, color: "var(--text-muted)", paddingLeft: 8, borderLeft: "1px solid var(--border-subtle)" }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600, minWidth: 120 }}>{step.stage}</span>
                  <span style={{ color: "var(--text-muted)", fontFamily: "monospace", minWidth: 130 }}>{step.model}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{step.decision}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{step.durationMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.03em" }}>
        <kbd style={{ background: "var(--bg-elevated)", padding: "1px 4px", borderRadius: 3, border: "1px solid var(--border)" }}>⌘ Enter</kbd>{" "}
        to generate ·{" "}
        <span style={{ color: clusterMeta.color }}>{clusterMeta.label}</span>{" "}
        <span style={{ color: "var(--text-muted)" }}>· {modeLabel} mode · {hasClips ? "gemini-2.5-pro" : "gemini-2.5-flash"}</span>
        {hasOverrides && <span style={{ color: "var(--accent)", marginLeft: 6 }}>· ✦ brand overrides active</span>}
      </div>

      {/* ── Prompt expansion modal ── */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(16px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "var(--bg-panel)", borderRadius: 16,
              border: "1px solid var(--border)",
              width: "min(740px, 92vw)", maxHeight: "85vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SparkleIcon />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.03em" }}>
                  Edit Prompt
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                  ⌘ Enter to generate
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Textarea column */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      setShowModal(false);
                      handleGenerate();
                    }
                    if (e.key === "Escape") setShowModal(false);
                  }}
                  placeholder="Describe your video in detail… e.g. '30-second luxury Instagram ad for Asaya featuring the new summer collection — slow cinematic reveals, warm tones, caption each scene with short punchy text, end with a clear CTA'"
                  style={{
                    flex: 1, background: "var(--bg-elevated)",
                    border: "1px solid var(--accent-dim)",
                    borderRadius: 10, padding: "14px 16px",
                    color: "var(--text-primary)", fontSize: 14,
                    lineHeight: 1.7, resize: "none", minHeight: 180,
                    outline: "none",
                  }}
                  autoFocus
                />
                {/* Format / duration row (mirrored inside modal) */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{ label: "9:16", sub: "Reels/TikTok" }, { label: "16:9", sub: "YouTube" }, { label: "1:1", sub: "Square" }].map((r) => (
                      <button key={r.label} onClick={() => { /* aspectRatio controlled externally — just a hint */ }} title={r.sub} style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                        border: "1px solid var(--border-subtle)", background: "var(--bg-panel)",
                        color: "var(--text-muted)", cursor: "default",
                      }}>{r.label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {prompt.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                  {prompt.trim().length > 0 && (
                    <button
                      onClick={() => setPrompt("")}
                      style={{ fontSize: 10, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "9px 18px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowModal(false); handleGenerate(); }}
                    disabled={!prompt.trim() || isGenerating}
                    style={{
                      padding: "9px 24px", borderRadius: 8, border: "none",
                      background: !prompt.trim() || isGenerating ? "var(--bg-elevated)" : "var(--accent)",
                      color: !prompt.trim() || isGenerating ? "var(--text-muted)" : "#0e0e0f",
                      fontSize: 13, fontWeight: 700, cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <SparkleIcon /> Generate
                  </button>
                </div>
              </div>

              {/* Example prompts sidebar */}
              <div style={{
                width: 230, borderLeft: "1px solid var(--border)",
                padding: "14px 12px", overflowY: "auto", flexShrink: 0,
                background: "var(--bg-base)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 10 }}>
                  EXAMPLE PROMPTS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Create a 20-second premium Instagram ad for Asaya with cinematic transitions and luxury captions",
                    "Make a 30-second product launch video for Asaya's new collection — slow reveal, warm tones",
                    "Generate a 15-second story ad with bold captions and fast-paced energetic feel for Asaya",
                    "60-second travel cinematic video for Asaya — morning ritual, calm aspirational, no voiceover",
                    "45-second UGC-style testimonial ad for Asaya skincare — warm tones, real-person feel, clear CTA",
                  ].map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      style={{
                        padding: "8px 10px", borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        background: prompt === ex ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: prompt === ex ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 11, cursor: "pointer", textAlign: "left",
                        lineHeight: 1.5, transition: "all 0.1s ease",
                      }}
                      onMouseEnter={(e) => { if (prompt !== ex) e.currentTarget.style.background = "var(--bg-panel)"; }}
                      onMouseLeave={(e) => { if (prompt !== ex) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Frame extraction helpers ──────────────────────────────────────────────────

async function extractVideoFrames(file: File, count: number, maxWidth: number): Promise<{ frames: string[]; timestamps: number[] }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration || 10;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
      canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
      canvas.height = Math.round((video.videoHeight || maxWidth * 0.5625) * scale);
      const ctx = canvas.getContext("2d")!;
      const frames: string[] = [];
      const timestamps: number[] = [];

      for (let i = 0; i < count; i++) {
        // Spread frames: 5% to 95% of duration
        const t = duration * (0.05 + (0.9 * i) / Math.max(count - 1, 1));
        await seekAndCapture(video, ctx, canvas, t);
        frames.push(canvas.toDataURL("image/jpeg", 0.65).split(",")[1]);
        timestamps.push(parseFloat(t.toFixed(2)));
      }

      URL.revokeObjectURL(objectUrl);
      resolve({ frames, timestamps });
    };

    video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Video load failed")); };
    video.src = objectUrl;
  });
}

function seekAndCapture(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  time: number,
): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

async function resizeImageToFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 640;
      const scale = Math.min(1, MAX / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
    </svg>
  );
}
