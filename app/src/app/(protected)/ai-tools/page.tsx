"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/store/editorStore";
import { Badge, useToast } from "@/components/ui";

const TOOLS = [
  {
    id: "lineup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    label: "AI Lineup Generator",
    description: "Describe your video and get a full scene-by-scene timeline in seconds.",
    badge: "Most used",
    badgeColor: "var(--accent)",
  },
  {
    id: "captions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="10" rx="1.5"/>
        <path d="M7 12h2M11 12h6"/>
      </svg>
    ),
    label: "Auto Caption",
    description: "Generate animated captions for all scenes based on your prompt.",
    badge: null,
    badgeColor: null,
    comingSoon: true,
  },
  {
    id: "transitions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
    label: "Smart Transitions",
    description: "AI selects the best transition for each scene cut based on mood and pacing.",
    badge: null,
    badgeColor: null,
    comingSoon: true,
  },
  {
    id: "pacing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: "Pacing Optimizer",
    description: "Automatically adjust scene durations for optimal viewer retention.",
    badge: null,
    badgeColor: null,
    comingSoon: true,
  },
  {
    id: "music",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
    label: "Music Matcher",
    description: "Suggest background music that matches your video's mood and tempo.",
    badge: "Beta",
    badgeColor: "var(--ai)",
    comingSoon: true,
  },
  {
    id: "script",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    label: "Script to Video",
    description: "Paste a script and watch VydeoAI build your entire video structure.",
    badge: "New",
    badgeColor: "var(--success)",
  },
];

const QUICK_PROMPTS = [
  "15-second Instagram Reel for a luxury skincare brand",
  "60-second YouTube ad with a strong call to action",
  "TikTok product launch — hook in first 3 seconds",
  "Brand story for a sustainable fashion startup",
  "Event teaser — dramatic and high-energy",
];

export default function AIToolsPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [activeTool, setActiveTool] = useState("lineup");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setScenes, setIsGenerating, aspectRatio } = useEditorStore();
  const { info } = useToast();

  const handleRun = async () => {
    if (isRunning) return;

    // Tools that aren't wired to a real backend yet — be honest instead of faking work.
    if (TOOLS.find(t => t.id === activeTool)?.comingSoon) {
      info("This tool is coming soon");
      return;
    }

    if (!prompt.trim()) return;

    setIsRunning(true);
    setResult(null);
    setError(null);
    setIsGenerating(true);

    try {
      if (activeTool === "lineup" || activeTool === "script") {
        const res = await fetch("/api/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), workspaceSlug: "vydeoai", aspectRatio }),
          signal: AbortSignal.timeout(90_000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? data.message ?? "Generation failed");
        if (data.lineup?.timeline?.scenes?.length) {
          const scenes = data.lineup.timeline.scenes.map((s: Record<string, unknown>, i: number) => ({
            id: (s.id as string) ?? crypto.randomUUID(),
            order: i,
            label: (s.label as string) ?? `Scene ${i + 1}`,
            description: (s.description as string) ?? "",
            duration: (s.duration as number) ?? 4,
            clipId: null, clipSrc: null, clipType: null,
            captions: [],
            transition: { type: "fade" as const, duration: 0.5 },
            mood: (s.mood as string) ?? "calm",
            colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
          }));
          setScenes(scenes);
          setResult(`Generated ${scenes.length} scenes. Opening editor…`);
          setTimeout(() => router.push("/editor/new"), 1200);
        } else {
          setError("No scenes were generated — try a more detailed prompt.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsRunning(false);
      setIsGenerating(false);
    }
  };

  const activeComingSoon = !!TOOLS.find(t => t.id === activeTool)?.comingSoon;

  return (
    <div style={{ padding: "32px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          AI Tools
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          Let AI handle the repetitive work. Pick a tool, describe your vision, hit run.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            style={{
              padding: "14px 16px",
              background: activeTool === tool.id ? "var(--accent-bg)" : "var(--bg-surface)",
              border: `1px solid ${activeTool === tool.id ? "var(--accent-dim)" : "var(--border)"}`,
              borderRadius: "var(--r-lg)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.14s ease",
              display: "flex", flexDirection: "column", gap: 8,
            }}
            onMouseEnter={e => { if (activeTool !== tool.id) { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}}
            onMouseLeave={e => { if (activeTool !== tool.id) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ color: activeTool === tool.id ? "var(--accent)" : "var(--text-muted)" }}>
                {tool.icon}
              </div>
              {tool.comingSoon ? (
                <Badge variant="default" size="xs">Coming soon</Badge>
              ) : tool.badge ? (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                  background: `color-mix(in srgb, ${tool.badgeColor} 12%, transparent)`,
                  color: tool.badgeColor ?? "var(--accent)",
                  border: `1px solid color-mix(in srgb, ${tool.badgeColor} 25%, transparent)`,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {tool.badge}
                </span>
              ) : null}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeTool === tool.id ? "var(--text-primary)" : "var(--text-secondary)", marginBottom: 3 }}>
                {tool.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {tool.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Prompt area */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "var(--r-xl)", padding: "20px", display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isRunning ? "var(--accent)" : "var(--text-disabled)",
            boxShadow: isRunning ? "0 0 8px var(--accent)" : "none",
            animation: isRunning ? "pulse-glow 1.2s ease infinite" : "none",
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            {TOOLS.find(t => t.id === activeTool)?.label}
          </span>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun(); }}
          placeholder={activeTool === "lineup" || activeTool === "script"
            ? "Describe your video — e.g. '15-second Instagram ad for a skincare brand with 5 scenes, luxury feel'"
            : "Optional: add context or instructions…"}
          rows={4}
          disabled={isRunning}
          style={{
            width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
            borderRadius: "var(--r-md)", padding: "12px 14px",
            fontSize: 13, color: "var(--text-primary)", resize: "none",
            fontFamily: "var(--font-sans)", lineHeight: 1.6,
            transition: "border-color 0.14s ease",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
        />

        {/* Quick prompts */}
        {(activeTool === "lineup" || activeTool === "script") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => setPrompt(p)} style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-muted)", cursor: "pointer", transition: "all 0.12s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                {p.length > 38 ? p.slice(0, 36) + "…" : p}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-disabled)" }}>⌘ + Enter to run</span>
          <button
            onClick={handleRun}
            disabled={isRunning || activeComingSoon || (!prompt.trim() && (activeTool === "lineup" || activeTool === "script"))}
            style={{
              padding: "9px 22px", borderRadius: "var(--r-md)",
              background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: isRunning || activeComingSoon || (!prompt.trim() && activeTool === "lineup") ? "not-allowed" : "pointer",
              opacity: isRunning || activeComingSoon || (!prompt.trim() && (activeTool === "lineup" || activeTool === "script")) ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 7,
              transition: "opacity 0.14s ease",
            }}>
            {isRunning ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: "spin 0.9s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Running…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Run
              </>
            )}
          </button>
        </div>

        {/* Result / error */}
        {result && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--r-md)",
            background: "var(--success-bg)", border: "1px solid rgba(52,211,153,0.18)",
            fontSize: 12, color: "var(--success)", display: "flex", gap: 8, alignItems: "center",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {result}
          </div>
        )}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "var(--r-md)",
            background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.18)",
            fontSize: 12, color: "var(--error)",
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
