"use client";

import { useState } from "react";
import Link from "next/link";
import { useEditorStore } from "@/store/editorStore";

function Btn({ children, onClick, title, variant = "ghost", style: s }: {
  children: React.ReactNode; onClick?: () => void; title?: string;
  variant?: "ghost" | "primary" | "secondary"; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: "var(--r-md)", fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", fontFamily: "var(--font-sans)",
    transition: "all 0.12s ease", whiteSpace: "nowrap",
    ...(variant === "ghost" ? {
      background: "transparent", color: "var(--text-secondary)",
    } : variant === "primary" ? {
      background: "var(--accent)", color: "#FFFFFF",
      boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
    } : {
      background: "var(--bg-elevated)", color: "var(--text-secondary)",
      border: "1px solid var(--border)",
    }),
    ...s,
  };
  return (
    <button style={base} onClick={onClick} title={title}
      onMouseEnter={e => {
        if (variant === "ghost") { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-primary)"; }
        if (variant === "primary") e.currentTarget.style.background = "var(--accent-light)";
        if (variant === "secondary") { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = "var(--text-primary)"; }
      }}
      onMouseLeave={e => {
        if (variant === "ghost") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }
        if (variant === "primary") e.currentTarget.style.background = "var(--accent)";
        if (variant === "secondary") { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }
      }}>
      {children}
    </button>
  );
}

function Svg({ d, size = 13 }: { d: string | string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export default function TopBar({ projectId }: { projectId?: string }) {
  const { projectName, isDirty, setProjectName, scenes, audioTracks, aspectRatio } = useEditorStore();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(projectName);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: scenes.map(sc => ({ id: sc.id, label: sc.label, duration: sc.duration, clipType: sc.clipType })),
          aspectRatio,
          totalDuration: scenes.reduce((s, sc) => s + sc.duration, 0),
          outputFilename: `${projectName.replace(/\s+/g, "-")}-${Date.now()}.mp4`,
        }),
      });
      const data = await res.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl; a.download = data.filename ?? "export.mp4";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <header style={{
      height: 48, display: "flex", alignItems: "center",
      padding: "0 12px", gap: 8, flexShrink: 0,
      background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
    }}>
      {/* Back + Logo */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: "var(--r-md)", textDecoration: "none",
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        color: "var(--text-muted)", transition: "all 0.12s ease", flexShrink: 0,
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
        <Svg d="M15 18l-6-6 6-6" />
      </Link>

      {/* Logo mark */}
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: "linear-gradient(135deg, #6366F1, #A78BFA)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 1.5L11.5 7L2.5 12.5V1.5Z" fill="#08080A"/>
        </svg>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

      {/* Project name */}
      {editingName ? (
        <input
          autoFocus value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={() => { setProjectName(nameVal); setEditingName(false); }}
          onKeyDown={e => {
            if (e.key === "Enter") { setProjectName(nameVal); setEditingName(false); }
            if (e.key === "Escape") { setNameVal(projectName); setEditingName(false); }
          }}
          style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border-focus)",
            borderRadius: "var(--r-sm)", padding: "4px 8px", fontSize: 13, fontWeight: 600,
            color: "var(--text-primary)", fontFamily: "var(--font-sans)",
            width: 220,
          }}
        />
      ) : (
        <button onClick={() => { setNameVal(projectName); setEditingName(true); }} style={{
          background: "none", border: "none", cursor: "text", padding: "4px 6px",
          borderRadius: "var(--r-sm)",
          fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
          fontFamily: "var(--font-sans)", maxWidth: 240,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {projectName}
          {isDirty && <span style={{ color: "var(--text-muted)", marginLeft: 4, fontSize: 11 }}>•</span>}
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Undo / Redo */}
      <Btn title="Undo (⌘Z)">
        <Svg d={["M9 14L4 9l5-5", "M20 20v-7a4 4 0 00-4-4H4"]} />
      </Btn>
      <Btn title="Redo (⌘⇧Z)">
        <Svg d={["M15 14l5-5-5-5", "M4 20v-7a4 4 0 014-4h12"]} />
      </Btn>

      <div style={{ width: 1, height: 20, background: "var(--border)" }} />

      {/* Aspect ratio badge */}
      <div style={{
        padding: "3px 10px", borderRadius: "var(--r-full)",
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.04em",
      }}>
        {aspectRatio}
      </div>

      {/* Export */}
      <Btn variant="primary" onClick={handleExport} style={{ gap: 6 }}>
        {exporting ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Exporting…
          </>
        ) : (
          <>
            <Svg d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]} />
            Export
          </>
        )}
      </Btn>
    </header>
  );
}
