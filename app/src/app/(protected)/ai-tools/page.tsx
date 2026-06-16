"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VibeChat from "@/components/VibeChat";

// ─── Tool card data ───────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  sub: string;
  color: string;
  glow: string;
  gradFrom: string;
  gradTo: string;
  action: "vibe" | "link";
  href?: string;
  badge?: string;
}

const TOOLS: ToolDef[] = [
  {
    id: "vibe",
    icon: "✨",
    label: "Vibe AI Creator",
    desc: "Create complete videos from a prompt",
    sub: "Describe your vision and Vibe builds the full timeline — scenes, captions, transitions — all ready to edit.",
    color: "#c9a96e",
    glow: "rgba(201,169,110,0.25)",
    gradFrom: "#c9a96e",
    gradTo: "#f5c842",
    action: "vibe",
    badge: "AI",
  },
  {
    id: "image-gen",
    icon: "🎨",
    label: "Image Generator",
    desc: "Generate AI images for your videos",
    sub: "Turn text descriptions into stunning visuals — cinematic stills, product shots, backgrounds, and more.",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.25)",
    gradFrom: "#7c3aed",
    gradTo: "#a78bfa",
    action: "link",
    href: "/editor?tab=ai",
    badge: "AI",
  },
  {
    id: "video-gen",
    icon: "🎬",
    label: "Video Generator",
    desc: "Generate AI video clips",
    sub: "Convert text or images into short video sequences. Perfect for B-roll, transitions, and scene starters.",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.25)",
    gradFrom: "#06b6d4",
    gradTo: "#67e8f9",
    action: "link",
    href: "/editor?tab=ai",
    badge: "AI",
  },
];

// ─── Feature card ─────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  onVibeOpen,
  router,
}: {
  tool: ToolDef;
  onVibeOpen: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [hovered, setHovered] = useState(false);

  function handleClick() {
    if (tool.action === "vibe") {
      onVibeOpen();
    } else if (tool.href) {
      router.push(tool.href);
    }
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 280px",
        minWidth: 280,
        maxWidth: 380,
        borderRadius: 20,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: hovered
          ? `1px solid ${tool.color}55`
          : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 20px 60px ${tool.glow}, 0 0 0 1px ${tool.color}30`
          : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card gradient banner */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${tool.gradFrom} 0%, ${tool.gradTo} 100%)`,
          opacity: hovered ? 1 : 0.5,
          transition: "opacity 0.25s",
        }}
      />

      <div style={{ padding: "28px 28px 32px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Icon + badge row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          {/* Icon orb */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${tool.gradFrom}22 0%, ${tool.gradTo}18 100%)`,
              border: `1px solid ${tool.color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow: hovered ? `0 0 32px ${tool.glow}` : "none",
              transition: "box-shadow 0.25s",
            }}
          >
            {tool.icon}
          </div>

          {tool.badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 20,
                background: `${tool.color}18`,
                border: `1px solid ${tool.color}35`,
                color: tool.color,
                letterSpacing: "0.05em",
              }}
            >
              {tool.badge}
            </span>
          )}
        </div>

        {/* Text */}
        <div
          style={{
            color: "#f1f1f6",
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 6,
            letterSpacing: "-0.3px",
          }}
        >
          {tool.label}
        </div>
        <div
          style={{
            color: tool.color,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          {tool.desc}
        </div>
        <div
          style={{
            color: "rgba(241,241,246,0.45)",
            fontSize: 13,
            lineHeight: 1.65,
            flex: 1,
          }}
        >
          {tool.sub}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: tool.color,
            fontSize: 14,
            fontWeight: 700,
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 0.2s, transform 0.2s",
            transform: hovered ? "translateX(4px)" : "translateX(0)",
          }}
        >
          {tool.action === "vibe" ? "Start creating" : "Open in Editor"}
          <span style={{ fontSize: 16 }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AIToolsPage() {
  const router = useRouter();
  const [vibeOpen, setVibeOpen] = useState(false);

  function handleDraftCreated(draftId: string) {
    setVibeOpen(false);
    router.push(`/editor?draft=${draftId}`);
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#07071a",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          fontFamily: "var(--font-inter), -apple-system, sans-serif",
          color: "#f1f1f6",
          animation: "fadeIn 0.4s ease both",
          overflowY: "auto",
        }}
      >
        {/* ── Back nav ────────────────────────────────────────────────────── */}
        <div style={{ padding: "20px 32px 0", maxWidth: 1100, margin: "0 auto" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(241,241,246,0.4)",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 0",
              transition: "color 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f1f1f6";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(241,241,246,0.4)";
            }}
          >
            ← Back to Home
          </button>
        </div>

        <main
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "56px 32px 100px",
          }}
        >
          {/* ── Page header ───────────────────────────────────────────────── */}
          <section style={{ marginBottom: 64, animation: "fadeIn 0.5s ease both" }}>
            {/* Label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#a78bfa",
                marginBottom: 20,
                letterSpacing: "0.04em",
              }}
            >
              ⚡ Powered by AI
            </div>

            <h1
              style={{
                margin: "0 0 12px",
                fontSize: 48,
                fontWeight: 900,
                letterSpacing: "-0.8px",
                lineHeight: 1.1,
                background:
                  "linear-gradient(135deg, #f1f1f6 20%, #7c3aed 60%, #06b6d4 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradientShift 5s linear infinite",
              }}
            >
              AI Studio
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 18,
                color: "rgba(241,241,246,0.45)",
                maxWidth: 520,
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              All of VydeoAI&apos;s AI tools in one place. Generate images, create videos from prompts, and let Vibe build complete timelines for you.
            </p>
          </section>

          {/* ── Tool cards ────────────────────────────────────────────────── */}
          <section>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                animation: "fadeIn 0.5s ease 0.15s both",
              }}
            >
              {TOOLS.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onVibeOpen={() => setVibeOpen(true)}
                  router={router}
                />
              ))}
            </div>
          </section>

          {/* ── Bottom tip ────────────────────────────────────────────────── */}
          <section
            style={{
              marginTop: 64,
              padding: "24px 28px",
              borderRadius: 16,
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              animation: "fadeIn 0.5s ease 0.3s both",
            }}
          >
            <div style={{ fontSize: 28, flexShrink: 0 }}>💡</div>
            <div>
              <div
                style={{
                  color: "#f1f1f6",
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Pro tip: Let Vibe do the heavy lifting
              </div>
              <div
                style={{
                  color: "rgba(241,241,246,0.45)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Describe your video in plain language and Vibe generates a complete multi-scene timeline with captions and transitions. You can then fine-tune everything in the editor.
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Vibe chat modal */}
      <VibeChat
        isOpen={vibeOpen}
        onClose={() => setVibeOpen(false)}
        onDraftCreated={handleDraftCreated}
      />
    </>
  );
}
