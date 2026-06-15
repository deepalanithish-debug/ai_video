import type { BrandWorkspace } from "@/types/brand";

export const asayaWorkspace: BrandWorkspace = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  name: "Asaya",
  slug: "asaya",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  colors: {
    primary: "#C9A96E",
    secondary: "#1A1A1A",
    accent: "#F5EDD6",
    background: "#0D0D0D",
    text: "#F5EDD6",
    textAlt: "#C9A96E",
  },
  fonts: {
    heading: {
      family: "Cormorant Garamond",
      weight: "300",
      letterSpacing: 4,
      transform: "uppercase",
    },
    body: {
      family: "Cormorant Garamond",
      weight: "400",
      letterSpacing: 1,
    },
    caption: {
      family: "Cormorant Garamond",
      weight: "300",
      letterSpacing: 3,
      transform: "uppercase",
      size: 18,
    },
  },
  logo: {
    path: "/brands/asaya/logo.png",
    defaultPosition: "bottom-center",
    safeZonePercent: 8,
    minScalePercent: 15,
    maxScalePercent: 25,
    allowedOnScenes: "last",
  },
  captionStyle: {
    fontStyle: {
      family: "Cormorant Garamond",
      weight: "300",
      letterSpacing: 3,
      transform: "uppercase",
      size: 18,
    },
    color: "#F5EDD6",
    backgroundColor: undefined,
    backgroundOpacity: 0,
    position: "bottom",
    alignment: "center",
    maxCharsPerLine: 35,
    maxLines: 2,
    animationIn: "fade",
    animationOut: "fade",
  },
  colorGrade: {
    name: "Asaya Luxury",
    brightness: 0.05,
    contrast: 0.15,
    saturation: -0.1,
    warmth: 0.2,
    vignette: 0.3,
    grain: 0.05,
    highlights: -0.1,
    shadows: 0.05,
  },
  exportDefaults: {
    resolution: "1080x1920",
    fps: 24 as const,
    codec: "h264",
    bitrate: "8M",
    format: "mp4",
    audioCodec: "aac",
    audioBitrate: "192k",
  },
  defaultAspectRatio: "9:16",
  styleKeywords: [
    "luxury", "cinematic", "elegant", "minimal", "premium",
    "warm-tones", "slow-motion", "aspirational", "refined", "intimate"
  ],
  prohibitedElements: [
    "bright-neon", "fast-flash-cuts", "comic-fonts", "cartoon-graphics",
    "loud-sfx", "busy-patterns", "harsh-lighting"
  ],
  lockedSettings: ["colors", "fonts", "logo"],
};

export const defaultWorkspaces: Record<string, BrandWorkspace> = {
  asaya: asayaWorkspace,
};

export function getWorkspace(slug: string): BrandWorkspace | null {
  return defaultWorkspaces[slug] ?? null;
}
