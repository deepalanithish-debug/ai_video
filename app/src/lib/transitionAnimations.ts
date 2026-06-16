import type { Scene, Timeline } from "@/types/timeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransitionCategory =
  | "all" | "basic" | "fade" | "dissolve" | "zoom"
  | "slide" | "push" | "glitch" | "slice" | "blur" | "motion" | "cinematic";

export interface TransitionDef {
  type: string;
  label: string;
  category: TransitionCategory;
  icon: string;
  desc: string;
  defaultDuration: number;
  supportsDirection: boolean;
  supportsIntensity: boolean;
  supportsBlur: boolean;
  supportsRotation: boolean;
  supportsMotion: boolean;
}

export interface TransitionAnimConfig {
  type: string;
  durationMs: number;
  intensity: number;        // 0–1
  direction: "left" | "right" | "up" | "down" | "auto";
  easing: string;
  blurAmount: number;       // px
  motionStrength: number;   // 0–1
  mode: "in" | "out" | "both";
}

export interface SmartSuggestion {
  type: string;
  reason: string;
}

export const DEFAULT_ANIM_CONFIG: TransitionAnimConfig = {
  type: "dissolve",
  durationMs: 500,
  intensity: 0.7,
  direction: "left",
  easing: "ease",
  blurAmount: 8,
  motionStrength: 0.6,
  mode: "both",
};

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const TRANSITION_CATALOG: TransitionDef[] = [
  // Basic
  { type: "cut",            label: "Cut",           category: "basic",    icon: "✂",  desc: "Instant hard cut",          defaultDuration: 0,   supportsDirection: false, supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "hard-cut",       label: "Hard Cut",      category: "basic",    icon: "⚡", desc: "Snap cut with flash frame",  defaultDuration: 0.1, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Fade
  { type: "fade",           label: "Fade",          category: "fade",     icon: "◑",  desc: "Classic opacity crossfade",  defaultDuration: 0.6, supportsDirection: false, supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "fade-to-black",  label: "Dip to Black",  category: "fade",     icon: "◼",  desc: "Fades through black",        defaultDuration: 0.8, supportsDirection: false, supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "fade-to-white",  label: "Dip to White",  category: "fade",     icon: "◻",  desc: "Fades through white",        defaultDuration: 0.8, supportsDirection: false, supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Dissolve
  { type: "dissolve",       label: "Dissolve",      category: "dissolve", icon: "≋",  desc: "Smooth blend",              defaultDuration: 0.7, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "cross-dissolve", label: "Cross Dissolve",category: "dissolve", icon: "⊕",  desc: "Dissolve with blur blend",   defaultDuration: 0.7, supportsDirection: false, supportsIntensity: true,  supportsBlur: true,  supportsRotation: false, supportsMotion: false },
  // Zoom
  { type: "zoom-in",        label: "Zoom In",       category: "zoom",     icon: "⊙",  desc: "Zooms in on transition",    defaultDuration: 0.5, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "zoom-out",       label: "Zoom Out",      category: "zoom",     icon: "⊖",  desc: "Zooms out on transition",   defaultDuration: 0.5, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "zoom-punch",     label: "Punch",         category: "zoom",     icon: "💥", desc: "Snap zoom with spring",     defaultDuration: 0.4, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Slide
  { type: "slide-left",     label: "Slide Left",    category: "slide",    icon: "←",  desc: "Slides current clip left",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "slide-right",    label: "Slide Right",   category: "slide",    icon: "→",  desc: "Slides current clip right", defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "slide-up",       label: "Slide Up",      category: "slide",    icon: "↑",  desc: "Slides current clip up",    defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "slide-down",     label: "Slide Down",    category: "slide",    icon: "↓",  desc: "Slides current clip down",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Push
  { type: "push-left",      label: "Push Left",     category: "push",     icon: "«",  desc: "Both clips push together",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "push-right",     label: "Push Right",    category: "push",     icon: "»",  desc: "Both clips push together",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "push-up",        label: "Push Up",       category: "push",     icon: "⇑",  desc: "Both clips push together",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "push-down",      label: "Push Down",     category: "push",     icon: "⇓",  desc: "Both clips push together",  defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Wipe (kept from original)
  { type: "wipe-left",      label: "Wipe Left",     category: "slide",    icon: "◁",  desc: "Reveals from right edge",   defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "wipe-right",     label: "Wipe Right",    category: "slide",    icon: "▷",  desc: "Reveals from left edge",    defaultDuration: 0.5, supportsDirection: true,  supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Glitch
  { type: "glitch",         label: "Glitch",        category: "glitch",   icon: "▓",  desc: "Digital glitch distortion", defaultDuration: 0.4, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: true  },
  { type: "rgb-split",      label: "RGB Split",     category: "glitch",   icon: "⚙",  desc: "RGB channel separation",    defaultDuration: 0.4, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Slice
  { type: "slice-h",        label: "Slice H",       category: "slice",    icon: "═",  desc: "Horizontal slice reveal",   defaultDuration: 0.5, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "slice-v",        label: "Slice V",       category: "slice",    icon: "║",  desc: "Vertical slice reveal",     defaultDuration: 0.5, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
  // Blur
  { type: "blur-fade",      label: "Blur Fade",     category: "blur",     icon: "◎",  desc: "Blurs out then blurs in",   defaultDuration: 0.6, supportsDirection: false, supportsIntensity: true,  supportsBlur: true,  supportsRotation: false, supportsMotion: false },
  { type: "zoom-blur",      label: "Zoom Blur",     category: "blur",     icon: "⊛",  desc: "Radial blur with zoom",     defaultDuration: 0.6, supportsDirection: false, supportsIntensity: true,  supportsBlur: true,  supportsRotation: false, supportsMotion: false },
  // Motion
  { type: "whip-pan-left",  label: "Whip Left",     category: "motion",   icon: "⤙",  desc: "Fast pan left with blur",   defaultDuration: 0.35, supportsDirection: true, supportsIntensity: true,  supportsBlur: true,  supportsRotation: false, supportsMotion: true  },
  { type: "whip-pan-right", label: "Whip Right",    category: "motion",   icon: "⤚",  desc: "Fast pan right with blur",  defaultDuration: 0.35, supportsDirection: true, supportsIntensity: true,  supportsBlur: true,  supportsRotation: false, supportsMotion: true  },
  // Cinematic
  { type: "cinematic-fade", label: "Cinematic",     category: "cinematic",icon: "◈",  desc: "Slow cinematic fade",       defaultDuration: 1.0, supportsDirection: false, supportsIntensity: false, supportsBlur: false, supportsRotation: false, supportsMotion: false },
  { type: "film-burn",      label: "Film Burn",     category: "cinematic",icon: "🎞", desc: "Vintage film burn effect",  defaultDuration: 0.7, supportsDirection: false, supportsIntensity: true,  supportsBlur: false, supportsRotation: false, supportsMotion: false },
];

export const TRANSITION_CATEGORIES: { id: TransitionCategory; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "basic",    label: "Basic" },
  { id: "fade",     label: "Fade" },
  { id: "dissolve", label: "Dissolve" },
  { id: "zoom",     label: "Zoom" },
  { id: "slide",    label: "Slide" },
  { id: "push",     label: "Push" },
  { id: "glitch",   label: "Glitch" },
  { id: "slice",    label: "Slice" },
  { id: "blur",     label: "Blur" },
  { id: "motion",   label: "Motion" },
  { id: "cinematic",label: "Cinematic" },
];

export const EASING_OPTIONS = [
  { id: "ease",              label: "Ease" },
  { id: "ease-in",           label: "Ease In" },
  { id: "ease-out",          label: "Ease Out" },
  { id: "ease-in-out",       label: "Smooth" },
  { id: "linear",            label: "Linear" },
  { id: "cubic-bezier(0.34,1.56,0.64,1)", label: "Spring" },
  { id: "cubic-bezier(0.68,-0.55,0.27,1.55)", label: "Bounce" },
];

// ─── Animation engine ─────────────────────────────────────────────────────────

export function cancelTransitionAnimations(
  outEl: HTMLElement | null,
  inEl: HTMLElement | null
) {
  outEl?.getAnimations().forEach((a) => a.cancel());
  inEl?.getAnimations().forEach((a) => a.cancel());
}

export function runTransitionAnimation(
  outEl: HTMLDivElement | null,
  inEl: HTMLDivElement | null,
  cfg: TransitionAnimConfig
) {
  const { type, durationMs, intensity, easing, blurAmount, motionStrength, mode } = cfg;
  if (durationMs <= 0 || type === "cut") {
    if (inEl) inEl.style.opacity = "1";
    return;
  }

  const blur = blurAmount > 0 ? blurAmount : 8;
  const ms = motionStrength > 0 ? motionStrength : 0.6;
  const inten = Math.max(0.01, intensity);

  const opts: KeyframeAnimationOptions = { duration: durationMs, easing, fill: "forwards" };

  const doOut = mode !== "in";
  const doIn  = mode !== "out";

  switch (type) {

    case "hard-cut":
      if (inEl) inEl.style.opacity = "1";
      if (doOut && outEl) outEl.animate([{ opacity: "1" }, { opacity: `${1 - inten * 0.5}`, filter: `brightness(${1 + inten * 3})` }, { opacity: "0" }], { ...opts, duration: durationMs * 0.3 });
      break;

    case "fade":
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0" }, { opacity: "1" }], opts);
      break;

    case "fade-to-black": {
      const h = { duration: durationMs * 0.5, easing, fill: "forwards" as FillMode };
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], h);
      if (doIn && inEl) {
        inEl.style.opacity = "0";
        setTimeout(() => inEl?.animate([{ opacity: "0" }, { opacity: "1" }], h), durationMs * 0.5);
      }
      break;
    }

    case "fade-to-white": {
      const h = { duration: durationMs * 0.5, easing, fill: "forwards" as FillMode };
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], h);
      if (doIn && inEl) {
        inEl.style.opacity = "0";
        setTimeout(() => inEl?.animate([{ opacity: "0" }, { opacity: "1" }], h), durationMs * 0.5);
      }
      break;
    }

    case "dissolve":
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0" }, { opacity: "1" }], opts);
      break;

    case "cross-dissolve":
      if (doOut) outEl?.animate([{ opacity: "1", filter: "blur(0px)" }, { opacity: "0", filter: `blur(${blur}px)` }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", filter: `blur(${blur}px)` }, { opacity: "1", filter: "blur(0px)" }], opts);
      break;

    case "zoom-in": {
      const scaleFactor = 1 + inten * 0.5;
      if (doOut) outEl?.animate([{ opacity: "1", transform: "scale(1)" }, { opacity: "0", transform: `scale(${1 + inten * 0.15})` }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", transform: `scale(${scaleFactor})` }, { opacity: "1", transform: "scale(1)" }], opts);
      break;
    }

    case "zoom-out": {
      const sf = 2 - inten * 0.5;
      if (doOut) outEl?.animate([{ opacity: "1", transform: `scale(1)` }, { opacity: "0", transform: `scale(${Math.max(0.5, sf - 0.3)})` }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", transform: "scale(1)" }, { opacity: "1", transform: "scale(1)" }], opts);
      break;
    }

    case "zoom-punch": {
      const springEasing = "cubic-bezier(0.34,1.56,0.64,1)";
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], { ...opts, duration: durationMs * 0.35 });
      if (doIn)  inEl?.animate( [{ transform: `scale(${1 + inten * 0.5})`, opacity: "0" }, { transform: "scale(1)", opacity: "1" }], { ...opts, easing: springEasing });
      break;
    }

    case "slide-left":
      if (doOut) outEl?.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateX(100%)", opacity: "1" }, { transform: "translateX(0%)", opacity: "1" }], opts);
      break;

    case "slide-right":
      if (doOut) outEl?.animate([{ transform: "translateX(0%)" }, { transform: "translateX(100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateX(-100%)", opacity: "1" }, { transform: "translateX(0%)", opacity: "1" }], opts);
      break;

    case "slide-up":
      if (doOut) outEl?.animate([{ transform: "translateY(0%)" }, { transform: "translateY(-100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateY(100%)", opacity: "1" }, { transform: "translateY(0%)", opacity: "1" }], opts);
      break;

    case "slide-down":
      if (doOut) outEl?.animate([{ transform: "translateY(0%)" }, { transform: "translateY(100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateY(-100%)", opacity: "1" }, { transform: "translateY(0%)", opacity: "1" }], opts);
      break;

    case "push-left":
      if (doOut) outEl?.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateX(100%)", opacity: "1" }, { transform: "translateX(0%)", opacity: "1" }], opts);
      break;

    case "push-right":
      if (doOut) outEl?.animate([{ transform: "translateX(0%)" }, { transform: "translateX(100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateX(-100%)", opacity: "1" }, { transform: "translateX(0%)", opacity: "1" }], opts);
      break;

    case "push-up":
      if (doOut) outEl?.animate([{ transform: "translateY(0%)" }, { transform: "translateY(-100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateY(100%)", opacity: "1" }, { transform: "translateY(0%)", opacity: "1" }], opts);
      break;

    case "push-down":
      if (doOut) outEl?.animate([{ transform: "translateY(0%)" }, { transform: "translateY(100%)" }], opts);
      if (doIn)  inEl?.animate( [{ transform: "translateY(-100%)", opacity: "1" }, { transform: "translateY(0%)", opacity: "1" }], opts);
      break;

    case "wipe-right":
      if (doIn) inEl?.animate([{ clipPath: "inset(0 100% 0 0)", opacity: "1" }, { clipPath: "inset(0 0% 0 0)", opacity: "1" }], opts);
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      break;

    case "wipe-left":
      if (doIn) inEl?.animate([{ clipPath: "inset(0 0 0 100%)", opacity: "1" }, { clipPath: "inset(0 0 0 0%)", opacity: "1" }], opts);
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      break;

    case "glitch": {
      const jitter = 6 * inten * ms;
      const glitchFrames: Keyframe[] = [
        { transform: "translateX(0)", filter: "hue-rotate(0deg)", opacity: "1" },
        { transform: `translateX(${jitter}px)`, filter: `hue-rotate(90deg) brightness(${1 + inten})`, opacity: "0.8" },
        { transform: `translateX(-${jitter * 1.5}px)`, filter: `hue-rotate(-60deg) brightness(${1 + inten * 0.5})`, opacity: "0.7" },
        { transform: `translateX(${jitter * 0.5}px)`, filter: "hue-rotate(30deg)", opacity: "0.5" },
        { transform: "translateX(0)", filter: "none", opacity: "0" },
      ];
      if (doOut) outEl?.animate(glitchFrames, opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", transform: `translateX(-${jitter * 2}px)` }, { opacity: "0.6", transform: `translateX(${jitter}px)` }, { opacity: "1", transform: "translateX(0)" }], { ...opts, easing: "ease-out", delay: durationMs * 0.5 });
      break;
    }

    case "rgb-split":
      if (doOut) outEl?.animate([
        { filter: "none", opacity: "1" },
        { filter: `drop-shadow(${4 * inten}px 0 0 rgba(255,0,0,0.9)) drop-shadow(-${4 * inten}px 0 0 rgba(0,100,255,0.9))`, opacity: "0.85" },
        { filter: `drop-shadow(${8 * inten}px 0 0 rgba(255,0,0,0.6)) drop-shadow(-${8 * inten}px 0 0 rgba(0,100,255,0.6))`, opacity: "0" },
      ], opts);
      if (doIn) inEl?.animate([{ opacity: "0" }, { opacity: "1" }], opts);
      break;

    case "slice-h":
      if (doIn) inEl?.animate([
        { clipPath: "inset(100% 0 0 0)", opacity: "1" },
        { clipPath: "inset(0% 0 0 0)", opacity: "1" },
      ], { ...opts, easing: `steps(${Math.floor(4 + inten * 6)})` });
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      break;

    case "slice-v":
      if (doIn) inEl?.animate([
        { clipPath: "inset(0 100% 0 0)", opacity: "1" },
        { clipPath: "inset(0 0% 0 0)", opacity: "1" },
      ], { ...opts, easing: `steps(${Math.floor(4 + inten * 6)})` });
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      break;

    case "blur-fade":
      if (doOut) outEl?.animate([{ opacity: "1", filter: "blur(0px)" }, { opacity: "0", filter: `blur(${blur * inten}px)` }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", filter: `blur(${blur * inten}px)` }, { opacity: "1", filter: "blur(0px)" }], opts);
      break;

    case "zoom-blur":
      if (doOut) outEl?.animate([{ opacity: "1", filter: "blur(0px)", transform: "scale(1)" }, { opacity: "0", filter: `blur(${blur * inten * 0.6}px)`, transform: `scale(${1 + inten * 0.2})` }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0", filter: `blur(${blur * inten * 0.6}px)`, transform: `scale(${1 + inten * 0.15})` }, { opacity: "1", filter: "blur(0px)", transform: "scale(1)" }], opts);
      break;

    case "whip-pan-left": {
      const blurPx = blur * ms;
      if (doOut) outEl?.animate([{ transform: "translateX(0%)", filter: "blur(0px)" }, { transform: `translateX(-${130 + ms * 70}%)`, filter: `blur(${blurPx}px)` }], { ...opts, easing: "ease-in", duration: durationMs * 0.45 });
      if (doIn)  inEl?.animate( [{ transform: `translateX(${100 + ms * 50}%)`, filter: `blur(${blurPx}px)`, opacity: "1" }, { transform: "translateX(0%)", filter: "blur(0px)", opacity: "1" }], { ...opts, easing: "ease-out", duration: durationMs * 0.6, delay: durationMs * 0.2 });
      break;
    }

    case "whip-pan-right": {
      const blurPx = blur * ms;
      if (doOut) outEl?.animate([{ transform: "translateX(0%)", filter: "blur(0px)" }, { transform: `translateX(${130 + ms * 70}%)`, filter: `blur(${blurPx}px)` }], { ...opts, easing: "ease-in", duration: durationMs * 0.45 });
      if (doIn)  inEl?.animate( [{ transform: `translateX(-${100 + ms * 50}%)`, filter: `blur(${blurPx}px)`, opacity: "1" }, { transform: "translateX(0%)", filter: "blur(0px)", opacity: "1" }], { ...opts, easing: "ease-out", duration: durationMs * 0.6, delay: durationMs * 0.2 });
      break;
    }

    case "cinematic-fade":
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], { ...opts, easing: "ease-in-out" });
      if (doIn)  inEl?.animate( [{ opacity: "0" }, { opacity: "1" }], { ...opts, easing: "ease-in-out", delay: durationMs * 0.15 });
      break;

    case "film-burn":
      if (doOut) outEl?.animate([
        { opacity: "1",  filter: "brightness(1) sepia(0)" },
        { opacity: "0.9",filter: `brightness(${2 + inten * 2}) sepia(0.8)` },
        { opacity: "0",  filter: `brightness(${4 + inten * 3}) sepia(1) saturate(2)` },
      ], opts);
      if (doIn) inEl?.animate([
        { opacity: "0",  filter: `brightness(${4 + inten * 3}) sepia(1) saturate(2)` },
        { opacity: "0.7",filter: `brightness(${1.5 + inten * 0.5}) sepia(0.4)` },
        { opacity: "1",  filter: "brightness(1) sepia(0)" },
      ], opts);
      break;

    default:
      // Fallback crossfade
      if (doOut) outEl?.animate([{ opacity: "1" }, { opacity: "0" }], opts);
      if (doIn)  inEl?.animate( [{ opacity: "0" }, { opacity: "1" }], opts);
  }
}

// ─── Smart suggestions ────────────────────────────────────────────────────────

export function getSmartSuggestions(
  scene: Scene | null,
  prevScene: Scene | null,
  timeline: Timeline | null
): SmartSuggestion[] {
  const out: SmartSuggestion[] = [];
  const mood = scene?.mood ?? prevScene?.mood;
  const motionStyle = scene?.motionStyle;
  const platform = timeline?.targetPlatform;

  if (platform === "tiktok" || platform === "reels") {
    out.push({ type: "zoom-punch", reason: `${platform === "tiktok" ? "TikTok" : "Reels"}-style impact cut` });
    out.push({ type: "slide-left", reason: "Swipe-native transition" });
    out.push({ type: "glitch",     reason: "High-energy social feel" });
  }

  if (mood === "energetic") {
    out.push({ type: "glitch",        reason: "Matches high-energy mood" });
    out.push({ type: "whip-pan-right",reason: "Fast-paced motion cut" });
    out.push({ type: "zoom-punch",    reason: "Punch on beat" });
  } else if (mood === "luxury" || mood === "calm") {
    out.push({ type: "dissolve",      reason: "Smooth, elegant feel" });
    out.push({ type: "cinematic-fade",reason: "Premium cinematic look" });
    out.push({ type: "fade-to-black", reason: "Clean luxury cut" });
  } else if (mood === "dramatic") {
    out.push({ type: "film-burn",     reason: "Dramatic vintage tension" });
    out.push({ type: "cinematic-fade",reason: "Slow cinematic pacing" });
    out.push({ type: "cross-dissolve",reason: "Layered dramatic blend" });
  } else if (mood === "playful") {
    out.push({ type: "zoom-punch",    reason: "Fun, bouncy entrance" });
    out.push({ type: "slide-down",    reason: "Playful slide-in" });
    out.push({ type: "push-right",    reason: "Energetic push" });
  }

  if (motionStyle === "fast-cut") {
    out.unshift({ type: "hard-cut",   reason: "Matches fast-cut editing" });
  } else if (motionStyle === "slow-pan" || motionStyle === "ken-burns") {
    out.unshift({ type: "dissolve",   reason: "Complements slow movement" });
  } else if (motionStyle === "zoom-pulse") {
    out.unshift({ type: "zoom-blur",  reason: "Amplifies zoom motion" });
  }

  if (scene?.clipType === "image") {
    out.push({ type: "dissolve",      reason: "Natural still-image flow" });
    out.push({ type: "fade",          reason: "Classic slideshow feel" });
  }

  const seen = new Set<string>();
  return out.filter(s => {
    if (seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  }).slice(0, 4);
}
