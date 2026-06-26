"use client";

import { useState } from "react";
import { useEditorStore, type AspectRatio, type Mood } from "@/store/editorStore";

const ASPECT_RATIOS: AspectRatio[] = ["9:16", "16:9", "1:1", "4:5", "3:4"];
const MOODS: Mood[] = ["luxury", "energetic", "calm", "dramatic", "playful"];
const MOOD_COLORS: Record<Mood, string> = {
  luxury: "#C9A96E", energetic: "#F87171", calm: "#60A5FA",
  dramatic: "#A78BFA", playful: "#34D399", neutral: "#94A3B8",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", background: "none", border: "none", cursor: "pointer",
        color: "var(--text-muted)",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && <div style={{ padding: "0 12px 12px" }}>{children}</div>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1, unit = "" }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            flex: 1, background: "var(--bg-inset)", border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)", padding: "4px 8px",
            fontSize: 12, color: "var(--text-primary)", textAlign: "right",
          }} />
        {unit && <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function InspectorPanel() {
  const {
    scenes, activeSceneId, aspectRatio,
    setAspectRatio, updateScene, removeScene, addScene,
  } = useEditorStore();

  const activeScene = scenes.find(s => s.id === activeSceneId);

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: "var(--bg-surface)", borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 12px 8px",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Inspector
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Project settings */}
        <Section title="Project">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Aspect Ratio</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {ASPECT_RATIOS.map(ar => (
                  <button key={ar} onClick={() => setAspectRatio(ar)} style={{
                    padding: "5px 8px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 600,
                    background: aspectRatio === ar ? "var(--accent-bg)" : "var(--bg-elevated)",
                    border: `1px solid ${aspectRatio === ar ? "var(--accent-dim)" : "var(--border)"}`,
                    color: aspectRatio === ar ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{ar}</span>
                    {ar === "9:16" && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Reels</span>}
                    {ar === "16:9" && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>YouTube</span>}
                    {ar === "1:1" && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Post</span>}
                    {ar === "4:5" && <span style={{ fontSize: 8, color: "var(--text-muted)" }}>Feed</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Scene inspector */}
        {activeScene ? (
          <>
            <Section title={`Scene: ${activeScene.label}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Label */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Label</label>
                  <input value={activeScene.label}
                    onChange={e => updateScene(activeScene.id, { label: e.target.value })}
                    style={{
                      width: "100%", marginTop: 4, background: "var(--bg-inset)", border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)", padding: "5px 8px",
                      fontSize: 12, color: "var(--text-primary)",
                    }} />
                </div>
                {/* Duration */}
                <NumberInput label="Duration" value={activeScene.duration} unit="s" min={0.5} max={60} step={0.5}
                  onChange={v => updateScene(activeScene.id, { duration: v })} />
                {/* Description */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
                  <textarea value={activeScene.description} rows={2}
                    onChange={e => updateScene(activeScene.id, { description: e.target.value })}
                    style={{
                      width: "100%", marginTop: 4, background: "var(--bg-inset)", border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)", padding: "5px 8px",
                      fontSize: 11, color: "var(--text-secondary)", resize: "vertical",
                    }} />
                </div>
              </div>
            </Section>

            <Section title="Mood">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {MOODS.map(m => (
                  <button key={m} onClick={() => updateScene(activeScene.id, { mood: m })} style={{
                    padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", textTransform: "capitalize",
                    background: activeScene.mood === m
                      ? `color-mix(in srgb, ${MOOD_COLORS[m]} 20%, transparent)`
                      : "var(--bg-elevated)",
                    border: `1px solid ${activeScene.mood === m ? MOOD_COLORS[m] + "60" : "var(--border)"}`,
                    color: activeScene.mood === m ? MOOD_COLORS[m] : "var(--text-muted)",
                  }}>
                    {m}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <button onClick={() => addScene(activeScene.id)} style={{
                  padding: "6px 8px", borderRadius: "var(--r-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add Scene After
                </button>
                <button onClick={() => removeScene(activeScene.id)} style={{
                  padding: "6px 8px", borderRadius: "var(--r-sm)",
                  background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.2)",
                  color: "var(--error)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  </svg>
                  Delete Scene
                </button>
              </div>
            </Section>
          </>
        ) : (
          <div style={{ padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "var(--text-disabled)" }}>Click a scene to inspect</div>
          </div>
        )}
      </div>
    </div>
  );
}
