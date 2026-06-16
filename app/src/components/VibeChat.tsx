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
  attachment?: { name: string; type: string };
  draftId?: string;
  draftMeta?: {
    scenes: number;
    seconds: number;
    mood: string;
  };
  isError?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Create a 30s luxury perfume ad",
  "Make a TikTok product showcase reel",
  "Build a travel vlog highlight video",
  "Generate a UGC-style testimonial video",
];

const CAPS = [
  "AI Video Generation",
  "Smart Timeline",
  "Auto Captions",
  "Transition AI",
];

const WELCOME: Message = {
  id: "welcome",
  role: "vibe",
  content:
    "Hey! I'm Vibe, your AI video creator. Tell me what kind of video you want to make, and I'll build the full timeline with scenes, captions, and transitions — ready to edit.\n\nYou can also attach clips or images as reference! 🎬",
  timestamp: new Date(),
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

          {/* Attachment badge */}
          {msg.attachment && (
            <div
              style={{
                marginTop: 8,
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
              <span>{msg.attachment.type.startsWith("video") ? "🎬" : "🖼️"}</span>
              {msg.attachment.name}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function VibeChat({ isOpen, onClose, onDraftCreated }: VibeChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // small delay so CSS transition fires
      const t = setTimeout(() => setPanelVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setPanelVisible(false);
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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
        attachment: attachment
          ? { name: attachment.name, type: attachment.type }
          : undefined,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAttachment(null);
      setIsTyping(true);

      try {
        const res = await fetch("/api/lineup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, workspaceSlug: "asaya" }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        // Parse result metadata
        const scenes: number = data.lineup?.timeline?.scenes?.length ?? data.timeline?.scenes?.length ?? 0;
        const seconds: number =
          data.lineup?.timeline?.totalDuration ??
          data.timeline?.total_duration ??
          data.totalDuration ??
          data.duration ??
          30;
        const mood: string =
          data.lineup?.timeline?.mood ??
          data.timeline?.mood ??
          data.mood ??
          "cinematic";
        const draftId: string =
          data.draftId ?? data.draft_id ?? data.id ?? String(Date.now());
        const hadClips = Boolean(attachment);

        const successContent = hadClips
          ? `Your video is ready! Here's what I built:\n\n` +
            `📽️ ${scenes} scenes · ~${Math.round(seconds)}s total · ${mood} feel\n\n` +
            `I've assigned your clips to each scene with captions and transitions. Tap "Continue in Editor" to fine-tune.`
          : `I've built a complete storyboard for your video!\n\n` +
            `📋 ${scenes} scenes · ~${Math.round(seconds)}s total · ${mood} feel\n\n` +
            `Since you didn't upload any clips, this is a creative shot list — each scene has a description of what to film. ` +
            `Open the editor to see the full plan, then upload your footage to fill each scene.`;

        const vibeMsg: Message = {
          id: `vibe-${Date.now()}`,
          role: "vibe",
          content: successContent,
          timestamp: new Date(),
          draftId,
          draftMeta: { scenes, seconds, mood },
        };

        setMessages((prev) => [...prev, vibeMsg]);
      } catch (err) {
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
      }
    },
    [attachment, isTyping]
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
    const file = e.target.files?.[0] ?? null;
    setAttachment(file);
    e.target.value = "";
  }

  const showSuggested = messages.length <= 1 && !isTyping;
  const canSend = input.trim().length > 0 && !isTyping;

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

            {/* Capabilities chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CAPS.map((cap) => (
                <span
                  key={cap}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(124,58,237,0.12)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    color: "#a78bfa",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* ── Messages ──────────────────────────────────────────────────── */}
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
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onContinue={msg.draftId ? onDraftCreated : undefined}
              />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
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
                  }}
                >
                  ✨
                </div>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: "4px 18px 18px 18px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <TypingDots />
                </div>
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
                {SUGGESTED_PROMPTS.map((p) => (
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

          {/* ── Input area ────────────────────────────────────────────────── */}
          <div
            style={{
              padding: "16px 24px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
              background: "#0d0d22",
            }}
          >
            {/* Attachment preview */}
            {attachment && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontSize: 13,
                  color: "#c4b5fd",
                }}
              >
                <span>{attachment.type.startsWith("video") ? "🎬" : "🖼️"}</span>
                <span
                  style={{
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.name}
                </span>
                <button
                  onClick={() => setAttachment(null)}
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
            )}

            {/* Row: attach + textarea + send */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach clip or image"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  color: "rgba(241,241,246,0.5)",
                  fontSize: 17,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#f1f1f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(241,241,246,0.5)";
                }}
              >
                📎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell Vibe what to create…"
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

              {/* Send button */}
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
              Vibe will generate a complete timeline using AI · Enter to send · Shift+Enter for new line
            </div>
          </div>
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
