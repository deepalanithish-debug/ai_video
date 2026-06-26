"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";

const QUICK_ACTIONS = [
  { label: "Generate captions", icon: "✦", prompt: "Add captions to all scenes based on the content" },
  { label: "Add transitions", icon: "◈", prompt: "Add luxury cinematic transitions between all scenes" },
  { label: "Premium feel", icon: "◎", prompt: "Make this feel more premium and luxurious" },
  { label: "Fast-paced edit", icon: "⚡", prompt: "Make the pacing faster and more energetic" },
  { label: "Suggest music", icon: "♫", prompt: "Suggest background music that fits the mood" },
  { label: "Improve pacing", icon: "⏱", prompt: "Optimize scene durations for better flow" },
];

export default function AITab() {
  const { isGenerating, setIsGenerating, scenes, setScenes, aspectRatio } = useEditorStore();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch("/api/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          workspaceSlug: "asaya",
          aspectRatio,
          currentScenes: scenes.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Generation failed");
      if (data.lineup?.timeline?.scenes) {
        // Map AI scenes to store format
        const newScenes = data.lineup.timeline.scenes.map((s: Record<string, unknown>, i: number) => ({
          id: (s.id as string) ?? `scene-${i}`,
          order: i,
          label: (s.label as string) ?? `Scene ${i + 1}`,
          description: (s.description as string) ?? "",
          duration: (s.duration as number) ?? 4,
          clipId: null, clipSrc: null, clipType: null,
          captions: (s.captions as unknown[])?.map((c: unknown) => {
            const cap = c as Record<string, unknown>;
            return {
              id: (cap.id as string) ?? crypto.randomUUID(),
              text: (cap.text as string) ?? "",
              startTime: (cap.startTime as number) ?? 0,
              endTime: (cap.endTime as number) ?? 3,
              x: 10, y: 75, fontSize: 24, fontFamily: "Inter",
              color: "#FFFFFF", bgColor: "#000000", bgOpacity: 0.4,
              bold: false, italic: false, align: "center" as const,
              animation: "fade" as const, letterSpacing: 0.05, lineHeight: 1.4,
              stroke: false, strokeColor: "#000000", shadow: true,
            };
          }) ?? [],
          transition: (s.transition as Record<string, unknown>) ?? { type: "fade", duration: 0.5 },
          mood: (s.mood as string) ?? "luxury",
          colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
        }));
        setScenes(newScenes);
        setResponse(`Generated ${newScenes.length} scenes. ${data.demo ? "(Demo mode)" : "✓"}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
      setPrompt("");
    }
  };

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* AI indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", borderRadius: "var(--r-md)",
        background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: "var(--ai)",
          animation: isGenerating ? "pulse-ai 1.5s ease infinite" : "none",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ai)" }}>
          {isGenerating ? "AI is thinking…" : "AI Creative Director"}
        </span>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>Quick Actions</div>
        {QUICK_ACTIONS.map(a => (
          <button
            key={a.label}
            onClick={() => handleSubmit(a.prompt)}
            disabled={isGenerating}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: "var(--r-md)",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
              cursor: "pointer", textAlign: "left", transition: "all 0.12s ease",
              opacity: isGenerating ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!isGenerating) { e.currentTarget.style.borderColor = "var(--ai-dim)"; e.currentTarget.style.background = "var(--ai-bg)"; e.currentTarget.style.color = "var(--ai)"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>Custom Prompt</div>
        <div style={{ position: "relative" }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(prompt); }}}
            placeholder="e.g. Make this feel more premium…"
            rows={3}
            disabled={isGenerating}
            style={{
              width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
              borderRadius: "var(--r-md)", padding: "8px 10px 32px",
              fontSize: 12, color: "var(--text-primary)", resize: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            onClick={() => handleSubmit(prompt)}
            disabled={!prompt.trim() || isGenerating}
            style={{
              position: "absolute", bottom: 6, right: 6,
              background: "var(--accent)", border: "none", borderRadius: "var(--r-sm)",
              color: "#FFFFFF", padding: "4px 10px", fontSize: 11, fontWeight: 700,
              cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
              opacity: !prompt.trim() || isGenerating ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 4,
            }}>
            {isGenerating ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
            {isGenerating ? "…" : "Run"}
          </button>
        </div>
      </div>

      {/* Response / Error */}
      {response && (
        <div style={{
          padding: "8px 10px", borderRadius: "var(--r-md)",
          background: "var(--success-bg)", border: "1px solid rgba(52,211,153,0.2)",
          fontSize: 11, color: "var(--success)",
        }}>
          ✓ {response}
        </div>
      )}
      {error && (
        <div style={{
          padding: "8px 10px", borderRadius: "var(--r-md)",
          background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.2)",
          fontSize: 11, color: "var(--error)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
