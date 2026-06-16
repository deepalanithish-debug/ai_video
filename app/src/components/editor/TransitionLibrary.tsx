"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Scene, Timeline, TransitionType } from "@/types/timeline";
import {
  TRANSITION_CATALOG, TRANSITION_CATEGORIES, EASING_OPTIONS,
  runTransitionAnimation, cancelTransitionAnimations, getSmartSuggestions,
  DEFAULT_ANIM_CONFIG,
  type TransitionDef, type TransitionAnimConfig, type TransitionCategory,
} from "@/lib/transitionAnimations";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransitionConfig {
  type: string;
  duration: number;
  speed?: "slow" | "normal" | "fast";
  intensity?: number;
  direction?: "left" | "right" | "up" | "down" | "auto";
  mode?: "in" | "out" | "both";
  easing?: string;
  blurAmount?: number;
  motionStrength?: number;
}

interface TransitionLibraryProps {
  sceneId: string;
  sceneName: string;
  currentTransition?: Scene["transition"];
  scene: Scene | null;
  prevScene: Scene | null;
  timeline: Timeline | null;
  onApply: (config: TransitionConfig) => void;
  onClose: () => void;
}

// ─── Mini animated preview card ───────────────────────────────────────────────

function PreviewCard({
  def,
  selected,
  config,
  onClick,
  size = "sm",
}: {
  def: TransitionDef;
  selected: boolean;
  config: TransitionAnimConfig;
  onClick: () => void;
  size?: "sm" | "lg";
}) {
  const outRef = useRef<HTMLDivElement>(null);
  const inRef  = useRef<HTMLDivElement>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const w = size === "lg" ? 96  : 64;
  const h = size === "lg" ? 130 : 86;

  const reset = useCallback(() => {
    const a = outRef.current; const b = inRef.current;
    if (!a || !b) return;
    cancelTransitionAnimations(a, b);
    a.style.cssText = `position:absolute;inset:0;z-index:1;`;
    b.style.cssText = `position:absolute;inset:0;z-index:2;opacity:0;`;
  }, []);

  const play = useCallback(() => {
    const a = outRef.current; const b = inRef.current;
    if (!a || !b) return;
    reset();
    if (def.type === "cut" || def.type === "hard-cut") {
      b.style.opacity = "1"; return;
    }
    runTransitionAnimation(a, b, { ...config, type: def.type, durationMs: 650 });
  }, [def.type, config, reset]);

  const startLoop = useCallback(() => {
    play();
    loopRef.current = setInterval(play, 1400);
  }, [play]);

  const stopLoop = useCallback(() => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    reset();
  }, [reset]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  // Auto-play when selected
  useEffect(() => {
    if (selected && size === "lg") { startLoop(); return stopLoop; }
  }, [selected, size, startLoop, stopLoop]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={startLoop}
      onMouseLeave={stopLoop}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        padding: 0, background: "none", border: "none", cursor: "pointer",
        outline: "none", flexShrink: 0,
      }}
    >
      {/* Animated preview window */}
      <div style={{
        width: w, height: h,
        borderRadius: size === "lg" ? 10 : 7,
        overflow: "hidden", position: "relative",
        background: "#0a0a0b",
        border: `${selected ? 2 : 1}px solid ${selected ? "var(--accent)" : "var(--border-subtle)"}`,
        boxShadow: selected ? "0 0 0 3px rgba(201,169,110,0.18)" : "none",
        transition: "border-color 0.12s, box-shadow 0.12s",
        flexShrink: 0,
      }}>
        {/* Outgoing layer (A) */}
        <div ref={outRef} style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(160deg, rgba(201,169,110,0.5) 0%, rgba(201,169,110,0.15) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: size === "lg" ? 11 : 8, color: "var(--accent)", fontWeight: 700, opacity: 0.7 }}>A</span>
        </div>
        {/* Incoming layer (B) */}
        <div ref={inRef} style={{
          position: "absolute", inset: 0, zIndex: 2, opacity: 0,
          background: "linear-gradient(160deg, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0.15) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: size === "lg" ? 11 : 8, color: "#a5b4fc", fontWeight: 700, opacity: 0.7 }}>B</span>
        </div>
        {/* Cut line indicator */}
        {(def.type === "cut" || def.type === "hard-cut") && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 3,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ width: 1.5, height: "72%", background: "var(--accent)", opacity: 0.7 }} />
          </div>
        )}
      </div>
      {/* Label */}
      <div style={{
        fontSize: size === "lg" ? 10 : 8.5,
        color: selected ? "var(--accent)" : "var(--text-secondary)",
        fontWeight: selected ? 600 : 400,
        whiteSpace: "nowrap", maxWidth: w + 8,
        overflow: "hidden", textOverflow: "ellipsis", textAlign: "center",
        lineHeight: 1.2,
      }}>
        {def.label}
      </div>
    </button>
  );
}

// ─── Slider helper ────────────────────────────────────────────────────────────

function ControlSlider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", height: 14 }}
      />
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function TransitionLibrary({
  sceneId, sceneName, currentTransition, scene, prevScene, timeline,
  onApply, onClose,
}: TransitionLibraryProps) {
  const [category, setCategory] = useState<TransitionCategory>("all");
  const [selectedType, setSelectedType] = useState<string>(currentTransition?.type ?? "dissolve");
  const [advanced, setAdvanced] = useState(false);
  const catScrollRef = useRef<HTMLDivElement>(null);

  // Build the config from currentTransition or defaults
  const [duration,       setDuration]       = useState(currentTransition?.duration       ?? 0.5);
  const [speed,          setSpeed]          = useState<"slow"|"normal"|"fast">(currentTransition?.speed ?? "normal");
  const [intensity,      setIntensity]      = useState(currentTransition?.intensity      ?? 0.7);
  const [direction,      setDirection]      = useState<"left"|"right"|"up"|"down"|"auto">(currentTransition?.direction ?? "left");
  const [mode,           setMode]           = useState<"in"|"out"|"both">(currentTransition?.mode ?? "both");
  const [easing,         setEasing]         = useState(currentTransition?.easing         ?? "ease");
  const [blurAmount,     setBlurAmount]     = useState(currentTransition?.blurAmount     ?? 8);
  const [motionStrength, setMotionStrength] = useState(currentTransition?.motionStrength ?? 0.6);

  const selectedDef = TRANSITION_CATALOG.find(d => d.type === selectedType) ?? TRANSITION_CATALOG[0];

  // Effective duration after speed modifier
  const effectiveDuration = useMemo(() => {
    if (speed === "slow")   return Math.min(3.0, duration * 1.5);
    if (speed === "fast")   return Math.max(0.1, duration * 0.5);
    return duration;
  }, [duration, speed]);

  const animConfig: TransitionAnimConfig = useMemo(() => ({
    type: selectedType,
    durationMs: effectiveDuration * 1000,
    intensity,
    direction,
    easing,
    blurAmount,
    motionStrength,
    mode,
  }), [selectedType, effectiveDuration, intensity, direction, easing, blurAmount, motionStrength, mode]);

  // Filtered transitions
  const filtered = useMemo(() =>
    category === "all"
      ? TRANSITION_CATALOG
      : TRANSITION_CATALOG.filter(d => d.category === category),
  [category]);

  // Smart suggestions
  const suggestions = useMemo(() =>
    getSmartSuggestions(scene, prevScene, timeline),
  [scene, prevScene, timeline]);

  // When type is selected, update duration to def default if it hasn't been manually set
  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
    const def = TRANSITION_CATALOG.find(d => d.type === type);
    if (def) setDuration(def.defaultDuration > 0 ? def.defaultDuration : duration);
  }, [duration]);

  const handleApply = useCallback(() => {
    const isCut = selectedType === "cut";
    onApply({
      type: selectedType as TransitionType,
      duration: isCut ? 0 : effectiveDuration,
      speed,
      intensity,
      direction,
      mode,
      easing,
      blurAmount,
      motionStrength,
    });
    onClose();
  }, [selectedType, effectiveDuration, speed, intensity, direction, mode, easing, blurAmount, motionStrength, onApply, onClose]);

  const handleRemove = useCallback(() => {
    onApply({ type: "cut", duration: 0 });
    onClose();
  }, [onApply, onClose]);

  // Close on backdrop click
  const backdropRef = useRef<HTMLDivElement>(null);
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isCut = selectedType === "cut";

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        width: "min(760px, 100%)",
        maxHeight: "min(680px, 90vh)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        animation: "fadeIn 0.15s ease",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              TRANSITION
            </div>
            <div style={{ width: 1, height: 14, background: "var(--border)" }} />
            <div style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Before <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{sceneName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: "50%",
            border: "1px solid var(--border)", background: "var(--bg-elevated)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.1s ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left: preview + controls */}
          <div style={{
            width: 220, flexShrink: 0,
            borderRight: "1px solid var(--border-subtle)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Large preview */}
            <div style={{ padding: "16px 16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
              <PreviewCard
                def={selectedDef}
                selected={true}
                config={animConfig}
                onClick={() => {}}
                size="lg"
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{selectedDef.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{selectedDef.desc}</div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 13 }}>

              {/* Duration */}
              {!isCut && (
                <ControlSlider
                  label="Duration" value={duration} min={0.1} max={3.0} step={0.1} unit="s"
                  onChange={setDuration}
                />
              )}

              {/* Speed */}
              {!isCut && (
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 6 }}>Speed</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {(["slow", "normal", "fast"] as const).map(s => (
                      <button key={s} onClick={() => setSpeed(s)} style={{
                        flex: 1, padding: "4px 0", borderRadius: 5, cursor: "pointer",
                        border: `1px solid ${speed === s ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: speed === s ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: speed === s ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 9.5, fontWeight: speed === s ? 600 : 400, transition: "all 0.1s ease",
                        textTransform: "capitalize",
                      }}>
                        {s === "slow" ? "0.5×" : s === "fast" ? "2×" : "1×"}<br />
                        <span style={{ fontSize: 8 }}>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Intensity */}
              {!isCut && selectedDef.supportsIntensity && (
                <ControlSlider
                  label="Intensity" value={intensity} min={0} max={1} step={0.05} unit=""
                  onChange={setIntensity}
                />
              )}

              {/* Direction */}
              {!isCut && selectedDef.supportsDirection && (
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 6 }}>Direction</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                    {(["left","right","up","down"] as const).map(d => (
                      <button key={d} onClick={() => setDirection(d)} style={{
                        padding: "4px 0", borderRadius: 5, cursor: "pointer",
                        border: `1px solid ${direction === d ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: direction === d ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: direction === d ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 9.5, transition: "all 0.1s ease",
                      }}>
                        {d === "left" ? "← Left" : d === "right" ? "→ Right" : d === "up" ? "↑ Up" : "↓ Down"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode */}
              {!isCut && (
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 6 }}>Mode</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {(["both","in","out"] as const).map(m => (
                      <button key={m} onClick={() => setMode(m)} style={{
                        flex: 1, padding: "4px 0", borderRadius: 5, cursor: "pointer",
                        border: `1px solid ${mode === m ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: mode === m ? "var(--accent-bg)" : "var(--bg-elevated)",
                        color: mode === m ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 9.5, fontWeight: mode === m ? 600 : 400, transition: "all 0.1s ease",
                        textTransform: "capitalize",
                      }}>
                        {m === "both" ? "In+Out" : m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced toggle */}
              {!isCut && (
                <button onClick={() => setAdvanced(a => !a)} style={{
                  padding: "6px 0", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${advanced ? "var(--accent-dim)" : "var(--border-subtle)"}`,
                  background: advanced ? "rgba(201,169,110,0.06)" : "var(--bg-elevated)",
                  color: advanced ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 10, fontWeight: 500, transition: "all 0.12s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}>
                  <span>⚙</span> Advanced {advanced ? "▲" : "▼"}
                </button>
              )}

              {/* Advanced controls */}
              {!isCut && advanced && (
                <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: "10px 11px", background: "rgba(255,255,255,0.02)", borderRadius: 7, border: "1px solid var(--border-subtle)" }}>
                  {/* Easing */}
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 5 }}>Easing</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {EASING_OPTIONS.map(e => (
                        <button key={e.id} onClick={() => setEasing(e.id)} style={{
                          padding: "3px 7px", borderRadius: 4, cursor: "pointer", textAlign: "left",
                          border: `1px solid ${easing === e.id ? "var(--accent)" : "var(--border-subtle)"}`,
                          background: easing === e.id ? "var(--accent-bg)" : "transparent",
                          color: easing === e.id ? "var(--accent)" : "var(--text-muted)",
                          fontSize: 9.5, transition: "all 0.08s ease",
                        }}>
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Blur */}
                  {selectedDef.supportsBlur && (
                    <ControlSlider label="Blur" value={blurAmount} min={0} max={20} step={1} unit="px" onChange={setBlurAmount} />
                  )}
                  {/* Motion strength */}
                  {selectedDef.supportsMotion && (
                    <ControlSlider label="Motion" value={motionStrength} min={0} max={1} step={0.05} unit="" onChange={setMotionStrength} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: category tabs + grid */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

            {/* Category tabs */}
            <div
              ref={catScrollRef}
              style={{
                display: "flex", overflowX: "auto", gap: 3, padding: "10px 14px 8px",
                borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
                scrollbarWidth: "none",
              }}
            >
              {TRANSITION_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    padding: "4px 11px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap",
                    border: `1px solid ${category === cat.id ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: category === cat.id ? "var(--accent-bg)" : "transparent",
                    color: category === cat.id ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 10.5, fontWeight: category === cat.id ? 600 : 400,
                    transition: "all 0.1s ease", flexShrink: 0,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Smart suggestions */}
            {category === "all" && suggestions.length > 0 && (
              <div style={{ padding: "10px 14px 0", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 7 }}>
                  ✦ SUGGESTED FOR THIS CLIP
                </div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
                  {suggestions.map(sug => {
                    const def = TRANSITION_CATALOG.find(d => d.type === sug.type);
                    if (!def) return null;
                    return (
                      <div key={sug.type} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        <PreviewCard
                          def={def}
                          selected={selectedType === sug.type}
                          config={animConfig}
                          onClick={() => handleSelectType(sug.type)}
                        />
                        <div style={{ fontSize: 8, color: "var(--text-muted)", textAlign: "center", maxWidth: 64 }}>
                          {sug.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ height: 1, background: "var(--border-subtle)", marginBottom: 8 }} />
              </div>
            )}

            {/* Transitions grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 14px" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                gap: 10,
              }}>
                {filtered.map(def => (
                  <PreviewCard
                    key={def.type}
                    def={def}
                    selected={selectedType === def.type}
                    config={animConfig}
                    onClick={() => handleSelectType(def.type)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px",
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(0,0,0,0.2)",
          flexShrink: 0,
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Selected transition summary */}
            <div style={{
              fontSize: 11, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{selectedDef.icon}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{selectedDef.label}</span>
              {!isCut && (
                <span style={{ color: "var(--text-muted)" }}>
                  · {effectiveDuration.toFixed(1)}s
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRemove} style={{
              padding: "7px 16px", borderRadius: 7, cursor: "pointer",
              border: "1px solid rgba(248,113,113,0.3)",
              background: "rgba(248,113,113,0.06)",
              color: "var(--error)", fontSize: 11, fontWeight: 500,
              transition: "all 0.1s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.06)"; }}
            >
              Remove
            </button>
            <button onClick={handleApply} style={{
              padding: "7px 22px", borderRadius: 7, cursor: "pointer",
              border: "1px solid var(--accent)",
              background: "var(--accent)", color: "#0e0e0f",
              fontSize: 11, fontWeight: 700,
              transition: "all 0.1s ease",
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
