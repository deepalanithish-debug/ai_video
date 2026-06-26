"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: number;
  isError?: boolean;
}

const STARTERS = [
  "Generate a 15-second luxury fashion ad with 5 scenes",
  "Add fade-in captions to all scenes",
  "Make the pacing faster",
  "Apply cinematic transitions",
  "Generate captions from scene descriptions",
];

async function processCommand(text: string, store: ReturnType<typeof useEditorStore.getState>): Promise<string> {
  const lower = text.toLowerCase();

  // Detect intent
  if (lower.includes("transition")) {
    const type = lower.includes("fade") ? "fade" : lower.includes("dissolve") ? "dissolve"
      : lower.includes("zoom") ? "zoom-in" : lower.includes("glitch") ? "glitch"
      : lower.includes("slide") ? "slide-left" : lower.includes("cinematic") ? "cinematic-fade" : "fade";
    store.scenes.forEach(s => store.updateScene(s.id, { transition: { type: type as import("@/store/editorStore").TransitionType, duration: 0.6 } }));
    return `Applied ${type} transitions to all ${store.scenes.length} scenes.`;
  }

  if (lower.includes("caption") && (lower.includes("add") || lower.includes("generate"))) {
    store.scenes.forEach(sc => {
      if (sc.captions.length === 0 && sc.description) {
        store.addCaption(sc.id);
        // Update the caption text to the scene description
        const updated = useEditorStore.getState().scenes.find(s => s.id === sc.id);
        if (updated?.captions[0]) {
          store.updateCaption(sc.id, updated.captions[0].id, { text: sc.description.slice(0, 60) });
        }
      }
    });
    return "Added captions to scenes with descriptions.";
  }

  if (lower.includes("faster") || lower.includes("pacing")) {
    store.scenes.forEach(s => {
      if (s.duration > 2) store.updateScene(s.id, { duration: Math.max(2, s.duration * 0.7) });
    });
    return "Reduced all scene durations by 30% for faster pacing.";
  }

  if (lower.includes("slower")) {
    store.scenes.forEach(s => store.updateScene(s.id, { duration: s.duration * 1.4 }));
    return "Increased all scene durations by 40% for slower pacing.";
  }

  if (lower.includes("mood") || lower.includes("luxury") || lower.includes("energetic") || lower.includes("calm") || lower.includes("dramatic")) {
    const mood = lower.includes("luxury") ? "luxury" : lower.includes("energetic") ? "energetic"
      : lower.includes("calm") ? "calm" : lower.includes("dramatic") ? "dramatic" : "luxury";
    store.scenes.forEach(s => store.updateScene(s.id, { mood: mood as import("@/store/editorStore").Mood }));
    return `Set mood to "${mood}" on all scenes.`;
  }

  // Fall back to AI lineup generation
  store.setIsGenerating(true);
  try {
    const res = await fetch("/api/lineup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: text,
        workspaceSlug: "asaya",
        aspectRatio: store.aspectRatio,
        currentScenes: store.scenes.length,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Generation failed");
    if (data.lineup?.timeline?.scenes) {
      const newScenes = data.lineup.timeline.scenes.map((s: Record<string, unknown>, i: number) => ({
        id: (s.id as string) ?? crypto.randomUUID(),
        order: i,
        label: (s.label as string) ?? `Scene ${i + 1}`,
        description: (s.description as string) ?? "",
        duration: (s.duration as number) ?? 4,
        clipId: null, clipSrc: null, clipType: null,
        captions: [], transition: { type: "fade", duration: 0.5 },
        mood: (s.mood as string) ?? "luxury",
        colorGrade: null, effects: [], colorAdjustments: { exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0 },
      }));
      store.setScenes(newScenes);
      return `Generated ${newScenes.length} scenes for "${text}". ${data.demo ? "(Demo mode — add Gemini API key for real AI)" : "✓"}`;
    }
    return "Generated successfully.";
  } finally {
    store.setIsGenerating(false);
  }
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0", role: "system",
      text: "Hi! I'm your AI Creative Director. Tell me what to create, or use a quick action.",
      ts: Date.now(),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const store = useEditorStore.getState;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: text.trim(), ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await processCommand(text.trim(), store());
      setMessages(m => [...m, { id: crypto.randomUUID(), role: "assistant", text: reply, ts: Date.now() }]);
    } catch (e) {
      setMessages(m => [...m, {
        id: crypto.randomUUID(), role: "assistant",
        text: e instanceof Error ? e.message : "Something went wrong.",
        ts: Date.now(), isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, store]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: 216, right: 16, zIndex: 100,
          width: 44, height: 44, borderRadius: "50%",
          background: open ? "var(--bg-overlay)" : "var(--accent)",
          border: `1px solid ${open ? "var(--border)" : "transparent"}`,
          boxShadow: open ? "none" : "0 4px 20px rgba(201,169,110,0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s ease",
        }}>
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 268, right: 16, zIndex: 99,
          width: 320, height: 440,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)", overflow: "hidden",
          boxShadow: "var(--shadow-xl)",
          display: "flex", flexDirection: "column",
          animation: "slideUp 0.2s ease",
        }}>
          {/* Header */}
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            background: "var(--bg-elevated)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--ai)",
              boxShadow: "0 0 6px var(--ai)", animation: loading ? "pulse-ai 1s ease infinite" : "none",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>AI Creative Director</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setMessages([messages[0]])} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 9, color: "var(--text-muted)", padding: 2, fontFamily: "var(--font-sans)",
            }}>
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 10px",
                  borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: msg.role === "user"
                    ? "var(--accent)" : msg.isError
                    ? "var(--error-bg)" : "var(--bg-elevated)",
                  border: msg.role === "user" ? "none" : msg.isError ? "1px solid rgba(248,113,113,0.2)" : "1px solid var(--border)",
                  fontSize: 12, lineHeight: 1.5,
                  color: msg.role === "user" ? "#0A0A0E" : msg.isError ? "var(--error)" : "var(--text-secondary)",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "8px 12px", borderRadius: "12px 12px 12px 3px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "var(--ai)",
                      animation: `bounce 1.2s ${i * 0.2}s ease infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Starters (show only at start) */}
          {messages.length === 1 && (
            <div style={{ padding: "0 10px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 500,
                  background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
                  color: "var(--ai)", cursor: "pointer",
                }}>
                  {s.length > 28 ? s.slice(0, 26) + "…" : s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "8px 10px", borderTop: "1px solid var(--border)", flexShrink: 0,
            display: "flex", gap: 6, alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask AI anything…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, background: "var(--bg-inset)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", padding: "7px 10px",
                fontSize: 12, color: "var(--text-primary)", resize: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 32, height: 32, borderRadius: "var(--r-md)", flexShrink: 0,
                background: input.trim() && !loading ? "var(--accent)" : "var(--bg-elevated)",
                border: `1px solid ${input.trim() && !loading ? "transparent" : "var(--border)"}`,
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s ease",
              }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={input.trim() && !loading ? "#0A0A0E" : "var(--text-muted)"} strokeWidth="2.5">
                <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
