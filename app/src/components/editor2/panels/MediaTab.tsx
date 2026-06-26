"use client";

import { useRef, useState } from "react";
import { useEditorStore, type Clip } from "@/store/editorStore";
import { v4 as uuidv4 } from "uuid";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDur(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
function isVideo(f: File) {
  return f.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(f.name);
}
function isImage(f: File) {
  return f.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(f.name);
}

function ClipCard({ clip, scenes, onRemove }: {
  clip: Clip;
  scenes: ReturnType<typeof useEditorStore.getState>["scenes"];
  onRemove: () => void;
}) {
  const { assignClip, unassignClip } = useEditorStore();
  const [showPicker, setShowPicker] = useState(false);
  const assignedScene = scenes.find(s => s.clipId === clip.id);

  return (
    <div style={{
      borderRadius: "var(--r-lg)", overflow: "hidden",
      background: "var(--bg-elevated)", border: `1px solid ${assignedScene ? "var(--accent-dim)" : "var(--border)"}`,
      transition: "all 0.12s",
    }}>
      {/* Thumbnail */}
      <div style={{ height: 80, background: "var(--bg-overlay)", position: "relative", overflow: "hidden" }}>
        {clip.type === "video" ? (
          <video src={clip.src} preload="metadata" muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.src} alt={clip.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {/* Type badge */}
        <div style={{
          position: "absolute", top: 5, left: 5,
          padding: "2px 6px", borderRadius: 99, fontSize: 8, fontWeight: 800,
          background: clip.type === "video" ? "rgba(99,102,241,0.8)" : "rgba(52,211,153,0.8)",
          color: "#fff", letterSpacing: "0.06em",
        }}>
          {clip.type === "video" ? "VIDEO" : "IMAGE"}
        </div>
        {/* Remove */}
        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{
          position: "absolute", top: 5, right: 5,
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        {/* Duration */}
        {clip.type === "video" && (
          <div style={{
            position: "absolute", bottom: 5, right: 5,
            padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 700,
            background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.85)",
          }}>
            {formatDur(clip.duration)}
          </div>
        )}
      </div>

      {/* Info & actions */}
      <div style={{ padding: "8px 10px 9px" }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2,
        }}>
          {clip.name.replace(/\.[^.]+$/, "")}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 7 }}>
          {formatSize(clip.file.size)}
        </div>

        {/* Assignment */}
        {assignedScene ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ flex: 1, fontSize: 10, color: "var(--accent)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              → {assignedScene.label}
            </div>
            <button
              onClick={() => unassignClip(assignedScene.id)}
              style={{
                background: "var(--error-bg)", border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "var(--r-xs)", color: "var(--error)",
                fontSize: 9, fontWeight: 700, cursor: "pointer", padding: "2px 6px", flexShrink: 0,
              }}>
              Unassign
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              style={{
                width: "100%", padding: "5px 0",
                background: "var(--accent-bg)", border: "1px solid var(--accent-dim)",
                borderRadius: "var(--r-sm)", color: "var(--accent)",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Assign to Scene
            </button>

            {/* Scene picker dropdown */}
            {showPicker && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", overflow: "hidden",
                boxShadow: "var(--shadow-xl)",
              }}>
                {scenes.filter(s => !s.clipId).length === 0 ? (
                  <div style={{ padding: "10px 12px", fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
                    All scenes have clips assigned
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "6px 10px 4px", fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Select a scene
                    </div>
                    <div style={{ maxHeight: 160, overflowY: "auto" }}>
                      {scenes.filter(s => !s.clipId).map(sc => (
                        <button key={sc.id}
                          onClick={() => { assignClip(clip.id, sc.id); setShowPicker(false); }}
                          style={{
                            width: "100%", textAlign: "left", padding: "7px 10px",
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 11, color: "var(--text-secondary)",
                            borderTop: "1px solid var(--border-subtle)",
                            display: "flex", alignItems: "center", gap: 7, transition: "background 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
                            minWidth: 18, textAlign: "right",
                          }}>
                            {String((sc.order ?? 0) + 1).padStart(2, "0")}
                          </span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sc.label}
                          </span>
                          <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>{sc.duration}s</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => setShowPicker(false)} style={{ width: "100%", padding: "6px 0", background: "var(--bg-inset)", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 10, color: "var(--text-muted)" }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaTab() {
  const { clips, scenes, addClip, removeClip, assignClip } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!isVideo(file) && !isImage(file)) return;
      const src = URL.createObjectURL(file);
      const type: "video" | "image" = isVideo(file) ? "video" : "image";
      const clip: Clip = { id: uuidv4(), name: file.name, src, file, type, duration: 4 };
      addClip(clip);
      if (type === "video") {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.onloadedmetadata = () => {
          useEditorStore.setState(s => ({
            clips: s.clips.map(x => x.id === clip.id ? { ...x, duration: Math.round(el.duration) } : x),
          }));
        };
        el.src = src;
      }
    });
  };

  const unassignedScenes = scenes.filter(s => !s.clipId);

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-bg)"; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-inset)"; }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-inset)"; handleFiles(e.dataTransfer.files); }}
        style={{
          border: "1.5px dashed var(--border)", borderRadius: "var(--r-xl)",
          padding: "18px 12px", textAlign: "center", cursor: "pointer",
          background: "var(--bg-inset)", transition: "all 0.15s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.background = "var(--accent-bg)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-inset)"; }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ margin: "0 auto 7px", display: "block" }}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>
          Upload Media
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          Drag & drop or click · MP4, MOV, JPG, PNG
        </div>
        <input ref={inputRef} type="file" multiple accept="video/*,image/*,.mov,.mp4,.webm,.heic" style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Auto-assign button */}
      {clips.length > 0 && unassignedScenes.length > 0 && (
        <button
          onClick={() => {
            const store = useEditorStore.getState();
            const unclipped = store.clips.filter(c => !store.scenes.find(s => s.clipId === c.id));
            store.scenes.filter(s => !s.clipId).forEach((sc, i) => {
              if (unclipped[i]) store.assignClip(unclipped[i].id, sc.id);
            });
          }}
          style={{
            width: "100%", padding: "8px 0", borderRadius: "var(--r-md)",
            background: "var(--accent-bg)", border: "1px solid var(--accent-dim)",
            color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L20 7"/></svg>
          Auto-assign {Math.min(clips.length, unassignedScenes.length)} clips to scenes
        </button>
      )}

      {/* Summary */}
      {scenes.length > 0 && (
        <div style={{
          padding: "8px 10px", borderRadius: "var(--r-md)",
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          display: "flex", gap: 12,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{clips.length}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Uploaded</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>
              {scenes.filter(s => s.clipId).length}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Assigned</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: unassignedScenes.length > 0 ? "var(--warning, #F59E0B)" : "var(--success)" }}>
              {unassignedScenes.length}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Empty</div>
          </div>
        </div>
      )}

      {/* Clip grid */}
      {clips.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "var(--text-disabled)" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div>No clips yet. Upload to get started.</div>
          {scenes.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
              You have {scenes.length} scenes ready to fill.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {clips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              scenes={scenes}
              onRemove={() => {
                const sc = scenes.find(s => s.clipId === clip.id);
                if (sc) useEditorStore.getState().unassignClip(sc.id);
                removeClip(clip.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
