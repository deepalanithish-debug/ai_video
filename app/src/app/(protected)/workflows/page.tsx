"use client";

import { useState } from "react";

const WORKFLOW_TEMPLATES = [
  {
    name: "Auto-Caption Generator",
    description: "Automatically generate captions for every new video project using Whisper AI",
    trigger: "Project Created", steps: 4, category: "Automation",
    icon: "✦", color: "#C9A96E",
  },
  {
    name: "Brand Consistency Check",
    description: "Validate every export against your brand guidelines before publish",
    trigger: "Export Ready", steps: 3, category: "Quality",
    icon: "◈", color: "#A78BFA",
  },
  {
    name: "Multi-Platform Resize",
    description: "Export to 9:16, 1:1, and 16:9 simultaneously when a video is finalized",
    trigger: "Project Finalized", steps: 6, category: "Publishing",
    icon: "⊕", color: "#34D399",
  },
  {
    name: "Slack Notification",
    description: "Post a Slack message with preview link when a video is ready for review",
    trigger: "Export Complete", steps: 2, category: "Collaboration",
    icon: "◎", color: "#60A5FA",
  },
  {
    name: "Trend-Based Regeneration",
    description: "Watch trending hashtags and automatically suggest new video concepts",
    trigger: "Scheduled (Daily)", steps: 5, category: "AI",
    icon: "⚡", color: "#F87171",
  },
  {
    name: "Auto-Publish to Instagram",
    description: "Directly publish approved Reels to Instagram via Meta API",
    trigger: "Approved for Publish", steps: 3, category: "Publishing",
    icon: "→", color: "#EC4899",
  },
];

type Status = "idle" | "running" | "done";

export default function WorkflowsPage() {
  const [activeWorkflows, setActiveWorkflows] = useState<Record<string, Status>>({});
  const [connected, setConnected] = useState(false);

  const toggleWorkflow = (name: string) => {
    setActiveWorkflows(prev => ({
      ...prev,
      [name]: prev[name] === "running" ? "idle" : "running",
    }));
  };

  return (
    <div style={{ padding: "32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
              n8n Workflows
            </h1>
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800,
              background: "var(--ai-bg)", color: "var(--ai)", border: "1px solid var(--ai-dim)",
              letterSpacing: "0.08em",
            }}>BETA</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Automate your video creation pipeline using n8n — connect to any tool, trigger AI tasks, and publish everywhere.
          </p>
        </div>

        {/* n8n connection status */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: "var(--r-md)",
            background: connected ? "rgba(52,211,153,0.08)" : "var(--bg-elevated)",
            border: `1px solid ${connected ? "rgba(52,211,153,0.25)" : "var(--border)"}`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: connected ? "var(--success)" : "var(--text-muted)",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: connected ? "var(--success)" : "var(--text-muted)" }}>
              {connected ? "n8n Connected" : "n8n Disconnected"}
            </span>
            <button onClick={() => setConnected(!connected)} style={{
              padding: "4px 10px", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 700,
              background: connected ? "var(--error-bg)" : "var(--accent-bg)",
              border: `1px solid ${connected ? "rgba(248,113,113,0.2)" : "var(--accent-dim)"}`,
              color: connected ? "var(--error)" : "var(--accent)", cursor: "pointer",
            }}>
              {connected ? "Disconnect" : "Connect"}
            </button>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            Preview — n8n integration coming soon
          </span>
        </div>
      </div>

      {/* Setup notice if not connected */}
      {!connected && (
        <div style={{
          padding: "16px 20px", borderRadius: "var(--r-xl)",
          background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
          marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "var(--r-md)", flexShrink: 0,
            background: "var(--ai-bg)", border: "1px solid var(--ai-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ai)", fontSize: 16,
          }}>
            ◈
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ai)", marginBottom: 4 }}>
              Connect your n8n instance to unlock automation
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Set your <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>N8N_WEBHOOK_URL</code> and{" "}
              <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-overlay)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>N8N_API_KEY</code>{" "}
              in your environment variables to enable automated workflows.
            </div>
          </div>
        </div>
      )}

      {/* Workflow grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {WORKFLOW_TEMPLATES.map(w => {
          const status = activeWorkflows[w.name] ?? "idle";
          return (
            <div key={w.name} style={{
              padding: "20px", borderRadius: "var(--r-xl)",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: 14,
              transition: "border-color 0.15s ease",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Icon + category */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "var(--r-md)",
                  background: `color-mix(in srgb, ${w.color} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${w.color} 30%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: w.color,
                }}>
                  {w.icon}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700,
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {w.category}
                  </span>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: status === "running" ? "var(--success)" : "var(--text-disabled)",
                    boxShadow: status === "running" ? "0 0 6px var(--success)" : "none",
                  }} />
                </div>
              </div>

              {/* Info */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 5 }}>
                  {w.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {w.description}
                </div>
              </div>

              {/* Meta */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  padding: "3px 7px", borderRadius: 99,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
                }}>
                  ⚡ {w.trigger}
                </div>
                <div style={{
                  padding: "3px 7px", borderRadius: 99,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
                }}>
                  {w.steps} steps
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => connected && toggleWorkflow(w.name)}
                disabled={!connected}
                style={{
                  width: "100%", padding: "8px 0", borderRadius: "var(--r-md)", fontSize: 12, fontWeight: 700,
                  background: status === "running" ? "rgba(52,211,153,0.1)" : "var(--bg-elevated)",
                  border: `1px solid ${status === "running" ? "rgba(52,211,153,0.25)" : "var(--border)"}`,
                  color: status === "running" ? "var(--success)" : "var(--text-secondary)",
                  cursor: connected ? "pointer" : "not-allowed",
                  opacity: !connected ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.15s ease",
                }}>
                {status === "running" ? (
                  <><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} /> Active</>
                ) : (
                  <>Enable Workflow</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32, padding: "16px 20px", borderRadius: "var(--r-xl)",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Each workflow runs via n8n. You can create custom workflows in your n8n dashboard and connect them here via webhooks.{" "}
          <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Learn more →
          </a>
        </div>
      </div>
    </div>
  );
}
