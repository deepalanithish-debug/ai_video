"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  plan: string;
}

interface Draft {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  aspect_ratio?: string;
  prompt?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  thumbnail?: string;
  project_type?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getGreeting(): { greeting: string; period: "morning" | "afternoon" | "evening" } {
  const h = new Date().getHours();
  if (h < 12) return { greeting: "Good morning", period: "morning" };
  if (h < 17) return { greeting: "Good afternoon", period: "afternoon" };
  return { greeting: "Good evening", period: "evening" };
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "completed": return "#10b981";
    case "in-progress":
    case "active": return "#06b6d4";
    case "draft": return "#c9a96e";
    default: return "rgba(241,241,246,0.4)";
  }
}

function getStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case "in-progress": return "In Progress";
    case "active": return "Active";
    default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  }
}

// Gradient palettes for placeholder thumbnails
const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #c9a96e 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #10b981 100%)",
  "linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #10b981 100%)",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function VibeButton() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Tooltip */}
      {hovered && !open && (
        <div style={{
          position: "fixed",
          bottom: 90,
          right: 32,
          background: "rgba(20,20,40,0.95)",
          border: "1px solid rgba(201,169,110,0.3)",
          borderRadius: 8,
          padding: "6px 12px",
          color: "#c9a96e",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          zIndex: 1000,
          pointerEvents: "none",
        }}>
          Chat with Vibe
        </div>
      )}

      {/* Slide-up panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 90,
          right: 24,
          width: 340,
          height: 420,
          background: "rgba(10,10,25,0.97)",
          border: "1px solid rgba(201,169,110,0.25)",
          borderRadius: 20,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(201,169,110,0.08)",
          animation: "slideUp 0.3s ease",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(201,169,110,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <div style={{ color: "#c9a96e", fontWeight: 700, fontSize: 15 }}>Vibe AI</div>
              <div style={{ color: "rgba(241,241,246,0.4)", fontSize: 12 }}>Your creative assistant</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "rgba(241,241,246,0.4)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >×</button>
          </div>
          {/* Panel body */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c9a96e 0%, #f59e0b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow: "0 0 32px rgba(201,169,110,0.4)",
            }}>✨</div>
            <div style={{ color: "#f1f1f6", fontWeight: 600, fontSize: 18, textAlign: "center" }}>
              Vibe is coming soon
            </div>
            <div style={{
              color: "rgba(241,241,246,0.4)",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: 240,
            }}>
              Your AI creative assistant is being crafted. It will help you brainstorm, write scripts, and generate ideas — all within VydeoAI.
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: hovered
            ? "linear-gradient(135deg, #f59e0b 0%, #c9a96e 100%)"
            : "linear-gradient(135deg, #c9a96e 0%, #f59e0b 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          zIndex: 1001,
          boxShadow: hovered
            ? "0 0 0 4px rgba(201,169,110,0.2), 0 8px 32px rgba(201,169,110,0.5)"
            : "0 4px 20px rgba(201,169,110,0.35)",
          transition: "all 0.2s ease",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
        title="Chat with Vibe"
      >
        ✨
      </button>
    </>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const gradient = THUMB_GRADIENTS[index % THUMB_GRADIENTS.length];

  return (
    <div
      onClick={() => router.push(`/editor?project=${project.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 220,
        maxWidth: 220,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: hovered
          ? "1px solid rgba(124,58,237,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "scale(1.03)" : "scale(1)",
        boxShadow: hovered
          ? "0 0 0 1px rgba(124,58,237,0.2), 0 8px 32px rgba(124,58,237,0.2)"
          : "none",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 120,
        background: project.thumbnail || gradient,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Overlay on hover */}
        {hovered && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}>
            <span style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              Continue →
            </span>
          </div>
        )}
        {/* Type badge */}
        <div style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 11,
          color: "rgba(241,241,246,0.7)",
          fontWeight: 500,
        }}>
          {project.project_type || "Custom"}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          color: "#f1f1f6",
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 6,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {project.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(241,241,246,0.4)", fontSize: 12 }}>
            {timeAgo(project.updated_at)}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: getStatusColor(project.status),
            background: `${getStatusColor(project.status)}18`,
            padding: "2px 8px",
            borderRadius: 10,
            border: `1px solid ${getStatusColor(project.status)}30`,
          }}>
            {getStatusLabel(project.status)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  index,
  onDelete,
}: {
  draft: Draft;
  index: number;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gradient = THUMB_GRADIENTS[(index + 2) % THUMB_GRADIENTS.length];

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: hovered
          ? "1px solid rgba(124,58,237,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 8px 32px rgba(124,58,237,0.15)"
          : "none",
        position: "relative",
      }}
    >
      {/* Thumbnail strip */}
      <div
        onClick={() => router.push(`/editor?draft=${draft.id}`)}
        style={{ height: 100, background: gradient }}
      />

      {/* Card body */}
      <div
        onClick={() => router.push(`/editor?draft=${draft.id}`)}
        style={{ padding: "12px 14px 14px" }}
      >
        <div style={{
          color: "#f1f1f6",
          fontWeight: 600,
          fontSize: 14,
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {draft.name}
        </div>
        {draft.prompt && (
          <div style={{
            color: "rgba(241,241,246,0.35)",
            fontSize: 12,
            marginBottom: 8,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          } as React.CSSProperties}>
            {draft.prompt}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(241,241,246,0.4)", fontSize: 12 }}>
            {timeAgo(draft.updated_at)}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: getStatusColor(draft.status),
            background: `${getStatusColor(draft.status)}18`,
            padding: "2px 8px",
            borderRadius: 10,
            border: `1px solid ${getStatusColor(draft.status)}30`,
          }}>
            {getStatusLabel(draft.status)}
          </span>
        </div>
      </div>

      {/* Options menu button — visible on hover */}
      {hovered && (
        <div
          ref={menuRef}
          style={{ position: "absolute", top: 8, right: 8 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p); }}
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "#f1f1f6",
              cursor: "pointer",
              fontSize: 16,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⋮
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "rgba(15,15,35,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              overflow: "hidden",
              zIndex: 50,
              minWidth: 150,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              animation: "fadeIn 0.12s ease",
            }}>
              {[
                { label: "Rename", icon: "✏️" },
                { label: "Duplicate", icon: "⧉" },
                { label: "Archive", icon: "📦" },
                { label: "Delete", icon: "🗑", danger: true },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (item.label === "Delete") onDelete(draft.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: item.danger ? "#ef4444" : "#f1f1f6",
                    fontSize: 13,
                    textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      item.danger ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "none";
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Navbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Drafts filter/sort
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [meRes, draftsRes, projectsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/drafts"),
        fetch("/api/projects"),
      ]);

      if (meRes.status === 401) {
        router.push("/login");
        return;
      }

      const meData = await meRes.json();
      if (meData.user) setUser(meData.user);

      if (draftsRes.ok) {
        const d = await draftsRes.json();
        setDrafts(d.drafts ?? []);
      }

      if (projectsRes.ok) {
        const p = await projectsRes.json();
        setProjects(p.projects ?? []);
      }
    } catch {
      // network error — silently ignore for now
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close avatar menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [avatarMenuOpen]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const { greeting } = getGreeting();
  const firstName = user?.firstName || "Creator";
  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const filteredDrafts = drafts
    .filter((d) => statusFilter === "all" || d.status === statusFilter)
    .filter(
      (d) =>
        !searchQuery ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const filteredProjects = projects.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  function handleDeleteDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  // ── Quick tools ───────────────────────────────────────────────────────────────

  const quickTools = [
    {
      icon: "🎨",
      label: "AI Image Gen",
      desc: "Generate stunning visuals from text",
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.12)",
      href: "/editor?tab=ai",
    },
    {
      icon: "🎬",
      label: "AI Video Gen",
      desc: "Turn prompts into video sequences",
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.12)",
      href: "/editor?tab=video",
    },
    {
      icon: "✨",
      label: "Vibe AI",
      desc: "Your creative brainstorming partner",
      color: "#c9a96e",
      bg: "rgba(201,169,110,0.12)",
      href: "#vibe",
    },
    {
      icon: "🏷️",
      label: "Brand Kit",
      desc: "Manage fonts, colors & logos",
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      href: "/editor?tab=brand",
    },
  ];

  // ── Loading splash ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#07071a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "#7c3aed",
          borderRightColor: "#06b6d4",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{
          background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "var(--font-inter), sans-serif",
        }}>
          VydeoAI
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Global keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardHoverGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(124,58,237,0.2); }
          50% { box-shadow: 0 0 28px rgba(124,58,237,0.45); }
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
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#07071a",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        fontFamily: "var(--font-inter), -apple-system, sans-serif",
        color: "#f1f1f6",
        animation: "fadeIn 0.4s ease",
      }}>

        {/* ── Navbar ────────────────────────────────────────────────────────── */}
        <nav style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 64,
          background: "rgba(10,10,25,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Triangle icon */}
            <div style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              clipPath: "polygon(50% 5%, 95% 90%, 5% 90%)",
              borderRadius: 4,
            }} />
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              background: "linear-gradient(90deg, #7c3aed, #06b6d4, #7c3aed)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradientShift 4s linear infinite",
              letterSpacing: "-0.3px",
            }}>
              VydeoAI
            </span>
          </div>

          {/* Search bar */}
          <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", position: "relative" }}>
            <span style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(241,241,246,0.3)",
              fontSize: 15,
              pointerEvents: "none",
            }}>
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search drafts and projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 40,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "0 16px 0 40px",
                color: "#f1f1f6",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.5)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            />
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {/* Notification bell */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setNotifOpen((p) => !p)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(241,241,246,0.6)",
                  fontSize: 16,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                }}
              >
                🔔
              </button>
              {/* Notification dot */}
              <div style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#7c3aed",
                border: "2px solid rgba(10,10,25,0.95)",
              }} />
              {notifOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 280,
                  background: "rgba(15,15,35,0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: 16,
                  zIndex: 200,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                  animation: "fadeIn 0.15s ease",
                }}>
                  <div style={{ color: "#f1f1f6", fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                    Notifications
                  </div>
                  <div style={{
                    color: "rgba(241,241,246,0.4)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "16px 0",
                  }}>
                    You&apos;re all caught up! 🎉
                  </div>
                </div>
              )}
            </div>

            {/* Greeting chip */}
            <div style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              color: "rgba(241,241,246,0.7)",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}>
              👋 {greeting.replace("Good ", "")}
            </div>

            {/* Avatar */}
            <div ref={avatarMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setAvatarMenuOpen((p) => !p)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  border: "2px solid rgba(124,58,237,0.4)",
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: avatarMenuOpen ? "0 0 0 3px rgba(124,58,237,0.3)" : "none",
                }}
              >
                {initials}
              </button>

              {avatarMenuOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  width: 220,
                  background: "rgba(15,15,35,0.98)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  overflow: "hidden",
                  zIndex: 200,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                  animation: "fadeIn 0.15s ease",
                }}>
                  {/* User info */}
                  <div style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f1f6", marginBottom: 2 }}>
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(241,241,246,0.4)" }}>
                      {user?.email}
                    </div>
                    <div style={{
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#c9a96e",
                      background: "rgba(201,169,110,0.12)",
                      padding: "2px 8px",
                      borderRadius: 8,
                      display: "inline-block",
                      border: "1px solid rgba(201,169,110,0.25)",
                    }}>
                      {user?.plan?.toUpperCase() || "FREE"}
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { label: "Profile settings", icon: "⚙️" },
                    { label: "Billing", icon: "💳" },
                    { label: "Keyboard shortcuts", icon: "⌨️" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#f1f1f6",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "none";
                      }}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ef4444",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "none";
                      }}
                    >
                      <span>🚪</span> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* ── Page Content ──────────────────────────────────────────────────── */}
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px 120px" }}>

          {/* ── Header / Greeting ─────────────────────────────────────────── */}
          <section style={{ marginBottom: 56, animation: "slideUp 0.5s ease both" }}>
            <h1 style={{
              fontSize: 40,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.15,
              background: "linear-gradient(135deg, #f1f1f6 30%, rgba(241,241,246,0.6) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {greeting}, {firstName}
            </h1>
            <p style={{
              fontSize: 18,
              color: "rgba(241,241,246,0.45)",
              margin: "8px 0 28px",
              fontWeight: 400,
            }}>
              What are you creating today?
            </p>

            {/* New Project CTA */}
            <NewProjectButton router={router} />
          </section>

          {/* ── Continue Editing ──────────────────────────────────────────── */}
          <section style={{ marginBottom: 56, animation: "slideUp 0.5s ease 0.1s both" }}>
            <SectionHeader title="Continue Editing" count={filteredProjects.length} />

            {filteredProjects.length === 0 ? (
              <EmptyState
                icon="🎬"
                title={searchQuery ? "No matching projects" : "No projects yet"}
                desc={searchQuery ? "Try a different search term." : "Create your first project to get started."}
                cta={!searchQuery ? "New Project" : undefined}
                onCta={() => router.push("/editor")}
              />
            ) : (
              <div style={{
                display: "flex",
                gap: 16,
                overflowX: "auto",
                paddingBottom: 8,
                paddingTop: 4,
                scrollbarWidth: "thin",
              }}>
                {filteredProjects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* ── Recent Drafts ─────────────────────────────────────────────── */}
          <section style={{ marginBottom: 56, animation: "slideUp 0.5s ease 0.2s both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <SectionHeader title="Recent Drafts" count={filteredDrafts.length} inline />

              {/* Filter + sort controls */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Status filter */}
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
                  {["all", "draft", "in-progress", "completed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 7,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        background: statusFilter === s ? "rgba(124,58,237,0.3)" : "none",
                        color: statusFilter === s ? "#c4b5fd" : "rgba(241,241,246,0.4)",
                        transition: "all 0.15s",
                      }}
                    >
                      {s === "all" ? "All" : getStatusLabel(s)}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "name")}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: "rgba(241,241,246,0.6)",
                    fontSize: 12,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="date" style={{ background: "#0f0f23" }}>Sort: Date</option>
                  <option value="name" style={{ background: "#0f0f23" }}>Sort: Name</option>
                </select>
              </div>
            </div>

            {filteredDrafts.length === 0 ? (
              <EmptyState
                icon="📝"
                title={searchQuery || statusFilter !== "all" ? "No matching drafts" : "No drafts yet"}
                desc={
                  searchQuery
                    ? "Try a different search term."
                    : statusFilter !== "all"
                    ? "No drafts with this status."
                    : "Your drafts will appear here as you work."
                }
                cta={!searchQuery && statusFilter === "all" ? "Start editing" : undefined}
                onCta={() => router.push("/editor")}
              />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}>
                {filteredDrafts.map((draft, i) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    index={i}
                    onDelete={handleDeleteDraft}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Quick Tools ───────────────────────────────────────────────── */}
          <section style={{ marginBottom: 56, animation: "slideUp 0.5s ease 0.3s both" }}>
            <SectionHeader title="Quick Tools" />
            <div style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              paddingBottom: 4,
            }}>
              {quickTools.map((tool) => (
                <QuickToolCard key={tool.label} tool={tool} router={router} />
              ))}
            </div>
          </section>

          {/* ── Brand Kit ─────────────────────────────────────────────────── */}
          <section style={{ animation: "slideUp 0.5s ease 0.4s both" }}>
            <SectionHeader title="Brand Kit" />
            <BrandKitSection router={router} />
          </section>
        </main>

        {/* ── Vibe floating button ──────────────────────────────────────────── */}
        <VibeButton />
      </div>
    </>
  );
}

// ─── Reusable small components ────────────────────────────────────────────────

function NewProjectButton({ router }: { router: ReturnType<typeof useRouter> }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => router.push("/editor")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 28px",
        borderRadius: 14,
        border: "none",
        cursor: "pointer",
        fontSize: 16,
        fontWeight: 700,
        background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
        color: "#fff",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 0 0 4px rgba(124,58,237,0.25), 0 12px 40px rgba(124,58,237,0.4)"
          : "0 4px 20px rgba(124,58,237,0.3)",
        letterSpacing: "-0.2px",
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
      New Project
    </button>
  );
}

function SectionHeader({
  title,
  count,
  inline,
}: {
  title: string;
  count?: number;
  inline?: boolean;
}) {
  const el = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: inline ? 0 : 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f1f6", letterSpacing: "-0.3px" }}>
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span style={{
          background: "rgba(124,58,237,0.2)",
          color: "#c4b5fd",
          fontSize: 12,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 8,
          border: "1px solid rgba(124,58,237,0.3)",
        }}>
          {count}
        </span>
      )}
    </div>
  );
  return el;
}

function EmptyState({
  icon,
  title,
  desc,
  cta,
  onCta,
}: {
  icon: string;
  title: string;
  desc: string;
  cta?: string;
  onCta?: () => void;
}) {
  const [btnHovered, setBtnHovered] = useState(false);
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      borderRadius: 20,
      border: "1px dashed rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.01)",
      gap: 12,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 44 }}>{icon}</div>
      <div style={{ color: "#f1f1f6", fontWeight: 600, fontSize: 16 }}>{title}</div>
      <div style={{ color: "rgba(241,241,246,0.4)", fontSize: 14, maxWidth: 280 }}>{desc}</div>
      {cta && onCta && (
        <button
          onClick={onCta}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 10,
            border: "1px solid rgba(124,58,237,0.4)",
            background: btnHovered ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)",
            color: "#c4b5fd",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function QuickToolCard({
  tool,
  router,
}: {
  tool: { icon: string; label: string; desc: string; color: string; bg: string; href: string };
  router: ReturnType<typeof useRouter>;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => {
        if (tool.href.startsWith("#")) return;
        router.push(tool.href);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 180,
        maxWidth: 220,
        flexShrink: 0,
        padding: "20px 18px",
        borderRadius: 16,
        background: hovered ? tool.bg : "rgba(255,255,255,0.03)",
        border: hovered
          ? `1px solid ${tool.color}40`
          : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? `0 12px 40px ${tool.color}25` : "none",
        animation: hovered ? "cardHoverGlow 1.5s ease infinite" : "none",
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: tool.bg,
        border: `1px solid ${tool.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        marginBottom: 12,
      }}>
        {tool.icon}
      </div>
      <div style={{ color: "#f1f1f6", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {tool.label}
      </div>
      <div style={{ color: "rgba(241,241,246,0.4)", fontSize: 12, lineHeight: 1.5 }}>
        {tool.desc}
      </div>
    </div>
  );
}

function BrandKitSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [hovered, setHovered] = useState(false);
  // For now we treat Brand Kit as not yet set up —
  // a real implementation would check the API.
  return (
    <div
      onClick={() => router.push("/editor?tab=brand")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        border: hovered
          ? "1px solid rgba(16,185,129,0.35)"
          : "1px dashed rgba(255,255,255,0.1)",
        background: hovered ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.01)",
        padding: "36px 32px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: 24,
        boxShadow: hovered ? "0 8px 32px rgba(16,185,129,0.1)" : "none",
      }}
    >
      <div style={{
        width: 60,
        height: 60,
        borderRadius: 16,
        background: "rgba(16,185,129,0.12)",
        border: "1px solid rgba(16,185,129,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        flexShrink: 0,
      }}>
        🏷️
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#f1f1f6", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          Set up your Brand Kit
        </div>
        <div style={{ color: "rgba(241,241,246,0.4)", fontSize: 14, maxWidth: 480, lineHeight: 1.5 }}>
          Upload your logo, set your brand colors and fonts, and let VydeoAI automatically apply your brand identity to every video you create.
        </div>
      </div>
      <div style={{
        padding: "10px 20px",
        borderRadius: 10,
        background: hovered ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)",
        border: "1px solid rgba(16,185,129,0.3)",
        color: "#10b981",
        fontWeight: 600,
        fontSize: 14,
        flexShrink: 0,
        transition: "all 0.2s",
      }}>
        Get started →
      </div>
    </div>
  );
}
