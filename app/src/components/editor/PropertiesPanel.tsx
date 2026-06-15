"use client";

import { useState, useCallback } from "react";
import type { Scene, Timeline, CaptionLine } from "@/types/timeline";
import type { BrandWorkspace } from "@/types/brand";
import type { EvaluationData } from "./PromptBar";
import { v4 as uuidv4 } from "uuid";

interface PropertiesPanelProps {
  timeline: Timeline | null;
  activeSceneId: string | null;
  workspace: BrandWorkspace;
  suggestions: Record<string, unknown> | null;
  evaluation?: EvaluationData | null;
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
}

const TABS = ["Scene", "Analysis", "Brand", "Export"];

const TRANSITION_TYPES = [
  { value: "cut",           label: "Cut",      icon: "✂" },
  { value: "fade",          label: "Fade",     icon: "◑" },
  { value: "dissolve",      label: "Dissolve", icon: "⊕" },
  { value: "cinematic-fade",label: "Cinematic",icon: "◐" },
  { value: "wipe-left",     label: "Wipe ←",   icon: "◁" },
  { value: "wipe-right",    label: "Wipe →",   icon: "▷" },
  { value: "slide-left",    label: "Slide ←",  icon: "«" },
  { value: "slide-right",   label: "Slide →",  icon: "»" },
  { value: "zoom-in",       label: "Zoom In",  icon: "⊙" },
] as const;

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram:        { label: "Instagram",  color: "#e1306c" },
  youtube:          { label: "YouTube",    color: "#ff0000" },
  tiktok:           { label: "TikTok",     color: "#69c9d0" },
  "hook-score":     { label: "Hook",       color: "#f472b6" },
  "retention-score":{ label: "Retention",  color: "#a78bfa" },
  "cta-score":      { label: "CTA",        color: "#34d399" },
};

export default function PropertiesPanel({
  timeline,
  activeSceneId,
  workspace,
  suggestions,
  evaluation,
  onSceneUpdate,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState("Scene");

  const activeScene = timeline?.scenes?.find((s) => s.id === activeSceneId)
    ?? timeline?.scenes?.[0]
    ?? null;

  return (
    <div style={{
      width: 256,
      background: "var(--bg-panel)",
      borderLeft: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "9px 2px 8px",
              border: "none",
              background: "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 10.5,
              fontWeight: tab === t ? 600 : 400,
              cursor: "pointer",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 0.15s ease",
              position: "relative",
            }}
          >
            {t}
            {t === "Analysis" && evaluation?.overallScore != null && (
              <span style={{
                position: "absolute", top: 5, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: evaluation.overallScore >= 80 ? "#34d399" : evaluation.overallScore >= 60 ? "#fbbf24" : "#f87171",
              }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {tab === "Scene" && (
          <SceneProperties
            scene={activeScene}
            timeline={timeline}
            suggestions={suggestions}
            onSceneUpdate={onSceneUpdate}
          />
        )}
        {tab === "Analysis" && (
          <AnalysisTab evaluation={evaluation ?? null} />
        )}
        {tab === "Brand" && (
          <BrandProperties workspace={workspace} />
        )}
        {tab === "Export" && (
          <ExportProperties workspace={workspace} timeline={timeline} />
        )}
      </div>
    </div>
  );
}

// ─── Scene tab (editable) ────────────────────────────────────────────────────

function SceneProperties({
  scene,
  timeline,
  suggestions,
  onSceneUpdate,
}: {
  scene: Scene | null;
  timeline: Timeline | null;
  suggestions: Record<string, unknown> | null;
  onSceneUpdate?: (sceneId: string, patch: Partial<Scene>) => void;
}) {
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState<CaptionLine | null>(null);

  const startEditLabel = useCallback((s: Scene) => {
    setEditingLabelId(s.id);
    setLabelDraft(s.label);
  }, []);

  const saveLabel = useCallback(() => {
    if (!scene || !onSceneUpdate) return;
    onSceneUpdate(scene.id, { label: labelDraft });
    setEditingLabelId(null);
  }, [scene, labelDraft, onSceneUpdate]);

  const startEditCaption = useCallback((cap: CaptionLine) => {
    setEditingCaptionId(cap.id);
    setCaptionDraft({ ...cap });
  }, []);

  const saveCaption = useCallback(() => {
    if (!scene || !captionDraft || !onSceneUpdate) return;
    const updatedCaptions = (scene.captions ?? []).map((c) =>
      c.id === captionDraft.id ? captionDraft : c
    );
    onSceneUpdate(scene.id, { captions: updatedCaptions });
    setEditingCaptionId(null);
    setCaptionDraft(null);
  }, [scene, captionDraft, onSceneUpdate]);

  const deleteCaption = useCallback((capId: string) => {
    if (!scene || !onSceneUpdate) return;
    onSceneUpdate(scene.id, { captions: (scene.captions ?? []).filter((c) => c.id !== capId) });
  }, [scene, onSceneUpdate]);

  const addCaption = useCallback(() => {
    if (!scene || !onSceneUpdate) return;
    const newCap: CaptionLine = {
      id: uuidv4(),
      text: "New caption",
      startTime: 0,
      endTime: scene.duration,
      style: "brand-default",
    };
    onSceneUpdate(scene.id, { captions: [...(scene.captions ?? []), newCap] });
    setEditingCaptionId(newCap.id);
    setCaptionDraft(newCap);
  }, [scene, onSceneUpdate]);

  const setTransitionType = useCallback((type: string) => {
    if (!scene || !onSceneUpdate) return;
    const dur = type === "cut" ? 0 : (scene.transition?.duration ?? 0.5);
    onSceneUpdate(scene.id, {
      transition: { type: type as import("@/types/timeline").TransitionType, duration: dur },
    });
  }, [scene, onSceneUpdate]);

  const setTransitionDuration = useCallback((dur: number) => {
    if (!scene || !onSceneUpdate) return;
    onSceneUpdate(scene.id, {
      transition: { type: scene.transition?.type ?? "fade" as import("@/types/timeline").TransitionType, duration: dur },
    });
  }, [scene, onSceneUpdate]);

  if (!timeline) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: 20, lineHeight: 1.6 }}>
        Generate a lineup to see scene properties
      </div>
    );
  }

  if (!scene) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Scene header — editable */}
      <div>
        {editingLabelId === scene.id ? (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditingLabelId(null); }}
              autoFocus
              style={{
                flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--accent-dim)",
                borderRadius: 5, padding: "4px 7px", color: "var(--text-primary)",
                fontSize: 13, fontWeight: 600,
              }}
            />
            <button onClick={saveLabel} style={actionBtnStyle("#34d399")}>✓</button>
            <button onClick={() => setEditingLabelId(null)} style={actionBtnStyle("var(--text-muted)")}>✕</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
              {scene.label}
            </div>
            {onSceneUpdate && (
              <button onClick={() => startEditLabel(scene)} style={{ ...iconBtnStyle, fontSize: 11 }} title="Edit label">✎</button>
            )}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 3 }}>
          {scene.description}
        </div>
      </div>

      <Divider />

      {/* Scene stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        <StatBlock label="Duration" value={`${scene.duration}s`} />
        <StatBlock label="Scene" value={`${(scene.order ?? 0) + 1} / ${timeline.scenes?.length ?? 0}`} />
        <StatBlock label="Mood" value={scene.mood ?? "—"} accent />
        <StatBlock label="Motion" value={scene.motionStyle ?? "—"} />
      </div>

      <Divider />

      {/* Transition picker */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <SectionLabel>TRANSITION (clip end)</SectionLabel>
          <span style={{ fontSize: 9.5, color: "var(--accent)", fontWeight: 600 }}>
            {scene.transition?.type ?? "cut"}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {TRANSITION_TYPES.map((t) => {
            const isActive = (scene.transition?.type ?? "cut") === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTransitionType(t.value)}
                title={t.label}
                style={{
                  padding: "4px 7px", borderRadius: 5, fontSize: 10, cursor: "pointer",
                  border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: isActive ? "var(--accent-bg)" : "var(--bg-elevated)",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.12s ease",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: 11 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Duration slider — only shown for non-cut transitions */}
        {scene.transition?.type && scene.transition.type !== "cut" && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Duration</span>
              <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {(scene.transition.duration ?? 0.5).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min={0.1} max={2.0} step={0.1}
              value={scene.transition.duration ?? 0.5}
              onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
              <span>0.1s</span>
              <span>2.0s</span>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Captions — editable */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <SectionLabel>CAPTIONS ({scene.captions?.length ?? 0})</SectionLabel>
          {onSceneUpdate && (
            <button onClick={addCaption} style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add</button>
          )}
        </div>

        {(scene.captions?.length ?? 0) === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No captions for this scene</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(scene.captions ?? []).map((cap) => (
              <div key={cap.id}>
                {editingCaptionId === cap.id && captionDraft ? (
                  <div style={{
                    padding: "8px 9px", borderRadius: 6,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--accent-dim)",
                    display: "flex", flexDirection: "column", gap: 6,
                  }}>
                    <textarea
                      value={captionDraft.text}
                      onChange={(e) => setCaptionDraft((d) => d ? { ...d, text: e.target.value } : d)}
                      rows={2}
                      style={{
                        background: "var(--bg-panel)", border: "1px solid var(--border)",
                        borderRadius: 4, padding: "5px 7px", color: "var(--text-primary)",
                        fontSize: 12, resize: "none", lineHeight: 1.4, fontFamily: "serif",
                      }}
                    />
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Start</span>
                      <input
                        type="number" step={0.1} min={0}
                        value={captionDraft.startTime}
                        onChange={(e) => setCaptionDraft((d) => d ? { ...d, startTime: parseFloat(e.target.value) } : d)}
                        style={{ width: 52, ...timeInputStyle }}
                      />
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>End</span>
                      <input
                        type="number" step={0.1} min={0}
                        value={captionDraft.endTime}
                        onChange={(e) => setCaptionDraft((d) => d ? { ...d, endTime: parseFloat(e.target.value) } : d)}
                        style={{ width: 52, ...timeInputStyle }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {(["brand-default", "highlight", "subtle", "bold"] as CaptionLine["style"][]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setCaptionDraft((d) => d ? { ...d, style: s } : d)}
                          style={{
                            padding: "2px 6px", borderRadius: 3, fontSize: 9, cursor: "pointer",
                            border: captionDraft.style === s ? "1px solid var(--accent)" : "1px solid var(--border)",
                            background: captionDraft.style === s ? "var(--accent-bg)" : "transparent",
                            color: captionDraft.style === s ? "var(--accent)" : "var(--text-muted)",
                          }}
                        >{s}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                      <button onClick={() => { setEditingCaptionId(null); setCaptionDraft(null); }} style={actionBtnStyle("var(--text-muted)")}>Cancel</button>
                      <button onClick={saveCaption} style={actionBtnStyle("#34d399")}>Save</button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: "7px 9px", borderRadius: 5,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex", flexDirection: "column", gap: 3,
                  }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, fontFamily: "serif" }}>
                      "{cap.text}"
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{cap.startTime}s → {cap.endTime}s</span>
                      {cap.style && <span style={{ fontSize: 9, color: "var(--accent)", background: "var(--accent-bg)", padding: "1px 5px", borderRadius: 3 }}>{cap.style}</span>}
                      {onSceneUpdate && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                          <button onClick={() => startEditCaption(cap)} style={{ ...iconBtnStyle, fontSize: 11 }} title="Edit">✎</button>
                          <button onClick={() => deleteCaption(cap.id)} style={{ ...iconBtnStyle, fontSize: 11, color: "#f87171" }} title="Delete">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI suggestions */}
      {suggestions && (
        <>
          <Divider />
          <div>
            <SectionLabel>AI NOTES</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {(suggestions.transitionRationale as string) && (
                <AINote label="Transitions" text={suggestions.transitionRationale as string} />
              )}
              {(suggestions.captionTiming as string) && (
                <AINote label="Caption timing" text={suggestions.captionTiming as string} />
              )}
              {(suggestions.brandNotes as string) && (
                <AINote label="Brand" text={suggestions.brandNotes as string} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Analysis tab (Google Ads-style) ─────────────────────────────────────────

function AnalysisTab({ evaluation }: { evaluation: EvaluationData | null }) {
  if (!evaluation) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: 24, lineHeight: 1.7 }}>
        Generate a video to see analysis scores
      </div>
    );
  }

  const scoreColor = evaluation.overallScore >= 80 ? "#34d399" : evaluation.overallScore >= 60 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Overall score */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 58, height: 58, borderRadius: "50%",
          border: `3px solid ${scoreColor}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          flexShrink: 0, background: `${scoreColor}12`,
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {evaluation.overallScore}
          </span>
          <span style={{ fontSize: 8.5, color: "var(--text-muted)", marginTop: 1 }}>/100</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
            {evaluation.overallScore >= 80 ? "Excellent" : evaluation.overallScore >= 60 ? "Good" : "Needs Work"}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {evaluation.passedQA ? "Passed QA check" : "Did not pass QA"} ·{" "}
            {evaluation.criteriaScores.length} criteria scored
          </div>
        </div>
      </div>

      <Divider />

      {/* Platform scores */}
      {evaluation.platformScores.length > 0 && (
        <div>
          <SectionLabel>PLATFORM SCORES</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {evaluation.platformScores.map((ps) => {
              const meta = PLATFORM_META[ps.platform] ?? { label: ps.platform, color: "var(--accent)" };
              const barColor = ps.score >= 80 ? meta.color : ps.score >= 60 ? "#fbbf24" : "#f87171";
              return (
                <div key={ps.platform}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>
                      {ps.score}
                    </span>
                  </div>
                  <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${ps.score}%`,
                      background: barColor,
                      borderRadius: 3,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                    {ps.insight}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Issues */}
      {evaluation.issues.length > 0 && (
        <>
          <Divider />
          <div>
            <SectionLabel>ISSUES</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {evaluation.issues.map((issue, i) => (
                <div key={i} style={{
                  display: "flex", gap: 7, alignItems: "flex-start",
                  padding: "6px 8px", borderRadius: 5,
                  background: "rgba(248,113,113,0.07)",
                  border: "1px solid rgba(248,113,113,0.18)",
                }}>
                  <span style={{ color: "#f87171", marginTop: 1, flexShrink: 0 }}>✕</span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Improvements */}
      {evaluation.improvements.length > 0 && (
        <>
          <Divider />
          <div>
            <SectionLabel>IMPROVEMENTS</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {evaluation.improvements.map((imp, i) => (
                <div key={i} style={{
                  display: "flex", gap: 7, alignItems: "flex-start",
                  padding: "6px 8px", borderRadius: 5,
                  background: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.18)",
                }}>
                  <span style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }}>↑</span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Compliments */}
      {evaluation.compliments.length > 0 && (
        <>
          <Divider />
          <div>
            <SectionLabel>STRENGTHS</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {evaluation.compliments.map((comp, i) => (
                <div key={i} style={{
                  display: "flex", gap: 7, alignItems: "flex-start",
                  padding: "6px 8px", borderRadius: 5,
                  background: "rgba(52,211,153,0.07)",
                  border: "1px solid rgba(52,211,153,0.18)",
                }}>
                  <span style={{ color: "#34d399", marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{comp}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Criteria scores */}
      {evaluation.criteriaScores.length > 0 && (
        <>
          <Divider />
          <div>
            <SectionLabel>CRITERIA BREAKDOWN</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {evaluation.criteriaScores.map((cs) => (
                <div key={cs.criterion}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {cs.criterion.replace(/-/g, " ")}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: cs.score >= 80 ? "#34d399" : cs.score >= 60 ? "#fbbf24" : "#f87171",
                    }}>{cs.score}</span>
                  </div>
                  <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${cs.score}%`,
                      background: cs.score >= 80 ? "#34d399" : cs.score >= 60 ? "#fbbf24" : "#f87171",
                      borderRadius: 2,
                    }} />
                  </div>
                  {cs.notes && (
                    <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{cs.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Brand tab ────────────────────────────────────────────────────────────────

function BrandProperties({ workspace }: { workspace: BrandWorkspace }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em" }}>
          {workspace.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>Brand workspace</div>
      </div>
      <Divider />
      <SectionLabel>COLOR PALETTE</SectionLabel>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(workspace.colors).map(([key, value]) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: value, border: "1px solid var(--border)" }} />
            <div style={{ fontSize: 8.5, color: "var(--text-muted)", textAlign: "center" }}>{key}</div>
          </div>
        ))}
      </div>
      <Divider />
      <SectionLabel>TYPOGRAPHY</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Object.entries(workspace.fonts).map(([role, font]) => (
          <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "capitalize" }}>{role}</span>
            <span style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>{font.family}</span>
          </div>
        ))}
      </div>
      <Divider />
      <SectionLabel>COLOR GRADE</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>{workspace.colorGrade.name}</div>
        {([
          ["Warmth", workspace.colorGrade.warmth],
          ["Contrast", workspace.colorGrade.contrast],
          ["Saturation", workspace.colorGrade.saturation],
          ["Vignette", workspace.colorGrade.vignette],
        ] as [string, number][]).map(([label, value]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", width: 60 }}>{label}</span>
            <div style={{ flex: 1, height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${Math.abs(value) * 100}%`,
                background: value >= 0 ? "var(--accent)" : "var(--error)", borderRadius: 2,
              }} />
            </div>
            <span style={{ fontSize: 9.5, color: "var(--text-muted)", width: 30, textAlign: "right" }}>
              {value > 0 ? "+" : ""}{value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <Divider />
      <SectionLabel>STYLE KEYWORDS</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {workspace.styleKeywords.map((kw) => (
          <span key={kw} style={{ padding: "2px 7px", borderRadius: 3, background: "var(--accent-bg)", color: "var(--accent)", fontSize: 10, fontWeight: 500 }}>
            {kw}
          </span>
        ))}
      </div>
      {workspace.lockedSettings && workspace.lockedSettings.length > 0 && (
        <>
          <Divider />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 5, background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.15)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span style={{ fontSize: 10, color: "var(--accent)" }}>{workspace.lockedSettings.join(", ")} locked</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Export tab ───────────────────────────────────────────────────────────────

function ExportProperties({ workspace, timeline }: { workspace: BrandWorkspace; timeline: Timeline | null }) {
  const exp = workspace.exportDefaults;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionLabel>EXPORT SETTINGS</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          ["Resolution", exp.resolution],
          ["FPS", String(exp.fps)],
          ["Codec", exp.codec.toUpperCase()],
          ["Bitrate", exp.bitrate],
          ["Format", exp.format.toUpperCase()],
          ["Audio", `${exp.audioCodec.toUpperCase()} ${exp.audioBitrate}`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderRadius: 5, background: "var(--bg-elevated)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
      {timeline && (
        <>
          <Divider />
          <SectionLabel>OUTPUT ESTIMATE</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <StatBlock label="Duration" value={`${timeline.totalDuration}s`} />
            <StatBlock label="Scenes" value={String(timeline.scenes?.length ?? 0)} />
            <StatBlock label="Est. Size" value="~42MB" />
            <StatBlock label="Platform" value={timeline.targetPlatform ?? "generic"} accent />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AINote({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 10, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}{" "}
      </span>
      {text}
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: "7px 8px", borderRadius: 5, background: "var(--bg-elevated)" }}>
      <div style={{ fontSize: 9.5, color: "var(--text-muted)", letterSpacing: "0.04em", marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text-primary)", textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border-subtle)" }} />;
}

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  color: "var(--text-muted)", padding: "1px 4px", borderRadius: 3,
  lineHeight: 1, transition: "color 0.12s ease",
};

const timeInputStyle: React.CSSProperties = {
  background: "var(--bg-panel)", border: "1px solid var(--border)",
  borderRadius: 4, padding: "3px 5px", color: "var(--text-primary)",
  fontSize: 11, textAlign: "center",
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    padding: "3px 8px", borderRadius: 4, border: `1px solid ${color}20`,
    background: `${color}12`, color, fontSize: 11, fontWeight: 600, cursor: "pointer",
  };
}
