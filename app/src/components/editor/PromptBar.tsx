"use client";

import { useState, useEffect } from "react";
import type { Timeline } from "@/types/timeline";
import type { UploadedClip } from "@/types/clips";
import type { ClipAssignment, BrandOverrides } from "@/lib/gemini";
import type { ClarifyQuestion } from "@/app/api/lineup/clarify/route";
import type { AgentStep, WorkflowCluster } from "@/lib/agent-pipeline";

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
  onLineupGenerated: (
    timeline: Timeline,
    suggestions: unknown,
    isDemo: boolean,
    clipAssignments?: ClipAssignment[],
    evaluation?: EvaluationData | null
  ) => void;
  workspaceSlug: string;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  aspectRatio: string;
  onAspectRatioChange: (r: string) => void;
  clips?: UploadedClip[];
  brandOverrides?: BrandOverrides;
  // Metadata chips
  platform?: string;
  durationRange?: string;
  style?: string;
  onPlatformChange?: (v: string) => void;
  onDurationChange?: (v: string) => void;
  onStyleChange?: (v: string) => void;
}

const PLATFORMS = ["Instagram Reels", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];
const DURATIONS = ["5-15s", "15-30s", "30-60s", "1-2min", "Custom"];
const STYLES = ["Fun, Fast-Paced", "Cinematic", "Luxury", "Minimal", "Educational", "Documentary"];

export default function PromptBar({
  onLineupGenerated,
  workspaceSlug,
  isGenerating,
  setIsGenerating,
  aspectRatio,
  onAspectRatioChange,
  clips = [],
  brandOverrides,
  platform = "Instagram Reels",
  durationRange = "15-30s",
  style = "Fun, Fast-Paced",
  onPlatformChange,
  onDurationChange,
  onStyleChange,
}: PromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showClarify, setShowClarify] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);

  const [lastTrace, setLastTrace] = useState<AgentStep[]>([]);
  const [lastCluster, setLastCluster] = useState<WorkflowCluster | null>(null);

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<"platform" | "duration" | "style" | null>(null);

  useEffect(() => {
    if (!isGenerating) { setElapsedSec(0); return; }
    const id = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isGenerating]);

  async function handleClarify() {
    if (!prompt.trim() || isClarifying) return;
    setIsClarifying(true);
    setQuestions([]); setAnswers({});
    try {
      const res = await fetch("/api/lineup/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), hasClips: clips.length > 0, workspaceSlug }),
      });
      const data = await res.json() as { questions: ClarifyQuestion[] };
      if (data.questions?.length) { setQuestions(data.questions); setShowClarify(true); }
      else handleGenerate();
    } catch { handleGenerate(); }
    finally { setIsClarifying(false); }
  }

  function buildEnrichedPrompt(): string {
    const parts = questions.filter(q => answers[q.id]?.trim()).map(q => `${q.question}: ${answers[q.id].trim()}`);
    if (parts.length === 0) return prompt.trim();
    return `${prompt.trim()}\n\nAdditional context:\n${parts.join("\n")}`;
  }

  async function extractClipForAnalysis(clip: UploadedClip, index: number) {
    try {
      if (clip.type === "image") {
        const frame = await resizeImageToFrame(clip.file);
        return { frames: [frame], frameTimestamps: [0], mimeType: "image/jpeg", name: clip.name, duration: clip.duration, index };
      }
      const { frames, timestamps } = await extractVideoFrames(clip.file, 4, 360);
      return { frames, frameTimestamps: timestamps, mimeType: "image/jpeg", name: clip.name, duration: clip.duration, index };
    } catch { return null; }
  }

  async function handleGenerate(enrichedPromptOverride?: string) {
    if (!prompt.trim() || isGenerating) return;
    setError(null); setUploadStatus(null); setShowClarify(false);
    setIsGenerating(true); setLastTrace([]);
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
            workspaceSlug, aspectRatio,
            geminiClips: geminiClips.length > 0 ? geminiClips : undefined,
            brandOverrides: brandOverrides && Object.values(brandOverrides).some(Boolean) ? brandOverrides : undefined,
          }),
          signal: controller.signal,
        });
      } finally { clearTimeout(timeoutId); }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ? `${data.error ?? "Generation failed"}: ${data.message}` : (data.error ?? "Generation failed"));
      if (data.trace?.length) { setLastTrace(data.trace as AgentStep[]); setLastCluster(data.cluster as WorkflowCluster ?? null); }
      onLineupGenerated(data.lineup.timeline, data.lineup.suggestions, !!data.demo, data.clipAssignments ?? [], data.evaluation ?? null);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") setError("Generation timed out. Check your connection and try again.");
      else setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setIsGenerating(false); setUploadStatus(null); }
  }

  const closeDropdown = () => setOpenDropdown(null);

  return (
    <>
      {/* Inline compact prompt row - renders inside the top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%", flex: 1, minWidth: 0 }}>
        {/* Prompt input */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            onClick={() => setShowModal(true)}
            onFocus={e => { setShowModal(true); e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(124,58,237,0.3)"; }}
            onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
            readOnly
            placeholder="Click to write your prompt…  e.g. 'Make a fun reel showing how people eat Chicki Chicki'"
            style={{
              width: "100%", height: "100%",
              background: "transparent", border: "none",
              color: prompt ? "var(--text-primary)" : "rgba(136,136,168,0.6)",
              fontSize: 14, lineHeight: 1,
              padding: "0 14px 0 20px",
              cursor: "pointer", outline: "none",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              transition: "box-shadow 0.15s ease",
            }}
          />
          {prompt && (
            <button
              onClick={e => { e.stopPropagation(); setPrompt(""); }}
              style={{
                position: "absolute", right: 8,
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 3px",
              }}
            >×</button>
          )}
        </div>

        {/* Metadata chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 10px", flexShrink: 0 }}>
          {/* Platform chip */}
          <MetaChip
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" />
              </svg>
            }
            label={platform}
            isOpen={openDropdown === "platform"}
            onToggle={() => setOpenDropdown(openDropdown === "platform" ? null : "platform")}
          >
            {openDropdown === "platform" && (
              <Dropdown>
                {PLATFORMS.map(p => (
                  <DropdownItem key={p} label={p} active={platform === p}
                    onClick={() => { onPlatformChange?.(p); closeDropdown(); }} />
                ))}
              </Dropdown>
            )}
          </MetaChip>

          {/* Duration chip */}
          <MetaChip
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
            }
            label={durationRange}
            isOpen={openDropdown === "duration"}
            onToggle={() => setOpenDropdown(openDropdown === "duration" ? null : "duration")}
          >
            {openDropdown === "duration" && (
              <Dropdown>
                {DURATIONS.map(d => (
                  <DropdownItem key={d} label={d} active={durationRange === d}
                    onClick={() => { onDurationChange?.(d); closeDropdown(); }} />
                ))}
              </Dropdown>
            )}
          </MetaChip>

          {/* Style chip */}
          <MetaChip
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
              </svg>
            }
            label={style}
            isOpen={openDropdown === "style"}
            onToggle={() => setOpenDropdown(openDropdown === "style" ? null : "style")}
          >
            {openDropdown === "style" && (
              <Dropdown>
                {STYLES.map(s => (
                  <DropdownItem key={s} label={s} active={style === s}
                    onClick={() => { onStyleChange?.(s); closeDropdown(); }} />
                ))}
              </Dropdown>
            )}
          </MetaChip>
        </div>

        {/* AI Clarity button */}
        {prompt.trim().length >= 10 && (
          <button
            onClick={handleClarify}
            disabled={isClarifying || isGenerating}
            style={{
              padding: "7px 13px", borderRadius: 8,
              border: "1px solid rgba(124,58,237,0.25)",
              background: "rgba(124,58,237,0.08)",
              color: "#a78bfa", fontSize: 12, fontWeight: 500,
              cursor: isClarifying ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0, whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; e.currentTarget.style.background = "rgba(124,58,237,0.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.background = "rgba(124,58,237,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {isClarifying ? <SpinnerIcon /> : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
              </svg>
            )}
            AI Clarity
          </button>
        )}
      </div>

      {/* Prompt modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#0d0d22", borderRadius: 18,
              border: "1px solid rgba(124,58,237,0.25)",
              width: "min(740px, 92vw)", maxHeight: "85vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1), 0 0 40px rgba(124,58,237,0.08)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid rgba(124,58,237,0.15)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SparkleIcon />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Edit Prompt</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
                  ⌘ Enter to generate
                </span>
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 12 }}>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { setShowModal(false); handleGenerate(); }
                    if (e.key === "Escape") setShowModal(false);
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.55)"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(124,58,237,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.boxShadow = "none"; }}
                  placeholder="Describe your video in detail…"
                  style={{
                    flex: 1, background: "#13132a",
                    border: "1px solid rgba(124,58,237,0.25)", borderRadius: 10,
                    padding: "14px 16px", color: "var(--text-primary)",
                    fontSize: 14, lineHeight: 1.7, resize: "none", minHeight: 180, outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  autoFocus
                />

                {/* Clarifying questions */}
                {showClarify && questions.length > 0 && (
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent-dim)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em" }}>A FEW QUICK QUESTIONS</span>
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
                            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", color: "var(--text-primary)", fontSize: 12 }} />
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
                  </div>
                )}

                {/* Upload/error status */}
                {uploadStatus && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--accent)" }}>
                    <SpinnerIcon />{uploadStatus}
                  </div>
                )}
                {error && (
                  <div style={{ padding: "7px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, color: "var(--error)", fontSize: 12 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{prompt.trim().split(/\s+/).filter(Boolean).length} words</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowModal(false)}
                      style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      Cancel
                    </button>
                    {showClarify && questions.length > 0 ? (
                      <button onClick={() => handleGenerate(buildEnrichedPrompt())}
                        style={{
                          padding: "9px 24px", borderRadius: 9, border: "none",
                          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          boxShadow: "0 2px 14px rgba(124,58,237,0.4)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 22px rgba(124,58,237,0.55)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 14px rgba(124,58,237,0.4)"; }}
                      >
                        <SparkleIcon /> Generate with answers
                      </button>
                    ) : (
                      <button onClick={() => { setShowModal(false); handleGenerate(); }} disabled={!prompt.trim() || isGenerating}
                        style={{
                          padding: "9px 24px", borderRadius: 9, border: "none",
                          background: !prompt.trim() || isGenerating
                            ? "rgba(124,58,237,0.15)"
                            : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                          color: !prompt.trim() || isGenerating ? "#7c3aed" : "#fff",
                          fontSize: 13, fontWeight: 700,
                          cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          boxShadow: !prompt.trim() || isGenerating ? "none" : "0 2px 14px rgba(124,58,237,0.4)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={e => { if (prompt.trim() && !isGenerating) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 22px rgba(124,58,237,0.55)"; } }}
                        onMouseLeave={e => { if (prompt.trim() && !isGenerating) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 14px rgba(124,58,237,0.4)"; } }}
                      >
                        {isGenerating ? <><SpinnerIcon />{elapsedSec > 3 ? `${elapsedSec}s…` : "Generating…"}</> : <><SparkleIcon />Generate</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Example prompts sidebar */}
              <div style={{ width: 220, borderLeft: "1px solid rgba(124,58,237,0.15)", padding: "14px 12px", overflowY: "auto", flexShrink: 0, background: "#09091a" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 10 }}>EXAMPLE PROMPTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    "Create a 20-second premium Instagram ad for Asaya with cinematic transitions and luxury captions",
                    "Make a 30-second product launch video — slow reveal, warm tones, clear CTA",
                    "Generate a 15-second story ad with bold captions and fast-paced energetic feel",
                    "60-second travel cinematic — morning ritual, calm aspirational, no voiceover",
                    "45-second UGC-style testimonial — warm tones, real-person feel, clear CTA",
                  ].map((ex, i) => (
                    <button key={i} onClick={() => setPrompt(ex)}
                      style={{
                        padding: "8px 10px", borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        background: prompt === ex ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: prompt === ex ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 11, cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.1s ease",
                      }}
                      onMouseEnter={e => { if (prompt !== ex) e.currentTarget.style.background = "var(--bg-panel)"; }}
                      onMouseLeave={e => { if (prompt !== ex) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    >{ex}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── MetaChip: inline chip with optional dropdown ── */
function MetaChip({ icon, label, isOpen, onToggle, children }: {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 7,
          border: `1px solid ${isOpen ? "rgba(124,58,237,0.55)" : "rgba(124,58,237,0.18)"}`,
          background: isOpen ? "rgba(124,58,237,0.15)" : "rgba(13,13,34,0.8)",
          color: isOpen ? "#a78bfa" : "var(--text-secondary)",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          whiteSpace: "nowrap", transition: "all 0.15s ease",
          boxShadow: isOpen ? "0 0 8px rgba(124,58,237,0.2)" : "none",
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 8px rgba(124,58,237,0.15)"; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.borderColor = "rgba(124,58,237,0.18)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.boxShadow = "none"; } }}
      >
        {icon}
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {children}
    </div>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
      background: "#0d0d22", border: "1px solid rgba(124,58,237,0.25)",
      borderRadius: 10, padding: "6px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
      minWidth: 200, animation: "fadeIn 0.12s ease",
    }}>
      {children}
    </div>
  );
}

function DropdownItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "9px 14px", borderRadius: 7,
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        border: "none", fontSize: 15, fontWeight: active ? 600 : 400, cursor: "pointer",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >{label}</button>
  );
}

/* ── Icon helpers ── */
function SpinnerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-7.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-11.8 2.1 2.1m6.6 6.6 2.1 2.1" />
    </svg>
  );
}

/* ── Frame extraction helpers ── */
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
        const t = duration * (0.05 + (0.9 * i) / Math.max(count - 1, 1));
        await seekAndCapture(video, ctx, canvas, t);
        frames.push(canvas.toDataURL("image/jpeg", 0.5).split(",")[1]);
        timestamps.push(parseFloat(t.toFixed(2)));
      }
      URL.revokeObjectURL(objectUrl);
      resolve({ frames, timestamps });
    };
    video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Video load failed")); };
    video.src = objectUrl;
  });
}

function seekAndCapture(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number): Promise<void> {
  return new Promise(resolve => {
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
