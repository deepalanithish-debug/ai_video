export type OutroAnimationType = "none" | "fade-in" | "scale-in" | "slide-up" | "slide-left";

export interface OutroTemplate {
  id: string;
  name: string;
  duration: number;                          // seconds (2-10)
  backgroundColor: string;                   // hex
  backgroundImageUrl: string | null;         // uploaded asset URL or null
  backgroundOpacity: number;                 // 0-1

  // Logo block
  logoEnabled: boolean;
  logoSvg: string | null;                    // raw SVG string for Asaya logo
  logoColor: string;
  logoSize: number;                          // px relative to 1080-wide canvas
  logoX: number;                             // 0-1 normalized
  logoY: number;                             // 0-1 normalized
  logoAnimation: OutroAnimationType;

  // Brand name text
  brandNameEnabled: boolean;
  brandName: string;
  brandNameFont: string;
  brandNameColor: string;
  brandNameSize: number;
  brandNameX: number;                        // 0-1
  brandNameY: number;                        // 0-1
  brandNameAnimation: OutroAnimationType;

  // Tagline
  taglineEnabled: boolean;
  tagline: string;
  taglineFont: string;
  taglineColor: string;
  taglineSize: number;
  taglineAnimation: OutroAnimationType;

  // Global animation
  entranceDelay: number;                     // seconds between logo and text
  animDuration: number;                      // seconds

  // Platform/variant
  platform: "generic" | "instagram" | "tiktok" | "youtube";
  safeMargin: number;                        // % inset (5 = 5%)
}

export const ASAYA_LOGO_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 10 L90 80 H10 Z" fill="currentColor"/>
</svg>`;

export const DEFAULT_OUTRO: Omit<OutroTemplate, "id" | "name"> = {
  duration: 4,
  backgroundColor: "#0e0e0f",
  backgroundImageUrl: null,
  backgroundOpacity: 1,
  logoEnabled: true,
  logoSvg: ASAYA_LOGO_SVG,
  logoColor: "#c9a96e",
  logoSize: 80,
  logoX: 0.5,
  logoY: 0.38,
  logoAnimation: "scale-in",
  brandNameEnabled: true,
  brandName: "ASAYA",
  brandNameFont: "Inter",
  brandNameColor: "#c9a96e",
  brandNameSize: 48,
  brandNameX: 0.5,
  brandNameY: 0.55,
  brandNameAnimation: "fade-in",
  taglineEnabled: true,
  tagline: "Luxury. Redefined.",
  taglineFont: "serif",
  taglineColor: "rgba(201,169,110,0.7)",
  taglineSize: 22,
  taglineAnimation: "fade-in",
  entranceDelay: 0.4,
  animDuration: 0.6,
  platform: "generic",
  safeMargin: 8,
};

export const OUTRO_PRESETS: OutroTemplate[] = [
  {
    id: "asaya-classic",
    name: "Asaya Classic",
    ...DEFAULT_OUTRO,
    backgroundColor: "#0e0e0f",
    logoColor: "#c9a96e",
    brandNameColor: "#c9a96e",
  },
  {
    id: "asaya-white",
    name: "White Minimal",
    ...DEFAULT_OUTRO,
    backgroundColor: "#f5edd6",
    logoColor: "#0e0e0f",
    brandNameColor: "#0e0e0f",
    taglineColor: "rgba(14,14,15,0.6)",
  },
  {
    id: "asaya-purple",
    name: "Brand Purple",
    ...DEFAULT_OUTRO,
    backgroundColor: "#120d1e",
    logoColor: "#a78bfa",
    brandNameColor: "#a78bfa",
    taglineColor: "rgba(167,139,250,0.6)",
  },
  {
    id: "asaya-energy",
    name: "Energetic",
    ...DEFAULT_OUTRO,
    backgroundColor: "#12101a",
    logoColor: "#f472b6",
    brandNameColor: "#ffffff",
    taglineColor: "rgba(244,114,182,0.7)",
    logoAnimation: "scale-in",
    brandNameAnimation: "slide-up",
  },
];
