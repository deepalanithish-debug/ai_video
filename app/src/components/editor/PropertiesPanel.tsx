"use client";

import type { Timeline } from "@/types/timeline";
import type { BrandWorkspace } from "@/types/brand";
import type { EvaluationData } from "./PromptBar";

interface PropertiesPanelProps {
  timeline: Timeline | null;
  activeSceneId: string | null;
  workspace: BrandWorkspace;
  suggestions: Record<string, unknown> | null;
  evaluation?: EvaluationData | null;
  onSceneUpdate?: (sceneId: string, patch: Partial<import("@/types/timeline").Scene>) => void;
  clips?: import("@/types/clips").UploadedClip[];
}

export default function PropertiesPanel({
  timeline, evaluation, suggestions,
}: PropertiesPanelProps) {
  return (
    <div style={{
      width: 290, background: "#09091a", borderLeft: "1px solid rgba(124,58,237,0.2)",
      display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid rgba(124,58,237,0.15)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.08em" }}>
          ANALYSIS
        </span>
        {evaluation && (
          <ScoreBadge score={evaluation.overallScore} passed={evaluation.passedQA} />
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {!timeline && !evaluation && <EmptyState />}
        {(timeline || evaluation) && (
          <AnalysisContent evaluation={evaluation ?? null} timeline={timeline} suggestions={suggestions} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: 240, gap: 12, textAlign: "center",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 5 }}>
          No analysis yet
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Generate a video to see quality scores and suggestions.
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score, passed }: { score: number; passed: boolean }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}/100</span>
      <span style={{ fontSize: 10, color, opacity: 0.7 }}>{passed ? "✓" : "✗"}</span>
    </div>
  );
}

function AnalysisContent({ evaluation, timeline, suggestions }: {
  evaluation: EvaluationData | null;
  timeline: Timeline | null;
  suggestions: Record<string, unknown> | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {evaluation ? <ScoreRing evaluation={evaluation} /> : <TimelineStats timeline={timeline} />}

      {evaluation && evaluation.platformScores.length > 0 && (
        <Section title="Platforms">
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {evaluation.platformScores.map(ps => (
              <PlatformBar key={ps.platform} platform={ps.platform} score={ps.score} insight={ps.insight} />
            ))}
          </div>
        </Section>
      )}

      {evaluation && evaluation.criteriaScores.length > 0 && (
        <Section title="Quality Criteria">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {evaluation.criteriaScores.map(cs => (
              <CriteriaRow key={cs.criterion} criterion={cs.criterion} score={cs.score} rating={cs.rating} notes={cs.notes} />
            ))}
          </div>
        </Section>
      )}

      {evaluation && evaluation.improvements.length > 0 && (
        <Section title="Improvements" accent="#fbbf24">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {evaluation.improvements.map((imp, i) => <FeedbackItem key={i} text={imp} type="improvement" />)}
          </div>
        </Section>
      )}

      {evaluation && evaluation.issues.length > 0 && (
        <Section title="Issues" accent="#f87171">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {evaluation.issues.map((iss, i) => <FeedbackItem key={i} text={iss} type="issue" />)}
          </div>
        </Section>
      )}

      {evaluation && evaluation.compliments.length > 0 && (
        <Section title="What Works" accent="#34d399">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {evaluation.compliments.map((c, i) => <FeedbackItem key={i} text={c} type="compliment" />)}
          </div>
        </Section>
      )}

      {suggestions && Boolean(suggestions.transitionRationale || suggestions.captionNotes) && (
        <Section title="AI Notes">
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(suggestions.transitionRationale as string) && (
              <NoteCard label="Transitions" text={suggestions.transitionRationale as string} />
            )}
            {(suggestions.captionNotes as string) && (
              <NoteCard label="Captions" text={suggestions.captionNotes as string} />
            )}
            {(suggestions.paceNotes as string) && (
              <NoteCard label="Pacing" text={suggestions.paceNotes as string} />
            )}
          </div>
        </Section>
      )}

      {!evaluation && timeline && (
        <div style={{
          padding: "12px", borderRadius: 8,
          background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.18)",
          fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, textAlign: "center",
        }}>
          Regenerate with AI Clarity for full quality analysis.
        </div>
      )}
    </div>
  );
}

function ScoreRing({ evaluation }: { evaluation: EvaluationData }) {
  const score = evaluation.overallScore;
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  const r = 30; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1e1e3a" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
            strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>/100</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{label}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 20,
          background: evaluation.passedQA ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          border: `1px solid ${evaluation.passedQA ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
          fontSize: 10, fontWeight: 600,
          color: evaluation.passedQA ? "#34d399" : "#f87171",
          marginBottom: 6,
        }}>
          {evaluation.passedQA ? "✓ Passed QA" : "✗ Failed QA"}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
          {evaluation.passedQA ? "Ready to publish." : "Review issues below."}
        </div>
      </div>
    </div>
  );
}

function TimelineStats({ timeline }: { timeline: Timeline | null }) {
  if (!timeline) return null;
  const items = [
    { label: "Duration", value: `${timeline.totalDuration}s` },
    { label: "Scenes", value: String(timeline.scenes?.length ?? 0) },
    { label: "Ratio", value: timeline.aspectRatio ?? "—" },
    { label: "Platform", value: timeline.targetPlatform ?? "generic" },
  ];
  return (
    <div>
      <SectionTitle title="Timeline" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
        {items.map(({ label, value }) => (
          <div key={label} style={{ padding: "7px 10px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.12)" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3, letterSpacing: "0.04em" }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformBar({ platform, score, insight }: { platform: string; score: number; insight: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize", fontWeight: 500 }}>{platform}</span>
        <span style={{ fontSize: 11, fontWeight: 700, background: "linear-gradient(90deg, #a78bfa, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{score}</span>
      </div>
      <div style={{ height: 5, background: "#1e1e3a", borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
        <div style={{ height: "100%", width: `${score}%`, background: "linear-gradient(90deg, #7c3aed, #06b6d4)", borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
      {insight && <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{insight}</div>}
    </div>
  );
}

function CriteriaRow({ criterion, score, rating, notes }: { criterion: string; score: number; rating: string; notes: string }) {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ padding: "7px 10px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{criterion}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color, background: `${color}18`, padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>{rating}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}</span>
        </div>
      </div>
      {notes && <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>{notes}</div>}
    </div>
  );
}

function FeedbackItem({ text, type }: { text: string; type: "improvement" | "issue" | "compliment" }) {
  const colors = { improvement: "#fbbf24", issue: "#f87171", compliment: "#34d399" };
  const icons = { improvement: "↑", issue: "!", compliment: "✓" };
  const color = colors[type];
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "flex-start",
      padding: "7px 10px 7px 12px", borderRadius: 7,
      background: "rgba(255,255,255,0.02)",
      borderLeft: `3px solid ${color}`,
      border: `1px solid rgba(255,255,255,0.04)`,
      borderLeftColor: color,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color,
      }}>{icons[type]}</div>
      <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, paddingTop: 1 }}>{text}</span>
    </div>
  );
}

function NoteCard({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 7,
      background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.07em", marginBottom: 3 }}>
        {label.toUpperCase()}
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionTitle title={title} accent={accent} />
      <div style={{ marginTop: 9 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ title, accent }: { title: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 2.5, height: 12, borderRadius: 2, background: accent ?? "#7c3aed", flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
        {title.toUpperCase()}
      </span>
    </div>
  );
}
