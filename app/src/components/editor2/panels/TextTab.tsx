"use client";

import { useEditorStore, type Caption } from "@/store/editorStore";

const FONTS = ["Inter", "Georgia", "Playfair Display", "Bebas Neue", "Montserrat", "Cormorant Garamond", "DM Serif Display", "Space Grotesk", "Libre Baskerville"];
const ANIMATIONS = ["none", "fade", "slide-up", "slide-down", "typewriter"] as const;
const ANIMATION_LABELS: Record<string, string> = { none: "None", fade: "Fade", "slide-up": "↑ Slide Up", "slide-down": "↓ Slide Down", typewriter: "Typewriter" };

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "var(--r-sm)",
        background: value, border: "1.5px solid var(--border-strong)",
        cursor: "pointer", overflow: "hidden",
      }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ position: "absolute", inset: "-4px", width: "calc(100%+8px)", height: "calc(100%+8px)", opacity: 0, cursor: "pointer" }} />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

export default function TextTab() {
  const { scenes, activeSceneId, addCaption, updateCaption, removeCaption, setInspectorTarget } = useEditorStore();
  const scene = scenes.find(s => s.id === activeSceneId) ?? scenes[0];

  if (!scene) return (
    <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
      Select a scene to add captions.
    </div>
  );

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Add caption button */}
      <button
        onClick={() => addCaption(scene.id)}
        style={{
          width: "100%", padding: "9px 0", borderRadius: "var(--r-md)",
          background: "var(--accent)", color: "#FFFFFF",
          border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Add Caption
      </button>

      {/* Caption list */}
      {scene.captions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: "var(--text-disabled)" }}>
          No captions in this scene
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scene.captions.map(cap => (
            <CaptionEditor
              key={cap.id} caption={cap} sceneId={scene.id}
              onUpdate={(patch) => updateCaption(scene.id, cap.id, patch)}
              onRemove={() => removeCaption(scene.id, cap.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaptionEditor({ caption, sceneId, onUpdate, onRemove }: {
  caption: Caption; sceneId: string;
  onUpdate: (patch: Partial<Caption>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: "var(--r-md)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "7px 10px",
        borderBottom: expanded ? "1px solid var(--border)" : "none",
        cursor: "pointer",
      }} onClick={() => setExpanded(!expanded)}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"
          style={{ marginRight: 6, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption.text.slice(0, 24) || "Caption"}
        </span>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 2, display: "flex",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Text */}
          <textarea
            value={caption.text}
            onChange={e => onUpdate({ text: e.target.value })}
            rows={2}
            style={{
              width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)", padding: "6px 8px",
              fontSize: 12, color: "var(--text-primary)", fontFamily: caption.fontFamily,
              resize: "vertical",
            }}
          />

          {/* Font */}
          <Row label="Font">
            <select
              value={caption.fontFamily}
              onChange={e => onUpdate({ fontFamily: e.target.value })}
              style={{
                background: "var(--bg-inset)", border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)", padding: "5px 8px",
                fontSize: 12, color: "var(--text-primary)", width: "100%",
              }}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>

          {/* Size + alignment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Row label="Size">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="range" min="12" max="80" value={caption.fontSize}
                  onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--accent)" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", width: 24, textAlign: "right" }}>{caption.fontSize}</span>
              </div>
            </Row>
            <Row label="Align">
              <div style={{ display: "flex", gap: 3 }}>
                {(["left", "center", "right"] as const).map(a => (
                  <button key={a} onClick={() => onUpdate({ align: a })} style={{
                    flex: 1, height: 26, borderRadius: "var(--r-xs)",
                    background: caption.align === a ? "var(--accent-bg)" : "var(--bg-inset)",
                    border: `1px solid ${caption.align === a ? "var(--accent-dim)" : "var(--border)"}`,
                    color: caption.align === a ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {a === "left" && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></>}
                      {a === "center" && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>}
                      {a === "right" && <><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></>}
                    </svg>
                  </button>
                ))}
              </div>
            </Row>
          </div>

          {/* Colors */}
          <Row label="Colors">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Text</span>
                <ColorSwatch value={caption.color} onChange={v => onUpdate({ color: v })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>BG</span>
                <ColorSwatch value={caption.bgColor} onChange={v => onUpdate({ bgColor: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <input type="range" min="0" max="1" step="0.05" value={caption.bgOpacity}
                  onChange={e => onUpdate({ bgOpacity: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--accent)" }} />
              </div>
            </div>
          </Row>

          {/* Bold / Italic / Shadow / Stroke */}
          <Row label="Style">
            <div style={{ display: "flex", gap: 4 }}>
              {([
                { key: "bold", label: "B", style: { fontWeight: 700 } },
                { key: "italic", label: "I", style: { fontStyle: "italic" } },
                { key: "shadow", label: "✦", style: {} },
                { key: "stroke", label: "O", style: { WebkitTextStroke: "1px currentColor", color: "transparent" } },
              ] as { key: keyof Caption; label: string; style: React.CSSProperties }[]).map(({ key, label, style }) => (
                <button key={key} onClick={() => onUpdate({ [key]: !(caption[key]) })} style={{
                  width: 28, height: 26, borderRadius: "var(--r-xs)",
                  background: caption[key] ? "var(--accent-bg)" : "var(--bg-inset)",
                  border: `1px solid ${caption[key] ? "var(--accent-dim)" : "var(--border)"}`,
                  color: caption[key] ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: 11, fontFamily: "var(--font-sans)", ...style,
                }}>
                  {label}
                </button>
              ))}
            </div>
          </Row>

          {/* Animation */}
          <Row label="Animation">
            <select value={caption.animation} onChange={e => onUpdate({ animation: e.target.value as Caption["animation"] })}
              style={{
                background: "var(--bg-inset)", border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)", padding: "5px 8px",
                fontSize: 11, color: "var(--text-primary)", width: "100%",
              }}>
              {ANIMATIONS.map(a => <option key={a} value={a}>{ANIMATION_LABELS[a]}</option>)}
            </select>
          </Row>

          {/* Timing */}
          <Row label="Timing">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Start", "startTime"], ["End", "endTime"]].map(([label, key]) => (
                <div key={key}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
                  <input type="number" step="0.1" min="0"
                    value={caption[key as keyof Caption] as number}
                    onChange={e => onUpdate({ [key]: Number(e.target.value) })}
                    style={{
                      width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
                      borderRadius: "var(--r-xs)", padding: "4px 6px",
                      fontSize: 11, color: "var(--text-primary)",
                    }} />
                </div>
              ))}
            </div>
          </Row>
        </div>
      )}
    </div>
  );
}

// Need useState import
import { useState } from "react";
