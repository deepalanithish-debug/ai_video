"use client";

import { useState } from "react";
import { useEditorStore, type LeftTab } from "@/store/editorStore";
import MediaTab from "./MediaTab";
import TextTab from "./TextTab";
import MusicTab from "./MusicTab";
import TransitionsTab from "./TransitionsTab";
import BrandTab from "./BrandTab";
import AITab from "./AITab";

const TABS: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: "media", label: "Media", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M10 9l5 3-5 3V9z"/>
    </svg>
  )},
  { id: "text", label: "Text", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  )},
  { id: "music", label: "Music", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  )},
  { id: "transitions", label: "Trans", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
    </svg>
  )},
  { id: "brand", label: "Brand", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  )},
  { id: "ai", label: "AI", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )},
];

export default function LeftPanel() {
  const { leftTab, setLeftTab } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      display: "flex",
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      flexShrink: 0,
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Icon rail */}
      <div style={{
        width: 48, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 2, paddingTop: 8,
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setLeftTab(tab.id); setCollapsed(false); }}
            title={tab.label}
            style={{
              width: 36, height: 36, borderRadius: "var(--r-md)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: leftTab === tab.id && !collapsed ? "var(--accent-bg)" : "transparent",
              border: "none", cursor: "pointer",
              color: leftTab === tab.id && !collapsed ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.12s ease", gap: 2,
            }}
            onMouseEnter={e => {
              if (leftTab !== tab.id || collapsed) {
                e.currentTarget.style.background = "var(--bg-elevated)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
            onMouseLeave={e => {
              if (leftTab !== tab.id || collapsed) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1 }}>
              {tab.label}
            </span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          style={{
            width: 28, height: 28, borderRadius: "var(--r-sm)", marginBottom: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            cursor: "pointer", color: "var(--text-muted)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
          </svg>
        </button>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div style={{ width: 240, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 14px 8px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {TABS.find(t => t.id === leftTab)?.label}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {leftTab === "media" && <MediaTab />}
            {leftTab === "text" && <TextTab />}
            {leftTab === "music" && <MusicTab />}
            {leftTab === "transitions" && <TransitionsTab />}
            {leftTab === "brand" && <BrandTab />}
            {leftTab === "ai" && <AITab />}
          </div>
        </div>
      )}
    </div>
  );
}
