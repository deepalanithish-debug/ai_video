"use client";

import { useRef, useState, useEffect } from "react";
import { useEditorStore, type BrandKit } from "@/store/editorStore";
import { v4 as uuidv4 } from "uuid";

const FONTS = [
  "Inter", "Playfair Display", "Cormorant Garamond", "DM Serif Display",
  "Montserrat", "Bebas Neue", "Georgia", "Space Grotesk", "Lora", "Poppins",
];
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const DEFAULT_KIT: BrandKit = {
  id: "default-brand",
  name: "My Brand",
  logo: null,
  primaryColor: "#C9A96E",
  secondaryColor: "#1A1A22",
  accentColor: "#A78BFA",
  fontHeading: "Playfair Display",
  fontBody: "Inter",
  captionStyle: {},
  watermark: null,
  intro: null,
  outro: null,
};

const LS_KEY = "vydeoai_brand_kit";

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{
          width: 34, height: 30, borderRadius: "var(--r-sm)",
          background: value, border: "1px solid var(--border-strong)",
          cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0,
        }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer", width: "140%", height: "140%" }} />
        </label>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          style={{
            flex: 1, background: "var(--bg-inset)", border: "1px solid var(--border)",
            borderRadius: "var(--r-xs)", padding: "5px 8px", fontSize: 11,
            color: "var(--text-primary)", fontFamily: "var(--font-mono)", outline: "none",
          }}
        />
      </div>
    </div>
  );
}

export default function BrandTab() {
  const { brandKit, setBrandKit } = useEditorStore();
  const logoRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localKit, setLocalKit] = useState<BrandKit>(DEFAULT_KIT);

  // Load from store or localStorage on mount
  useEffect(() => {
    if (brandKit) {
      setLocalKit(brandKit);
    } else {
      try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as BrandKit;
          setLocalKit(parsed);
          setBrandKit(parsed);
        }
      } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store changes to localKit
  useEffect(() => {
    if (brandKit) setLocalKit(brandKit);
  }, [brandKit]);

  // Update local state and store immediately
  const update = (patch: Partial<BrandKit>) => {
    const updated = { ...localKit, ...patch };
    setLocalKit(updated);
    setBrandKit(updated);
  };

  const handleLogoUpload = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const src = URL.createObjectURL(files[0]);
    update({ logo: src });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Persist to localStorage (exclude File objects and blob URLs that don't survive refresh)
      const toStore = { ...localKit };
      localStorage.setItem(LS_KEY, JSON.stringify(toStore));
      setBrandKit(toStore);
      await new Promise(r => setTimeout(r, 400));
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  };

  const kit = localKit;

  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Kit name */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>
          Kit Name
        </div>
        <input
          value={kit.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="e.g. My Brand"
          style={{
            width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
            borderRadius: "var(--r-md)", padding: "8px 10px",
            fontSize: 13, fontWeight: 600, color: "var(--text-primary)", outline: "none",
            transition: "border-color 0.12s",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      {/* Logo */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>
          Logo
        </div>
        <div
          onClick={() => logoRef.current?.click()}
          style={{
            height: 80, border: "1.5px dashed var(--border)", borderRadius: "var(--r-md)",
            background: "var(--bg-inset)", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", gap: 8, position: "relative",
            overflow: "hidden", transition: "border-color 0.12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-dim)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >
          {kit.logo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kit.logo} alt="Brand Logo"
                style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", padding: 8 }} />
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 11, fontWeight: 600, color: "transparent",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.55)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0)"; e.currentTarget.style.color = "transparent"; }}>
                Change logo
              </div>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Upload brand logo</span>
            </>
          )}
          <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleLogoUpload(e.target.files)} />
        </div>
      </div>

      {/* Colors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Brand Colors
        </div>
        <ColorInput label="Primary" value={kit.primaryColor} onChange={v => update({ primaryColor: v })} />
        <ColorInput label="Secondary" value={kit.secondaryColor} onChange={v => update({ secondaryColor: v })} />
        <ColorInput label="Accent" value={kit.accentColor} onChange={v => update({ accentColor: v })} />
      </div>

      {/* Typography */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Typography
        </div>
        {([["Heading Font", "fontHeading"], ["Body Font", "fontBody"]] as [string, "fontHeading" | "fontBody"][]).map(([label, key]) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
            <select
              value={kit[key] as string}
              onChange={e => update({ [key]: e.target.value })}
              style={{
                width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)", padding: "6px 8px",
                fontSize: 12, color: "var(--text-primary)", cursor: "pointer", outline: "none",
              }}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        ))}
        {/* Caption font size */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Caption Font Size</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {FONT_SIZES.map(sz => {
              const current = (kit.captionStyle as Record<string, number>)?.fontSize ?? 16;
              const isActive = current === sz;
              return (
                <button key={sz} onClick={() => update({ captionStyle: { ...(kit.captionStyle as Record<string, number>), fontSize: sz } })}
                  style={{
                    padding: "3px 8px", borderRadius: "var(--r-xs)", fontSize: 10, fontWeight: 600,
                    background: isActive ? "var(--accent-bg)" : "var(--bg-elevated)",
                    border: `1px solid ${isActive ? "var(--accent-dim)" : "var(--border)"}`,
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}>
                  {sz}px
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: "14px", borderRadius: "var(--r-md)",
        background: kit.secondaryColor, border: "1px solid var(--border-strong)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Watermark logo */}
        {kit.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kit.logo} alt="Logo watermark"
            style={{ position: "absolute", top: 8, right: 8, height: 24, opacity: 0.6, objectFit: "contain" }} />
        )}
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.08em" }}>PREVIEW</div>
        <div style={{ fontFamily: kit.fontHeading, fontSize: 20, color: kit.primaryColor, marginBottom: 4, fontWeight: 700, lineHeight: 1.2 }}>
          {kit.name}
        </div>
        <div style={{ fontFamily: kit.fontBody, fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
          Body text and captions
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[kit.primaryColor, kit.secondaryColor, kit.accentColor].map((c, i) => (
            <div key={i} title={c} style={{
              width: 22, height: 22, borderRadius: "var(--r-xs)",
              background: c, border: "1px solid rgba(255,255,255,0.15)",
            }} />
          ))}
        </div>
        {/* Caption preview */}
        <div style={{
          marginTop: 10, padding: "4px 10px", display: "inline-block",
          fontFamily: kit.fontBody,
          fontSize: (kit.captionStyle as Record<string, number>)?.fontSize ?? 14,
          color: kit.primaryColor, background: "rgba(0,0,0,0.45)",
          borderRadius: 4,
        }}>
          Sample caption text
        </div>
      </div>

      {/* Apply to all captions */}
      <button
        onClick={() => {
          const { scenes, updateScene } = useEditorStore.getState();
          scenes.forEach(sc => {
            const updatedCaptions = sc.captions.map(cap => ({
              ...cap,
              fontFamily: kit.fontBody,
              color: kit.primaryColor,
              fontSize: (kit.captionStyle as Record<string, number>)?.fontSize ?? cap.fontSize,
            }));
            updateScene(sc.id, { captions: updatedCaptions });
          });
        }}
        style={{
          width: "100%", padding: "8px 0",
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          borderRadius: "var(--r-md)", color: "var(--text-secondary)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-dim)"; e.currentTarget.style.background = "var(--accent-bg)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        Apply Brand to All Captions
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: "100%", padding: "10px 0", borderRadius: "var(--r-md)",
          background: saved ? "var(--success-bg)" : "var(--accent)",
          color: saved ? "var(--success)" : "#FFFFFF",
          border: `1px solid ${saved ? "var(--success)" : "transparent"}`,
          fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          opacity: saving ? 0.7 : 1, transition: "all 0.2s",
        }}>
        {saving ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Saving…
          </>
        ) : saved ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Brand Kit Saved!
          </>
        ) : "Save Brand Kit"}
      </button>
    </div>
  );
}
