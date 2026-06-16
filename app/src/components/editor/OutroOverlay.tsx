"use client";
import type { OutroTemplate } from "@/types/outro";

interface OutroOverlayProps {
  config: OutroTemplate;
  sceneTime: number; // seconds into this outro scene
}

export default function OutroOverlay({ config, sceneTime }: OutroOverlayProps) {
  const visible = sceneTime >= 0;
  const logoProgress = Math.min(1, sceneTime / Math.max(0.1, config.animDuration));
  const textProgress = Math.min(1, Math.max(0, (sceneTime - config.entranceDelay) / Math.max(0.1, config.animDuration)));

  function getAnim(anim: OutroTemplate["logoAnimation"], prog: number): React.CSSProperties {
    if (anim === "none") return {};
    if (anim === "fade-in") return { opacity: prog };
    if (anim === "scale-in") return { opacity: prog, transform: `scale(${0.6 + prog * 0.4})` };
    if (anim === "slide-up") return { opacity: prog, transform: `translateY(${(1 - prog) * 20}px)` };
    if (anim === "slide-left") return { opacity: prog, transform: `translateX(${(1 - prog) * 20}px)` };
    return { opacity: prog };
  }

  if (!visible) return null;

  const margin = `${config.safeMargin}%`;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 15,
      background: config.backgroundColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Background image */}
      {config.backgroundImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.backgroundImageUrl} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: config.backgroundOpacity, zIndex: 0,
        }} />
      )}

      {/* Logo */}
      {config.logoEnabled && config.logoSvg && (
        <div style={{
          position: "absolute",
          left: `${config.logoX * 100}%`,
          top: `${config.logoY * 100}%`,
          transform: "translate(-50%, -50%)",
          width: `${config.logoSize * 0.05}%`,
          color: config.logoColor,
          zIndex: 2,
          transition: "none",
          ...getAnim(config.logoAnimation, logoProgress),
        }}
          dangerouslySetInnerHTML={{ __html: config.logoSvg.replace("currentColor", config.logoColor) }}
        />
      )}

      {/* Brand name */}
      {config.brandNameEnabled && (
        <div style={{
          position: "absolute",
          left: `${config.brandNameX * 100}%`,
          top: `${config.brandNameY * 100}%`,
          transform: "translate(-50%, -50%)",
          fontFamily: config.brandNameFont,
          fontSize: `${config.brandNameSize * 0.04}vw`,
          fontWeight: 700,
          color: config.brandNameColor,
          letterSpacing: "0.2em",
          textAlign: "center",
          whiteSpace: "nowrap",
          zIndex: 2,
          ...getAnim(config.brandNameAnimation, textProgress),
        }}>
          {config.brandName}
        </div>
      )}

      {/* Tagline */}
      {config.taglineEnabled && (
        <div style={{
          position: "absolute",
          left: "50%",
          top: `${(config.brandNameY + 0.1) * 100}%`,
          transform: "translate(-50%, -50%)",
          fontFamily: config.taglineFont,
          fontSize: `${config.taglineSize * 0.04}vw`,
          fontStyle: "italic",
          color: config.taglineColor,
          letterSpacing: "0.1em",
          textAlign: "center",
          whiteSpace: "nowrap",
          zIndex: 2,
          ...getAnim(config.taglineAnimation, textProgress),
        }}>
          {config.tagline}
        </div>
      )}

      {/* Safe margin guide (very subtle) */}
      <div style={{
        position: "absolute",
        inset: margin,
        border: "1px dashed rgba(255,255,255,0.05)",
        zIndex: 3, pointerEvents: "none",
      }} />
    </div>
  );
}
