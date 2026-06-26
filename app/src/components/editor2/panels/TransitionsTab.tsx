"use client";

import { useState } from "react";
import { useEditorStore, type TransitionType } from "@/store/editorStore";

const CATEGORIES: { name: string; transitions: { type: TransitionType; label: string; icon: string }[] }[] = [
  {
    name: "Basic",
    transitions: [
      { type: "cut", label: "Cut", icon: "✂" },
      { type: "fade", label: "Fade", icon: "◎" },
      { type: "dissolve", label: "Dissolve", icon: "∿" },
    ],
  },
  {
    name: "Luxury",
    transitions: [
      { type: "cinematic-fade", label: "Cinematic", icon: "◈" },
      { type: "blur", label: "Blur", icon: "◍" },
      { type: "light-leak", label: "Light Leak", icon: "✦" },
    ],
  },
  {
    name: "Motion",
    transitions: [
      { type: "zoom-in", label: "Zoom In", icon: "⊕" },
      { type: "zoom-out", label: "Zoom Out", icon: "⊖" },
      { type: "whip", label: "Whip", icon: "⟶" },
    ],
  },
  {
    name: "Slide",
    transitions: [
      { type: "slide-left", label: "Slide ←", icon: "←" },
      { type: "slide-right", label: "Slide →", icon: "→" },
      { type: "wipe-left", label: "Wipe ←", icon: "◁" },
      { type: "wipe-right", label: "Wipe →", icon: "▷" },
    ],
  },
  {
    name: "Camera",
    transitions: [
      { type: "glitch", label: "Glitch", icon: "⎒" },
    ],
  },
];

export default function TransitionsTab() {
  const { scenes, activeSceneId, updateScene } = useEditorStore();
  const scene = scenes.find(s => s.id === activeSceneId) ?? scenes[0];
  const [hovered, setHovered] = useState<TransitionType | null>(null);

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Active transition info */}
      {scene && (
        <div style={{
          padding: "10px 12px",
          background: "var(--accent-bg)", border: "1px solid var(--accent-dim)",
          borderRadius: "var(--r-md)",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>CURRENT SCENE TRANSITION</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
            {scene.transition.type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Duration: {scene.transition.duration.toFixed(1)}s</div>
            <input
              type="range" min="0.1" max="2" step="0.1"
              value={scene.transition.duration}
              onChange={e => updateScene(scene.id, { transition: { ...scene.transition, duration: Number(e.target.value) } })}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      )}

      {/* Apply to all */}
      {scene && (
        <button
          onClick={() => {
            const { scenes: allScenes, updateScene: update } = useEditorStore.getState();
            allScenes.forEach(s => update(s.id, { transition: { ...scene.transition } }));
          }}
          style={{
            width: "100%", padding: "6px 0",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)", color: "var(--text-secondary)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>
          Apply to all scenes
        </button>
      )}

      {/* Transition grid by category */}
      {CATEGORIES.map(cat => (
        <div key={cat.name}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
            {cat.name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {cat.transitions.map(tr => {
              const isActive = scene?.transition.type === tr.type;
              const isHov = hovered === tr.type;
              return (
                <button
                  key={tr.type}
                  onClick={() => scene && updateScene(scene.id, { transition: { ...scene.transition, type: tr.type } })}
                  onMouseEnter={() => setHovered(tr.type)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    padding: "10px 4px",
                    background: isActive ? "var(--accent-bg)" : isHov ? "var(--bg-overlay)" : "var(--bg-elevated)",
                    border: `1px solid ${isActive ? "var(--accent-dim)" : "var(--border)"}`,
                    borderRadius: "var(--r-md)", cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}>
                  <div style={{
                    fontSize: 18, lineHeight: 1,
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  }}>
                    {tr.icon}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    letterSpacing: "0.02em",
                  }}>
                    {tr.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
