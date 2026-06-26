"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useEditorStore, type Caption } from "@/store/editorStore";

const LS_KEY_KITS = "vydeoai_brand_kits_v1";
const LS_KEY_ACTIVE = "vydeoai_brand_active_v1";

const FONTS = ["Inter", "Playfair Display", "Cormorant Garamond", "DM Serif Display", "Montserrat", "Bebas Neue", "Georgia", "Space Grotesk", "Libre Baskerville"];

const PRESET_PALETTES = [
  { name: "Luxury Gold", colors: ["#C9A96E", "#1A1A22", "#A78BFA"] },
  { name: "Pure White", colors: ["#FFFFFF", "#0D0D0F", "#60A5FA"] },
  { name: "Rouge Rose", colors: ["#F472B6", "#18181B", "#E879F9"] },
  { name: "Ocean Blue", colors: ["#38BDF8", "#0F172A", "#34D399"] },
  { name: "Emerald", colors: ["#34D399", "#111827", "#F59E0B"] },
  { name: "Midnight", colors: ["#8B5CF6", "#020617", "#EC4899"] },
];

interface Kit {
  id: string; name: string;
  logo: string | null;
  primary: string; secondary: string; accent: string;
  fontHeading: string; fontBody: string;
  captionPreset: string;
}

// Translate a caption preset name into concrete caption style fields that the
// editor store (BrandKit.captionStyle: Partial<Caption>) actually consumes.
const CAPTION_PRESETS: Record<string, Partial<Caption>> = {
  luxury:    { fontSize: 22, bold: false, italic: true,  align: "center", animation: "fade",     letterSpacing: 1, stroke: false, shadow: true },
  minimal:   { fontSize: 16, bold: false, italic: false, align: "center", animation: "fade",     letterSpacing: 0, stroke: false, shadow: false },
  bold:      { fontSize: 28, bold: true,  italic: false, align: "center", animation: "scale",    letterSpacing: 0, stroke: true,  shadow: true },
  subtitle:  { fontSize: 18, bold: false, italic: false, align: "center", animation: "none",     letterSpacing: 0, stroke: false, shadow: true },
};

function captionStyleForPreset(preset: string): Partial<Caption> {
  return CAPTION_PRESETS[preset] ?? CAPTION_PRESETS.minimal;
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", width: 36, height: 36, borderRadius: "var(--r-sm)", overflow: "hidden", border: "1px solid var(--border-strong)" }}>
          <div style={{ position: "absolute", inset: 0, background: value }} />
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer", width: "calc(100% + 8px)", height: "calc(100% + 8px)" }} />
        </div>
        <input value={value} onChange={e => onChange(e.target.value)} style={{
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)", padding: "6px 10px", fontSize: 12,
          color: "var(--text-primary)", fontFamily: "var(--font-mono)", flex: 1,
        }} />
      </div>
    </div>
  );
}

const DEFAULT_KIT: Kit = {
  id: "main-brand",
  name: "Main Brand",
  logo: null,
  primary: "#C9A96E",
  secondary: "#1A1A22",
  accent: "#A78BFA",
  fontHeading: "Playfair Display",
  fontBody: "Inter",
  captionPreset: "luxury",
};

export default function BrandKitPage() {
  const { setBrandKit } = useEditorStore();
  const [kits, setKits] = useState<Kit[]>([DEFAULT_KIT]);
  const [activeId, setActiveId] = useState<string>(DEFAULT_KIT.id);
  const [saved, setSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_KITS);
      if (stored) {
        const parsed = JSON.parse(stored) as Kit[];
        if (parsed.length > 0) {
          setKits(parsed);
          const storedActive = localStorage.getItem(LS_KEY_ACTIVE);
          const validActive = storedActive && parsed.find(k => k.id === storedActive);
          setActiveId(validActive ? storedActive! : parsed[0].id);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const kit = kits.find(k => k.id === activeId) ?? kits[0];
  const update = (patch: Partial<Kit>) => {
    setKits(prev => prev.map(k => k.id === activeId ? { ...k, ...patch } : k));
    setSaved(false);
  };

  const addKit = () => {
    const newKit: Kit = {
      id: uuidv4(), name: "New Brand", logo: null,
      primary: "#FFFFFF", secondary: "#000000", accent: "#0066FF",
      fontHeading: "Inter", fontBody: "Inter", captionPreset: "minimal",
    };
    setKits(prev => [...prev, newKit]);
    setActiveId(newKit.id);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(false);
    // Persist kits to localStorage. Strip only blob: URLs (they don't survive a
    // refresh); data: URL logos are serializable and ARE kept.
    try {
      const toStore = kits.map(k => ({ ...k, logo: k.logo?.startsWith("blob:") ? null : k.logo }));
      localStorage.setItem(LS_KEY_KITS, JSON.stringify(toStore));
      localStorage.setItem(LS_KEY_ACTIVE, activeId);
    } catch { /* quota */ }

    // Sync active kit to editor store, mapping the chosen caption preset into
    // the caption style payload so it actually reaches the editor.
    setBrandKit({
      id: kit.id, name: kit.name, logo: kit.logo,
      primaryColor: kit.primary, secondaryColor: kit.secondary, accentColor: kit.accent,
      fontHeading: kit.fontHeading, fontBody: kit.fontBody,
      captionStyle: captionStyleForPreset(kit.captionPreset), watermark: null, intro: null, outro: null,
    });

    // This is a local save (localStorage + in-memory editor store), not a
    // server round-trip — message accordingly.
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (files: FileList | null) => {
    if (!files?.[0]) return;
    // Read as a data: URL — these persist in localStorage and reach the editor
    // store (blob: URLs don't survive a refresh).
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update({ logo: reader.result });
    };
    reader.readAsDataURL(files[0]);
  };

  return (
    <div style={{ padding: "32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Brand Kit
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, margin: "4px 0 0" }}>
            Define your brand identity — colors, fonts, and presets used across all exports.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} style={{
          padding: "9px 20px", borderRadius: "var(--r-md)",
          background: saved ? "var(--success)" : "var(--accent)", color: "#FFFFFF",
          border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
          transition: "background 0.3s ease",
        }}>
          {saved ? "✓ Saved on this device" : "Save Kit"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        {/* Kit list sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
            Kits
          </div>
          {kits.map(k => (
            <button key={k.id} onClick={() => setActiveId(k.id)} style={{
              padding: "10px 12px", borderRadius: "var(--r-md)", textAlign: "left",
              background: k.id === activeId ? "var(--accent-bg)" : "var(--bg-elevated)",
              border: `1px solid ${k.id === activeId ? "var(--accent-dim)" : "var(--border)"}`,
              color: k.id === activeId ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[k.primary, k.secondary, k.accent].map((c, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {k.name}
              </span>
            </button>
          ))}
          <button onClick={addKit} style={{
            padding: "9px 12px", borderRadius: "var(--r-md)", textAlign: "left",
            background: "none", border: "1.5px dashed var(--border)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Kit
          </button>
        </div>

        {/* Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Kit name */}
          <div style={{
            padding: "20px 24px", borderRadius: "var(--r-xl)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Kit Name</div>
            <input value={kit.name} onChange={e => update({ name: e.target.value })}
              style={{
                width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", padding: "10px 14px",
                fontSize: 16, fontWeight: 700, color: "var(--text-primary)",
              }} />
          </div>

          {/* Logo */}
          <div style={{
            padding: "20px 24px", borderRadius: "var(--r-xl)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>Logo</div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                onClick={() => logoRef.current?.click()}
                style={{
                  width: 120, height: 80, borderRadius: "var(--r-lg)",
                  border: "1.5px dashed var(--border)", background: "var(--bg-inset)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", overflow: "hidden", position: "relative",
                }}>
                {kit.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={kit.logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: "0 auto 4px" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Upload</div>
                  </div>
                )}
                <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => handleLogoUpload(e.target.files)} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                SVG, PNG, or WebP recommended.<br />Will appear as watermark on exports.
              </div>
            </div>
          </div>

          {/* Colors */}
          <div style={{
            padding: "20px 24px", borderRadius: "var(--r-xl)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Brand Colors
            </div>

            {/* Preset palettes */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {PRESET_PALETTES.map(p => (
                <button key={p.name} onClick={() => update({ primary: p.colors[0], secondary: p.colors[1], accent: p.colors[2] })}
                  title={p.name}
                  style={{
                    display: "flex", gap: 3, alignItems: "center", padding: "4px 8px",
                    borderRadius: 99, border: "1px solid var(--border)",
                    background: "var(--bg-elevated)", cursor: "pointer",
                  }}>
                  {p.colors.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 2 }}>{p.name}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <ColorSwatch label="Primary" value={kit.primary} onChange={v => update({ primary: v })} />
              <ColorSwatch label="Secondary" value={kit.secondary} onChange={v => update({ secondary: v })} />
              <ColorSwatch label="Accent" value={kit.accent} onChange={v => update({ accent: v })} />
            </div>
          </div>

          {/* Typography */}
          <div style={{
            padding: "20px 24px", borderRadius: "var(--r-xl)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Typography
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Heading Font", "fontHeading"], ["Body Font", "fontBody"]].map(([label, key]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                  <select value={kit[key as "fontHeading" | "fontBody"]} onChange={e => update({ [key]: e.target.value })}
                    style={{
                      width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border)",
                      borderRadius: "var(--r-md)", padding: "8px 10px",
                      fontSize: 13, color: "var(--text-primary)",
                    }}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div style={{
            padding: "24px", borderRadius: "var(--r-xl)",
            background: kit.secondary, border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${kit.primary}80`, marginBottom: 12 }}>
              Brand Preview
            </div>
            <div style={{ fontFamily: kit.fontHeading, fontSize: 28, color: kit.primary, marginBottom: 8, letterSpacing: "-0.02em" }}>
              {kit.name}
            </div>
            <div style={{ fontFamily: kit.fontBody, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Your brand voice and aesthetic, applied consistently across all video exports.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ padding: "8px 16px", borderRadius: 99, background: kit.primary, color: kit.secondary, fontSize: 12, fontWeight: 700, fontFamily: kit.fontBody }}>
                Primary CTA
              </div>
              <div style={{ padding: "8px 16px", borderRadius: 99, border: `1px solid ${kit.primary}60`, color: kit.primary, fontSize: 12, fontWeight: 600, fontFamily: kit.fontBody }}>
                Accent
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
