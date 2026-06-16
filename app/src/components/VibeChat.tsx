"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VibeChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftCreated: (draftId: string) => void;
}

interface Message {
  id: string;
  role: "user" | "vibe";
  content: string;
  timestamp: Date;
  attachments?: Array<{ name: string; type: string }>;
  draftId?: string;
  draftMeta?: { scenes: number; seconds: number; mood: string };
  imageUrl?: string;
  videoUrl?: string;
  isError?: boolean;
}

type VibeModeId = "edit" | "image" | "video";

interface VibeMode {
  id: VibeModeId;
  icon: string;
  label: string;
  sublabel: string;
  description: string;
  color: string;
  glow: string;
  placeholder: string;
  prompts: string[];
  steps: Array<{ icon: string; label: string; detail: string }>;
}

const MODES: VibeMode[] = [
  {
    id: "edit",
    icon: "🎞️",
    label: "Storyboard",
    sublabel: "Ad Lineup",
    description: "Describe your concept and I'll plan a full ad lineup — scenes, hooks, captions, transitions, and music — ready to open and edit in the timeline editor.",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.4)",
    placeholder: "e.g. Create a 30s luxury perfume ad with cinematic shots…",
    prompts: [
      "Create a 30s luxury perfume ad lineup",
      "Plan a TikTok product showcase reel",
      "Build a travel vlog storyboard",
      "Generate a UGC-style testimonial ad",
    ],
    steps: [
      { icon: "🎯", label: "Analyzing your brief",   detail: "Understanding intent, style, and goals" },
      { icon: "🧠", label: "Planning scenes",         detail: "Building narrative structure & shot list" },
      { icon: "✍️", label: "Writing captions",       detail: "Crafting on-screen text & hooks" },
      { icon: "🎬", label: "Designing transitions",  detail: "Selecting cinematic cuts & effects" },
      { icon: "🎵", label: "Selecting music",        detail: "Matching mood & tempo to your video" },
      { icon: "✨", label: "Saving your draft",      detail: "Assembling timeline & storing your project" },
    ],
  },
  {
    id: "image",
    icon: "🖼️",
    label: "Image Gen",
    sublabel: "AI Image",
    description: "Describe any image and I'll generate it instantly — products, scenes, portraits, concepts, anything.",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.4)",
    placeholder: "e.g. A cat catching a fish in a crystal clear mountain stream…",
    prompts: [
      "A luxury perfume bottle on black marble",
      "Cinematic sunset over mountain peaks",
      "A cat catching a fish in crystal water",
      "Minimalist product photo on white background",
    ],
    steps: [
      { icon: "🎨", label: "Reading your prompt",   detail: "Parsing style, subject, and mood" },
      { icon: "✨", label: "Generating image",       detail: "Creating your image with AI" },
    ],
  },
  {
    id: "video",
    icon: "🎥",
    label: "Video Clip",
    sublabel: "Real Motion Video",
    description: "Describe a scene and I'll generate a real moving video clip using AI — up to 10 seconds of actual footage.",
    color: "#10b981",
    glow: "rgba(16,185,129,0.4)",
    placeholder: "e.g. A slow-motion pour of golden honey into a glass jar…",
    prompts: [
      "Slow-motion ocean waves crashing on rocks",
      "Time-lapse of city traffic at night",
      "A luxury car driving through mountain roads",
      "Product rotating on a pedestal with studio lighting",
    ],
    steps: [
      { icon: "🎬", label: "Processing your scene",    detail: "Parsing motion, style, and timing" },
      { icon: "🎥", label: "Generating video",         detail: "Creating your clip with AI (up to 10s)" },
      { icon: "⏳", label: "Rendering clip",           detail: "Finalizing frames and motion" },
    ],
  },
];


function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Draft save helper ────────────────────────────────────────────────────────

async function saveDraft(
  prompt: string,
  timeline: Record<string, unknown>,
  aspectRatio: string,
  signal: AbortSignal,
): Promise<string> {
  try {
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: prompt.slice(0, 60) + (prompt.length > 60 ? "…" : ""),
        prompt,
        timelineData: timeline,
        aspectRatio,
        status: "draft",
      }),
      signal,
    });
    if (!res.ok) return String(Date.now());
    const data = await res.json() as { id?: string };
    return data.id ?? String(Date.now());
  } catch {
    return String(Date.now());
  }
}

// ─── Progress steps UI ───────────────────────────────────────────────────────

function GenerationProgress({ step, steps, color }: {
  step: number;
  steps: Array<{ icon: string; label: string; detail: string }>;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: "4px 18px 18px 18px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}30`,
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(241,241,246,0.4)", marginBottom: 12, fontWeight: 500 }}>
        Working on it…
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const pending = i > step;
          return (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: pending ? 0.35 : 1,
                transition: "opacity 0.4s ease",
              }}
            >
              {/* Status icon */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? 13 : 14,
                  background: done
                    ? "rgba(16,185,129,0.15)"
                    : active
                    ? `${color}25`
                    : "rgba(255,255,255,0.04)",
                  border: done
                    ? "1px solid rgba(16,185,129,0.4)"
                    : active
                    ? `1px solid ${color}80`
                    : "1px solid rgba(255,255,255,0.08)",
                  animation: active ? "vibeStepPulse 1.2s ease infinite" : "none",
                  transition: "all 0.4s ease",
                }}
              >
                {done ? "✓" : s.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: done ? "rgba(241,241,246,0.6)" : active ? "#f1f1f6" : "rgba(241,241,246,0.5)",
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </div>
                {active && (
                  <div style={{ fontSize: 11, color: "rgba(241,241,246,0.35)", marginTop: 1 }}>
                    {s.detail}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#c9a96e",
            animation: `vibeDot 1.2s ease infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onContinue,
}: {
  msg: Message;
  onContinue?: (draftId: string) => void;
}) {
  const isUser = msg.role === "user";
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 10,
        animation: "vibeMsgIn 0.25s ease both",
      }}
    >
      {/* Avatar (Vibe only) */}
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #c9a96e 0%, #f5c842 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(201,169,110,0.35)",
          }}
        >
          ✨
        </div>
      )}

      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Bubble */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
            background: isUser
              ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
              : msg.isError
              ? "rgba(239,68,68,0.12)"
              : "rgba(255,255,255,0.05)",
            border: isUser
              ? "none"
              : msg.isError
              ? "1px solid rgba(239,68,68,0.25)"
              : "1px solid rgba(255,255,255,0.07)",
            color: "#f1f1f6",
            fontSize: 14,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.content}

          {/* Generated image */}
          {msg.imageUrl && (
            <div style={{ marginTop: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.imageUrl}
                alt="Generated"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  display: "block",
                  border: "1px solid rgba(6,182,212,0.25)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              />
              <a
                href={msg.imageUrl}
                download="vibe-image.png"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: "#06b6d4",
                  textDecoration: "none",
                  background: "rgba(6,182,212,0.1)",
                  border: "1px solid rgba(6,182,212,0.25)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontWeight: 500,
                }}
              >
                ↓ Download image
              </a>
            </div>
          )}

          {/* Generated video */}
          {msg.videoUrl && (
            <div style={{ marginTop: 10 }}>
              <video
                src={msg.videoUrl}
                controls
                autoPlay
                loop
                muted
                style={{
                  width: "100%",
                  borderRadius: 10,
                  display: "block",
                  border: "1px solid rgba(16,185,129,0.25)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              />
              <a
                href={msg.videoUrl}
                download="vibe-video.mp4"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: 12,
                  color: "#10b981",
                  textDecoration: "none",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontWeight: 500,
                }}
              >
                ↓ Download video
              </a>
            </div>
          )}

          {/* Attachment badges */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {msg.attachments.map((att, i) => (
                <div
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "rgba(241,241,246,0.7)",
                  }}
                >
                  <span>{att.type.startsWith("video") ? "🎬" : "🖼️"}</span>
                  {att.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* "Continue in Editor" button on success */}
        {msg.draftId && onContinue && (
          <button
            onClick={() => onContinue(msg.draftId!)}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              alignSelf: "flex-start",
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: btnHovered
                ? "linear-gradient(135deg, #f5c842 0%, #c9a96e 100%)"
                : "linear-gradient(135deg, #c9a96e 0%, #f5c842 100%)",
              color: "#1a1200",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: btnHovered ? "translateY(-1px)" : "translateY(0)",
              boxShadow: btnHovered
                ? "0 6px 20px rgba(201,169,110,0.5)"
                : "0 2px 10px rgba(201,169,110,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Continue in Editor →
          </button>
        )}

        {/* Timestamp */}
        <div
          style={{
            fontSize: 11,
            color: "rgba(241,241,246,0.3)",
            textAlign: isUser ? "right" : "left",
          }}
        >
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ─── Mode selector screen ─────────────────────────────────────────────────────

function ModeCard({ m, onSelect }: { m: VibeMode; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        background: hovered ? `${m.color}12` : "rgba(255,255,255,0.03)",
        border: hovered ? `1px solid ${m.color}50` : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 24px ${m.glow}30` : "none",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        animation: "vibeMsgIn 0.3s ease both",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        background: `${m.color}18`,
        border: `1px solid ${m.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
        boxShadow: hovered ? `0 0 16px ${m.glow}` : "none",
        transition: "box-shadow 0.2s",
      }}>
        {m.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f1f6" }}>{m.label}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
            background: `${m.color}18`, border: `1px solid ${m.color}35`, color: m.color,
          }}>
            {m.sublabel}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(241,241,246,0.5)", lineHeight: 1.5 }}>
          {m.description}
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        fontSize: 16, color: hovered ? m.color : "rgba(241,241,246,0.2)",
        transition: "color 0.2s", flexShrink: 0, marginTop: 12,
      }}>
        →
      </div>
    </button>
  );
}

function ModeSelectorScreen({ onSelect }: { onSelect: (m: VibeModeId) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "vibeMsgIn 0.3s ease both" }}>
      <div style={{
        fontSize: 22, fontWeight: 800, color: "#f1f1f6",
        letterSpacing: "-0.4px", marginBottom: 4,
      }}>
        What do you want to create?
      </div>
      <div style={{ fontSize: 14, color: "rgba(241,241,246,0.4)", marginBottom: 8 }}>
        Pick a mode to get started
      </div>
      {MODES.map((m) => (
        <ModeCard key={m.id} m={m} onSelect={() => onSelect(m.id)} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VibeChat({ isOpen, onClose, onDraftCreated }: VibeChatProps) {
  const [mode, setMode] = useState<VibeModeId | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [panelVisible, setPanelVisible] = useState(false);
  const [currentTimeline, setCurrentTimeline] = useState<Record<string, unknown> | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeMode = MODES.find(m => m.id === mode) ?? null;

  // Animate in/out; reset to mode-select on close
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setPanelVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setPanelVisible(false);
      setTimeout(() => { setMode(null); setMessages([]); setInput(""); setAttachments([]); setCurrentTimeline(null); setCurrentDraftId(null); }, 350);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function stopGeneration() {
    abortRef.current?.abort();
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = null;
    setIsTyping(false);
    setProgressStep(0);
    setMessages((prev) => [
      ...prev,
      {
        id: `stopped-${Date.now()}`,
        role: "vibe",
        content: "Generation stopped. Feel free to try a different prompt!",
        timestamp: new Date(),
      },
    ]);
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping || !mode) return;

      const hadClips = attachments.length > 0;
      const isRefining = mode === "edit" && Boolean(currentTimeline);
      const currentMode = MODES.find(m => m.id === mode)!;
      const steps = currentMode.steps;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
        attachments: attachments.length > 0
          ? attachments.map(f => ({ name: f.name, type: f.type }))
          : undefined,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAttachments([]);
      setIsTyping(true);
      setProgressStep(0);

      // Step timer — only advance to penultimate step (last is "done")
      let currentStep = 0;
      const totalSteps = steps.length;
      stepTimerRef.current = setInterval(() => {
        currentStep += 1;
        if (currentStep < totalSteps - 1) {
          setProgressStep(currentStep);
        } else {
          if (stepTimerRef.current) clearInterval(stepTimerRef.current);
          stepTimerRef.current = null;
        }
      }, mode === "video" ? 8000 : 3500);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // ── Image generation ────────────────────────────────────────────────
        if (mode === "image") {
          const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmed, style: "cinematic, commercial photography" }),
            signal: controller.signal,
          });
          if (stepTimerRef.current) clearInterval(stepTimerRef.current);
          stepTimerRef.current = null;
          setProgressStep(totalSteps - 1);

          const data = await res.json() as { imageUrl?: string; error?: string };
          if (!res.ok || !data.imageUrl) throw new Error(data.error ?? "Image generation failed");

          const vibeMsg: Message = {
            id: `vibe-${Date.now()}`,
            role: "vibe",
            content: `Here's your image! ✨`,
            timestamp: new Date(),
            imageUrl: data.imageUrl,
          };
          setMessages((prev) => [...prev, vibeMsg]);
          return;
        }

        // ── Video generation ────────────────────────────────────────────────
        if (mode === "video") {
          const res = await fetch("/api/generate-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmed, duration: "8", aspectRatio: "9:16" }),
            signal: controller.signal,
          });
          if (stepTimerRef.current) clearInterval(stepTimerRef.current);
          stepTimerRef.current = null;
          setProgressStep(totalSteps - 1);

          const data = await res.json() as { videoUrl?: string; error?: string };
          if (!res.ok || !data.videoUrl) throw new Error(data.error ?? "Video generation failed");

          const vibeMsg: Message = {
            id: `vibe-${Date.now()}`,
            role: "vibe",
            content: `Your video clip is ready! ✨`,
            timestamp: new Date(),
            videoUrl: data.videoUrl,
          };
          setMessages((prev) => [...prev, vibeMsg]);
          return;
        }

        // ── Video edit (timeline) ───────────────────────────────────────────
        // For each attached video: extract a keyframe via canvas (so the AI can SEE who is
        // in each clip) AND read the actual duration (so clips play in full, not cut short).
        const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
        const inlineImageFiles = attachments.filter(f => f.type.startsWith("image/") && f.size <= MAX_IMAGE_BYTES);
        const videoFiles = attachments.filter(
          f => f.type.startsWith("video/") || /\.(mov|mp4|avi|webm|mkv|m4v)$/i.test(f.name)
        );

        // Image clips: inline base64
        const imageGeminiClips = await Promise.all(
          inlineImageFiles.map(async (file, i) => {
            const d = await new Promise<string>((res, rej) => {
              const reader = new FileReader();
              reader.onload = () => res((reader.result as string).split(",")[1]);
              reader.onerror = rej;
              reader.readAsDataURL(file);
            });
            return { data: d, mimeType: file.type, name: file.name, index: i };
          })
        );

        // Video clips: extract 3 keyframes per clip at 15%, 45%, 75% of duration.
        // Multiple frames let the AI see distinctive features (glasses, clothing, face) that
        // may not be visible in the first second, preventing wrong clip-to-person assignments.
        const FRAME_POSITIONS = [0.15, 0.45, 0.75];

        const videoMeta = await Promise.all(
          videoFiles.map((file) => {
            const blobUrl = URL.createObjectURL(file);
            return new Promise<{ blobUrl: string; duration: number; frames: string[]; timestamps: number[] }>((resolve) => {
              const video = document.createElement("video");
              const canvas = document.createElement("canvas");
              video.preload = "metadata";
              video.muted = true;

              const frames: string[] = [];
              const timestamps: number[] = [];
              let frameIdx = 0;
              let settled = false;

              const finish = (dur: number) => {
                if (!settled) {
                  settled = true;
                  (video as HTMLVideoElement).onseeked = null;
                  (video as HTMLVideoElement).onerror = null;
                  resolve({ blobUrl, duration: dur, frames, timestamps });
                }
              };

              const captureThenAdvance = () => {
                const dur = video.duration || 0;
                try {
                  const w = Math.min(video.videoWidth || 640, 640);
                  const h = Math.round((w / (video.videoWidth || 640)) * (video.videoHeight || 360));
                  if (w > 0 && h > 0) {
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(video, 0, 0, w, h);
                      frames.push(canvas.toDataURL("image/jpeg", 0.55).split(",")[1]);
                      timestamps.push(parseFloat((FRAME_POSITIONS[frameIdx - 1] * dur).toFixed(2)));
                    }
                  }
                } catch { /* skip this frame, continue */ }

                if (frameIdx < FRAME_POSITIONS.length) {
                  video.currentTime = FRAME_POSITIONS[frameIdx] * (video.duration || 0);
                  frameIdx++;
                } else {
                  finish(video.duration || 0);
                }
              };

              video.onloadedmetadata = () => {
                const dur = video.duration;
                if (!dur || !isFinite(dur)) { finish(0); return; }
                video.currentTime = FRAME_POSITIONS[frameIdx] * dur;
                frameIdx++;
              };

              video.onseeked = () => { captureThenAdvance(); };
              video.onerror = () => finish(video.duration || 0);
              // 15s budget covers 3 seeks even on slow codecs
              setTimeout(() => finish(video.duration || 0), 15000);
              video.src = blobUrl;
            });
          })
        );

        // Build geminiClips: images inline, videos with 3 keyframes for person identification
        const videoGeminiClips = videoMeta.map((meta, i) => ({
          ...(meta.frames.length > 0 ? { frames: meta.frames, frameTimestamps: meta.timestamps } : {}),
          mimeType: videoFiles[i].type || "video/mp4",
          name: videoFiles[i].name,
          ...(meta.duration > 0 ? { duration: meta.duration } : {}),
          index: imageGeminiClips.length + i,
        }));

        const allGeminiClips = [...imageGeminiClips, ...videoGeminiClips];

        const clipNote = videoFiles.length > 0
          ? `\n\nVideo clips (use visual analysis to identify each person, then assign clips to scenes matching the user's requested order — do NOT cut clips short, each clip must play in full):\n${videoFiles.map((f, i) => `  Clip ${imageGeminiClips.length + i}: ${f.name}${videoMeta[i].duration > 0 ? ` (~${Math.round(videoMeta[i].duration)}s)` : ""}`).join("\n")}`
          : "";

        const res = await fetch("/api/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed + clipNote,
            workspaceSlug: "asaya",
            ...(allGeminiClips.length > 0 ? { geminiClips: allGeminiClips } : {}),
            ...(currentTimeline ? { existingTimeline: currentTimeline } : {}),
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");

        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
        setProgressStep(totalSteps - 1);

        const rawScenes: Array<{ id?: string; description?: string; visualPrompt?: string; duration?: number; type?: string; clipSrc?: string; clipType?: string }> =
          data.lineup?.timeline?.scenes ?? data.timeline?.scenes ?? [];
        const sceneCount: number = rawScenes.length;
        const seconds: number =
          data.lineup?.timeline?.totalDuration ?? data.timeline?.total_duration ??
          data.totalDuration ?? data.duration ?? 30;
        const mood: string =
          data.lineup?.timeline?.mood ?? data.timeline?.mood ?? data.mood ?? "cinematic";
        const aspectRatio: string =
          data.lineup?.timeline?.aspectRatio ?? data.aspectRatio ?? "9:16";

        // Use the AI's clipAssignments to map the right clip to each scene.
        // The AI saw keyframes and identified who is in each clip, so its assignments
        // respect the user's requested ordering (e.g. "start with the girl").
        // Fall back to sequential if no assignments.
        const clipAssignments: Array<{ sceneId: string; clipIndex: number }> =
          Array.isArray(data.clipAssignments) ? data.clipAssignments : [];

        const scenes = rawScenes.map((scene, fallbackIdx) => {
          if (scene.clipSrc) return scene;
          const assignment = clipAssignments.find(a => a.sceneId === scene.id);
          // clipIndex in assignments refers to the global allGeminiClips index;
          // video clips start at imageGeminiClips.length
          const videoIdx = assignment !== undefined
            ? assignment.clipIndex - imageGeminiClips.length
            : fallbackIdx;
          const meta = videoMeta[videoIdx] ?? videoMeta[fallbackIdx];
          if (!meta) return scene;
          const fullDur = meta.duration > 0 ? parseFloat(meta.duration.toFixed(3)) : (scene.duration ?? 5);
          return {
            ...scene,
            clipSrc: meta.blobUrl,
            clipType: "video" as const,
            clipTrimStart: 0,
            clipTrimEnd: fullDur,
            duration: fullDur,
          };
        });

        const actualTotal = parseFloat(scenes.reduce((s, sc) => s + (sc.duration ?? 0), 0).toFixed(3));
        const timeline = {
          ...(data.lineup?.timeline ?? data.timeline ?? {}),
          scenes,
          totalDuration: actualTotal || undefined,
        };

        let draftId: string | null;
        if (currentDraftId) {
          await fetch(`/api/drafts/${currentDraftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timelineData: timeline,
              name: trimmed.slice(0, 60),
              prompt: trimmed,
              aspectRatio,
            }),
            signal: controller.signal,
          });
          draftId = currentDraftId;
        } else {
          draftId = await saveDraft(trimmed, timeline, aspectRatio, controller.signal);
        }
        setCurrentTimeline(timeline);
        setCurrentDraftId(draftId);

        const successContent = isRefining
          ? `Timeline refined! ✨\n\n📽️ ${sceneCount} scenes · ~${Math.round(seconds)}s · ${mood} feel\n\nYour changes are applied. Open the editor to review.`
          : hadClips
            ? `Ad lineup ready!\n\n📋 ${sceneCount} scenes · ~${Math.round(actualTotal || seconds)}s total · ${mood} feel\n\n${videoFiles.length} clip${videoFiles.length !== 1 ? "s" : ""} assigned in correct order — each plays its full answer. Open the editor to preview and render.`
            : `Ad lineup ready!\n\n📋 ${sceneCount} scenes · ~${Math.round(seconds)}s · ${mood} feel\n\nScene structure, captions, transitions, and music are planned. Open the editor to add footage and refine.`;

        const vibeMsg: Message = {
          id: `vibe-${Date.now()}`,
          role: "vibe",
          content: successContent,
          timestamp: new Date(),
          draftId,
          draftMeta: { scenes: sceneCount, seconds, mood },
        };
        setMessages((prev) => [...prev, vibeMsg]);

      } catch (err) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
        if (err instanceof Error && err.name === "AbortError") return;
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          role: "vibe",
          content:
            err instanceof Error
              ? `Hmm, something went wrong: ${err.message}. Want to try rephrasing?`
              : "I ran into an issue generating your video. Please try again!",
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
        setProgressStep(0);
        abortRef.current = null;
      }
    },
    [attachments, isTyping, mode, currentTimeline, currentDraftId]
  );

  function handleSuggestedPrompt(prompt: string) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  }

  const showSuggested = messages.length === 0 && !isTyping && mode !== null;
  const canSend = input.trim().length > 0 && !isTyping && mode !== null;

  if (!isOpen) return null;

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes vibeDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes vibeMsgIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes vibeSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vibeOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes vibeStepPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(124,58,237,0); }
        }
        @keyframes vibeStopPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .vibe-overlay-enter { animation: vibeOverlayIn 0.25s ease both; }
        .vibe-panel-enter { animation: vibeSlideUp 0.3s cubic-bezier(0.34,1.4,0.64,1) both; }
      `}</style>

      {/* Overlay */}
      <div
        className="vibe-overlay-enter"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(7,7,26,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}
      >
        {/* Panel */}
        <div
          className={panelVisible ? "vibe-panel-enter" : ""}
          style={{
            maxWidth: 780,
            width: "90%",
            height: "85vh",
            background: "#0d0d22",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 20,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.08)",
            position: "relative",
          }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div
            style={{
              padding: "18px 24px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            {/* Top row: logo + close */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #c9a96e 0%, #f5c842 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    boxShadow: "0 0 24px rgba(201,169,110,0.4)",
                    flexShrink: 0,
                  }}
                >
                  ✨
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #c9a96e 0%, #f5c842 60%, #c9a96e 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundSize: "200% auto",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    Vibe
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(241,241,246,0.4)",
                      marginTop: -1,
                    }}
                  >
                    AI Creator
                  </div>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(241,241,246,0.6)",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#f1f1f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(241,241,246,0.6)";
                }}
              >
                ×
              </button>
            </div>

            {/* Mode chips / back button */}
            {mode === null ? (
              <div style={{ fontSize: 13, color: "rgba(241,241,246,0.4)" }}>
                Choose what you want to create ↓
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => { setMode(null); setMessages([]); setInput(""); }}
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20, cursor: "pointer", color: "rgba(241,241,246,0.5)",
                    fontSize: 11, fontWeight: 500, padding: "3px 10px",
                    display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "#f1f1f6"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(241,241,246,0.5)"; }}
                >
                  ← Back
                </button>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: `${activeMode!.color}18`,
                  border: `1px solid ${activeMode!.color}40`,
                  color: activeMode!.color,
                }}>
                  {activeMode!.icon} {activeMode!.label}
                </span>
              </div>
            )}
          </div>

          {/* ── Messages or Mode Selector ──────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              scrollbarWidth: "thin",
            }}
          >
            {/* Mode selector — shown when no mode chosen */}
            {mode === null && (
              <ModeSelectorScreen onSelect={(m) => {
                setMode(m);
                setMessages([]);
                setTimeout(() => inputRef.current?.focus(), 100);
              }} />
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onContinue={msg.draftId ? onDraftCreated : undefined}
              />
            ))}

            {/* Generation progress */}
            {isTyping && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  animation: "vibeMsgIn 0.2s ease both",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #c9a96e 0%, #f5c842 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                    boxShadow: "0 0 16px rgba(201,169,110,0.35)",
                    marginTop: 4,
                  }}
                >
                  ✨
                </div>
                <GenerationProgress
                  step={progressStep}
                  steps={activeMode?.steps ?? MODES[0].steps}
                  color={activeMode?.color ?? "#7c3aed"}
                />
              </div>
            )}

            {/* Suggested prompts */}
            {showSuggested && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  animation: "vibeMsgIn 0.3s ease 0.15s both",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(241,241,246,0.35)",
                    marginBottom: 2,
                    paddingLeft: 42,
                  }}
                >
                  Try one of these…
                </div>
                {(activeMode?.prompts ?? MODES[0].prompts).map((p) => (
                  <SuggestedPromptChip
                    key={p}
                    prompt={p}
                    onClick={() => handleSuggestedPrompt(p)}
                  />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area (hidden in mode-select) ───────────────────────── */}
          {mode !== null && <div
            style={{
              padding: "16px 24px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
              background: "#0d0d22",
            }}
          >
            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(124,58,237,0.12)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                      color: "#c4b5fd",
                    }}
                  >
                    <span>{file.type.startsWith("video") ? "🎬" : "🖼️"}</span>
                    <span
                      style={{
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(196,181,253,0.6)",
                        fontSize: 14,
                        lineHeight: 1,
                        padding: 0,
                        marginLeft: 2,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Row: attach + textarea + send */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              {/* Attach button */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach clips or images (multiple allowed)"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: attachments.length > 0 ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.05)",
                    border: attachments.length > 0 ? "1px solid rgba(124,58,237,0.45)" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    color: attachments.length > 0 ? "#c4b5fd" : "rgba(241,241,246,0.5)",
                    fontSize: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = attachments.length > 0 ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.09)";
                    (e.currentTarget as HTMLButtonElement).style.color = attachments.length > 0 ? "#c4b5fd" : "#f1f1f6";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = attachments.length > 0 ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.color = attachments.length > 0 ? "#c4b5fd" : "rgba(241,241,246,0.5)";
                  }}
                >
                  📎
                </button>
                {attachments.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#7c3aed",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    {attachments.length}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "edit" && currentTimeline
                    ? "Refine: e.g. make scene 2 more dramatic, add 2 more scenes…"
                    : activeMode?.placeholder ?? "Tell Vibe what to create…"
                }
                rows={1}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#f1f1f6",
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: "none",
                  maxHeight: 120,
                  overflowY: "auto",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = "rgba(124,58,237,0.55)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLTextAreaElement).style.borderColor = "rgba(124,58,237,0.25)";
                }}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />

              {/* Stop / Send button */}
              {isTyping ? (
                <button
                  onClick={stopGeneration}
                  title="Stop generation"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.4)",
                    cursor: "pointer",
                    background: "rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    animation: "vibeStopPulse 1.5s ease infinite",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.22)";
                    (e.currentTarget as HTMLButtonElement).style.animation = "none";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.animation = "vibeStopPulse 1.5s ease infinite";
                  }}
                >
                  ■
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!canSend}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    cursor: canSend ? "pointer" : "not-allowed",
                    background: canSend
                      ? "linear-gradient(135deg, #c9a96e 0%, #f5c842 100%)"
                      : "rgba(255,255,255,0.07)",
                    color: canSend ? "#1a1200" : "rgba(241,241,246,0.25)",
                    fontSize: 17,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                    transform: canSend ? "scale(1)" : "scale(0.95)",
                    boxShadow: canSend ? "0 2px 12px rgba(201,169,110,0.35)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!canSend) return;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 20px rgba(201,169,110,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    if (!canSend) return;
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 2px 12px rgba(201,169,110,0.35)";
                  }}
                >
                  ↑
                </button>
              )}
            </div>

            {/* Hint */}
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "rgba(241,241,246,0.25)",
                textAlign: "center",
              }}
            >
              {isTyping
                ? `Generating · Press ■ to stop`
                : `${activeMode?.label ?? "Vibe"} · Enter to send · Shift+Enter for new line`}
            </div>
          </div>}
        </div>
      </div>
    </>
  );
}

// ─── Suggested prompt chip ────────────────────────────────────────────────────

function SuggestedPromptChip({
  prompt,
  onClick,
}: {
  prompt: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignSelf: "flex-start",
        marginLeft: 42,
        padding: "9px 16px",
        borderRadius: 20,
        border: hovered
          ? "1px solid rgba(124,58,237,0.5)"
          : "1px solid rgba(255,255,255,0.09)",
        background: hovered
          ? "rgba(124,58,237,0.12)"
          : "rgba(255,255,255,0.04)",
        color: hovered ? "#c4b5fd" : "rgba(241,241,246,0.6)",
        fontSize: 13,
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        transform: hovered ? "translateX(4px)" : "translateX(0)",
        textAlign: "left",
      }}
    >
      {prompt}
    </button>
  );
}
