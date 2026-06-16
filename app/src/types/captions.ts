export interface StudioCaption {
  id: string;
  text: string;
  startTime: number;   // global timeline seconds
  endTime: number;
  // Canvas position — 0-1 normalized (relative to canvas width/height)
  x: number;
  y: number;
  width: number;       // 0-1 fraction of canvas width
  rotation: number;    // degrees
  // Typography
  fontFamily: string;
  fontSize: number;    // pt (scaled relative to a 1080-wide canvas)
  fontWeight: string;
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  // Stroke
  strokeColor: string;
  strokeWidth: number;
  // Drop shadow
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  // Background box
  bgEnabled: boolean;
  bgColor: string;
  bgOpacity: number;
  bgPadding: number;
  bgRadius: number;
  // Animations
  entranceAnim: string | null;
  exitAnim: string | null;
  loopAnim: string | null;
  animDuration: number;
  locked: boolean;
  visible: boolean;
}

export const DEFAULT_CAPTION_STYLE: Omit<StudioCaption, "id" | "startTime" | "endTime" | "text"> = {
  x: 0.1,
  y: 0.78,
  width: 0.8,
  rotation: 0,
  fontFamily: "Inter",
  fontSize: 38,
  fontWeight: "600",
  fontStyle: "normal",
  textDecoration: "none",
  color: "#ffffff",
  textAlign: "center",
  lineHeight: 1.3,
  letterSpacing: 0,
  strokeColor: "#000000",
  strokeWidth: 0,
  shadowEnabled: true,
  shadowColor: "rgba(0,0,0,0.8)",
  shadowBlur: 10,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  bgEnabled: false,
  bgColor: "#000000",
  bgOpacity: 0.5,
  bgPadding: 8,
  bgRadius: 6,
  entranceAnim: null,
  exitAnim: null,
  loopAnim: null,
  animDuration: 0.4,
  locked: false,
  visible: true,
};

export const TEXT_TEMPLATES: Array<{
  name: string;
  preview: string;
  style: Omit<StudioCaption, "id" | "startTime" | "endTime" | "text" | "x" | "y" | "width" | "rotation" | "locked" | "visible">;
}> = [
  {
    name: "Modern Title",
    preview: "BIG TITLE",
    style: {
      fontFamily: "Inter", fontSize: 54, fontWeight: "800", fontStyle: "normal", textDecoration: "none",
      color: "#ffffff", textAlign: "center", lineHeight: 1.1, letterSpacing: 3,
      strokeColor: "#000000", strokeWidth: 0,
      shadowEnabled: true, shadowColor: "rgba(0,0,0,0.9)", shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 4,
      bgEnabled: false, bgColor: "#000000", bgOpacity: 0, bgPadding: 0, bgRadius: 0,
      entranceAnim: "zoom-in", exitAnim: "fade-out", loopAnim: null, animDuration: 0.5,
    },
  },
  {
    name: "Bold CTA",
    preview: "Shop Now →",
    style: {
      fontFamily: "Inter", fontSize: 36, fontWeight: "700", fontStyle: "normal", textDecoration: "none",
      color: "#0e0e0f", textAlign: "center", lineHeight: 1.2, letterSpacing: 1,
      strokeColor: "#000000", strokeWidth: 0,
      shadowEnabled: false, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      bgEnabled: true, bgColor: "#c9a96e", bgOpacity: 1, bgPadding: 14, bgRadius: 30,
      entranceAnim: "slide-up", exitAnim: "fade-out", loopAnim: "pulse", animDuration: 0.4,
    },
  },
  {
    name: "Subtitle",
    preview: "A timeless collection",
    style: {
      fontFamily: "serif", fontSize: 28, fontWeight: "400", fontStyle: "italic", textDecoration: "none",
      color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.4, letterSpacing: 1,
      strokeColor: "#000000", strokeWidth: 0,
      shadowEnabled: true, shadowColor: "rgba(0,0,0,0.7)", shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 2,
      bgEnabled: false, bgColor: "#000000", bgOpacity: 0, bgPadding: 0, bgRadius: 0,
      entranceAnim: "fade-in", exitAnim: "fade-out", loopAnim: null, animDuration: 0.6,
    },
  },
  {
    name: "Lower Third",
    preview: "Brand Name",
    style: {
      fontFamily: "Inter", fontSize: 30, fontWeight: "600", fontStyle: "normal", textDecoration: "none",
      color: "#ffffff", textAlign: "left", lineHeight: 1.3, letterSpacing: 0.5,
      strokeColor: "#000000", strokeWidth: 0,
      shadowEnabled: false, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      bgEnabled: true, bgColor: "#c9a96e", bgOpacity: 0.9, bgPadding: 10, bgRadius: 4,
      entranceAnim: "slide-left", exitAnim: "slide-right", loopAnim: null, animDuration: 0.35,
    },
  },
  {
    name: "Highlight",
    preview: "NEW ARRIVAL",
    style: {
      fontFamily: "Inter", fontSize: 20, fontWeight: "800", fontStyle: "normal", textDecoration: "none",
      color: "#c9a96e", textAlign: "center", lineHeight: 1.2, letterSpacing: 4,
      strokeColor: "#000000", strokeWidth: 0,
      shadowEnabled: false, shadowColor: "rgba(0,0,0,0)", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      bgEnabled: true, bgColor: "#000000", bgOpacity: 0.65, bgPadding: 8, bgRadius: 3,
      entranceAnim: "fade-in", exitAnim: "fade-out", loopAnim: "glow", animDuration: 0.3,
    },
  },
];

export const ENTRANCE_ANIMS = [
  { id: "none",       label: "None",       icon: "—"  },
  { id: "fade-in",    label: "Fade In",    icon: "◌"  },
  { id: "slide-up",   label: "Slide Up",   icon: "↑"  },
  { id: "slide-down", label: "Slide Down", icon: "↓"  },
  { id: "slide-left", label: "Slide Left", icon: "←"  },
  { id: "slide-right",label: "Slide Right",icon: "→"  },
  { id: "zoom-in",    label: "Zoom In",    icon: "⊕"  },
  { id: "bounce",     label: "Bounce",     icon: "↕"  },
  { id: "typewriter", label: "Typewriter", icon: "▮"  },
  { id: "blur-in",    label: "Blur In",    icon: "◎"  },
  { id: "pop",        label: "Pop",        icon: "✦"  },
];

export const EXIT_ANIMS = [
  { id: "none",         label: "None",         icon: "—" },
  { id: "fade-out",     label: "Fade Out",     icon: "◌" },
  { id: "slide-out-up", label: "Slide Out Up", icon: "↑" },
  { id: "slide-out-dn", label: "Slide Out Dn", icon: "↓" },
  { id: "zoom-out",     label: "Zoom Out",     icon: "⊖" },
  { id: "blur-out",     label: "Blur Out",     icon: "◎" },
];

export const LOOP_ANIMS = [
  { id: "none",    label: "None",    icon: "—"  },
  { id: "pulse",   label: "Pulse",   icon: "◉"  },
  { id: "shake",   label: "Shake",   icon: "↔"  },
  { id: "float",   label: "Float",   icon: "⇑"  },
  { id: "glow",    label: "Glow",    icon: "✦"  },
  { id: "glitch",  label: "Glitch",  icon: "▓"  },
];

export const FONT_FAMILIES = [
  "Inter", "Roboto", "Poppins", "Montserrat", "Raleway",
  "Oswald", "Bebas Neue", "Playfair Display", "Merriweather",
  "Georgia", "Times New Roman", "Arial", "Helvetica", "serif",
  "Impact", "Anton", "Barlow Condensed", "Space Grotesk",
];
