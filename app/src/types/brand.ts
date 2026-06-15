import { z } from "zod";

export const FontStyleSchema = z.object({
  family: z.string(),
  weight: z.enum(["100", "200", "300", "400", "500", "600", "700", "800", "900"]),
  size: z.number().optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  transform: z.enum(["none", "uppercase", "lowercase", "capitalize"]).optional(),
});

export const ColorPaletteSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textAlt: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const LogoRulesSchema = z.object({
  path: z.string().optional(),
  defaultPosition: z.enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]),
  safeZonePercent: z.number().min(0).max(30),
  minScalePercent: z.number().min(5).max(50),
  maxScalePercent: z.number().min(10).max(80),
  allowedOnScenes: z.enum(["all", "first", "last", "first-and-last"]),
});

export const CaptionStyleSchema = z.object({
  fontStyle: FontStyleSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  position: z.enum(["top", "center", "bottom"]),
  alignment: z.enum(["left", "center", "right"]),
  maxCharsPerLine: z.number().min(10).max(80),
  maxLines: z.number().min(1).max(4),
  animationIn: z.enum(["fade", "slide-up", "slide-down", "pop", "none"]),
  animationOut: z.enum(["fade", "slide-up", "slide-down", "pop", "none"]),
});

export const ColorGradePresetSchema = z.object({
  name: z.string(),
  brightness: z.number().min(-1).max(1),
  contrast: z.number().min(-1).max(1),
  saturation: z.number().min(-1).max(1),
  warmth: z.number().min(-1).max(1),
  vignette: z.number().min(0).max(1),
  grain: z.number().min(0).max(1),
  highlights: z.number().min(-1).max(1),
  shadows: z.number().min(-1).max(1),
});

export const ExportDefaultsSchema = z.object({
  resolution: z.enum(["1080x1920", "1920x1080", "1080x1080", "720x1280", "1280x720"]),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]),
  codec: z.enum(["h264", "h265", "prores"]),
  bitrate: z.string(),
  format: z.enum(["mp4", "mov", "webm"]),
  audioCodec: z.enum(["aac", "mp3", "opus"]),
  audioBitrate: z.string(),
});

export const AspectRatioSchema = z.enum(["9:16", "16:9", "1:1", "4:5", "3:4"]);

export const BrandWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  colors: ColorPaletteSchema,
  fonts: z.object({
    heading: FontStyleSchema,
    body: FontStyleSchema,
    caption: FontStyleSchema,
  }),
  logo: LogoRulesSchema,
  captionStyle: CaptionStyleSchema,
  colorGrade: ColorGradePresetSchema,
  exportDefaults: ExportDefaultsSchema,
  defaultAspectRatio: AspectRatioSchema,
  styleKeywords: z.array(z.string()).max(20),
  prohibitedElements: z.array(z.string()).max(20),
  lockedSettings: z.array(z.enum([
    "colors", "fonts", "logo", "captionStyle", "colorGrade", "exportDefaults"
  ])).optional(),
});

export type FontStyle = z.infer<typeof FontStyleSchema>;
export type ColorPalette = z.infer<typeof ColorPaletteSchema>;
export type LogoRules = z.infer<typeof LogoRulesSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
export type ColorGradePreset = z.infer<typeof ColorGradePresetSchema>;
export type ExportDefaults = z.infer<typeof ExportDefaultsSchema>;
export type BrandWorkspace = z.infer<typeof BrandWorkspaceSchema>;
