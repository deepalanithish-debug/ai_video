"use client";

import { useState, useRef, useEffect } from "react";

interface Asset {
  id: string;
  name: string;
  type: "video" | "image" | "audio";
  src: string;
  size: number;
  added: number;
}

const LS_KEY_ASSETS = "vydeoai_assets_v1";

function formatSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_COLORS: Record<string, string> = { video: "var(--accent)", image: "var(--ai)", audio: "var(--success)" };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "audio">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount. blob: URLs do NOT survive a reload, so
  // any persisted entry pointing at one is dropped (its blob is already gone).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_ASSETS);
      if (stored) {
        const parsed = JSON.parse(stored) as Asset[];
        setAssets(parsed.filter(a => a.src && !a.src.startsWith("blob:")));
      }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration so we don't clobber stored data with the
  // initial empty array). Only serializable assets survive — blob: uploads are
  // session-only and are intentionally not written back.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const toStore = assets.filter(a => !a.src.startsWith("blob:"));
      localStorage.setItem(LS_KEY_ASSETS, JSON.stringify(toStore));
    } catch { /* quota */ }
  }, [assets, hydrated]);

  // Keep a ref in sync so the unmount cleanup sees the latest assets.
  const assetsRef = useRef<Asset[]>(assets);
  assetsRef.current = assets;

  // Revoke every blob: URL we created when the page unmounts to stop the leak.
  useEffect(() => {
    return () => {
      assetsRef.current.forEach(a => {
        if (a.src.startsWith("blob:")) URL.revokeObjectURL(a.src);
      });
    };
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const type: Asset["type"] = file.type.startsWith("video/") ? "video"
        : file.type.startsWith("image/") ? "image" : "audio";
      setAssets(prev => [...prev, {
        id: crypto.randomUUID(), name: file.name,
        type, src: URL.createObjectURL(file),
        size: file.size, added: Date.now(),
      }]);
    });
  };

  // Single delete path for both grid and list: revoke the blob, then filter.
  const handleDelete = (id: string) => {
    setAssets(prev => {
      const target = prev.find(a => a.id === id);
      if (target?.src.startsWith("blob:")) URL.revokeObjectURL(target.src);
      return prev.filter(a => a.id !== id);
    });
  };

  const filtered = assets.filter(a => filter === "all" || a.type === filter);

  return (
    <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Assets</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>All your uploaded media — videos, images, and audio tracks.</p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => inputRef.current?.click()} style={{
          padding: "9px 18px", borderRadius: "var(--r-md)",
          background: "var(--accent)", color: "#FFFFFF",
          border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload
        </button>
        <input ref={inputRef} type="file" multiple accept="video/*,image/*,audio/*" style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Filters + view toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        {(["all", "video", "image", "audio"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: filter === f ? "var(--accent-bg)" : "var(--bg-elevated)",
            border: `1px solid ${filter === f ? "var(--accent-dim)" : "var(--border)"}`,
            color: filter === f ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer", textTransform: "capitalize",
          }}>
            {f === "all" ? `All (${assets.length})` : `${f} (${assets.filter(a => a.type === f).length})`}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {(["grid", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            width: 30, height: 30, borderRadius: "var(--r-sm)",
            background: view === v ? "var(--bg-overlay)" : "transparent",
            border: `1px solid ${view === v ? "var(--border)" : "transparent"}`,
            cursor: "pointer", color: view === v ? "var(--text-primary)" : "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {v === "grid"
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        ))}
      </div>

      {/* Drop zone / Empty */}
      {filtered.length === 0 ? (
        <div
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; handleFiles(e.dataTransfer.files); }}
          style={{
            border: "2px dashed var(--border)", borderRadius: "var(--r-xl)",
            padding: "60px 32px", textAlign: "center",
            background: "var(--bg-surface)", cursor: "pointer",
            transition: "border-color 0.15s ease",
          }}
          onClick={() => inputRef.current?.click()}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" style={{ margin: "0 auto 14px" }}>
            <rect x="2" y="2" width="20" height="20" rx="2.5"/>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            {filter === "all" ? "No assets yet" : `No ${filter} assets`}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Drag & drop files here or click to upload
          </div>
        </div>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              borderRadius: "var(--r-lg)", overflow: "hidden",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              transition: "border-color 0.12s ease",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Thumb */}
              <div style={{ height: 110, background: "var(--bg-inset)", position: "relative", overflow: "hidden" }}>
                {a.type === "video" && <video src={a.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} preload="metadata" muted />}
                {a.type === "image" && <img src={a.src} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {a.type === "audio" && (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  position: "absolute", top: 6, left: 6,
                  padding: "2px 6px", borderRadius: 99, fontSize: 8, fontWeight: 800,
                  background: "rgba(0,0,0,0.6)", color: TYPE_COLORS[a.type],
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {a.type}
                </div>
                {/* Delete */}
                <button onClick={() => handleDelete(a.id)} aria-label={`Delete ${a.name}`} style={{
                  position: "absolute", top: 6, right: 6,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "#FFFFFF", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {/* Meta */}
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.name.replace(/\.[^.]+$/, "")}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{formatSize(a.size)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              borderRadius: "var(--r-md)", background: "var(--bg-surface)",
              border: "1px solid transparent", transition: "all 0.12s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <div style={{ width: 36, height: 28, borderRadius: "var(--r-sm)", background: "var(--bg-inset)", overflow: "hidden", flexShrink: 0 }}>
                {a.type === "video" && <video src={a.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />}
                {a.type === "image" && <img src={a.src} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {a.type === "audio" && <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><path d="M9 18V5l12-2v13"/></svg>
                </div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{formatSize(a.size)} · {new Date(a.added).toLocaleDateString()}</div>
              </div>
              <span style={{
                padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700,
                background: `color-mix(in srgb, ${TYPE_COLORS[a.type]} 12%, transparent)`,
                color: TYPE_COLORS[a.type], border: `1px solid color-mix(in srgb, ${TYPE_COLORS[a.type]} 25%, transparent)`,
                textTransform: "uppercase",
              }}>
                {a.type}
              </span>
              <button onClick={() => handleDelete(a.id)} aria-label={`Delete ${a.name}`} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: 4, display: "flex",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
