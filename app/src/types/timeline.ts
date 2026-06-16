import { z } from "zod";

export const TransitionTypeSchema = z.enum([
  // Basic
  "cut", "hard-cut",
  // Fade
  "fade", "fade-to-black", "fade-to-white",
  // Dissolve
  "dissolve", "cross-dissolve",
  // Zoom
  "zoom-in", "zoom-out", "zoom-punch",
  // Slide
  "slide-left", "slide-right", "slide-up", "slide-down",
  // Push
  "push-left", "push-right", "push-up", "push-down",
  // Wipe
  "wipe-left", "wipe-right",
  // Glitch
  "glitch", "rgb-split",
  // Slice
  "slice-h", "slice-v",
  // Blur
  "blur-fade", "zoom-blur",
  // Motion
  "whip-pan-left", "whip-pan-right",
  // Cinematic
  "cinematic-fade", "film-burn",
]);

export const TextPlacementSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(5).max(100),
  alignment: z.enum(["left", "center", "right"]),
});

export const CaptionLineSchema = z.object({
  id: z.string(),
  text: z.string().max(200),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  placement: TextPlacementSchema.optional(),
  style: z.enum(["brand-default", "highlight", "subtle", "bold"]).optional(),
});

export const OverlayElementSchema = z.object({
  id: z.string(),
  type: z.enum(["logo", "text", "shape", "watermark"]),
  content: z.string().optional(),
  placement: TextPlacementSchema,
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  opacity: z.number().min(0).max(1).optional(),
  scale: z.number().min(0.1).max(3).optional(),
});

export const AudioLayerSchema = z.object({
  id: z.string(),
  type: z.enum(["bgm", "sfx", "voiceover"]),
  src: z.string().optional(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  volume: z.number().min(0).max(1),
  fadeIn: z.number().min(0).optional(),
  fadeOut: z.number().min(0).optional(),
});

export const SceneSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  label: z.string().max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(0.5).max(60),
  clipSrc: z.string().optional(),
  clipType: z.enum(["video", "image"]).optional(),
  clipTrimStart: z.number().min(0).optional(),
  clipTrimEnd: z.number().min(0).optional(),
  transition: z.object({
    type: TransitionTypeSchema,
    duration: z.number().min(0).max(3),
    speed: z.enum(["slow", "normal", "fast"]).optional(),
    intensity: z.number().min(0).max(1).optional(),
    direction: z.enum(["left", "right", "up", "down", "auto"]).optional(),
    mode: z.enum(["in", "out", "both"]).optional(),
    easing: z.string().optional(),
    blurAmount: z.number().min(0).max(20).optional(),
    motionStrength: z.number().min(0).max(1).optional(),
  }).optional(),
  captions: z.array(CaptionLineSchema).default([]),
  overlays: z.array(OverlayElementSchema).default([]),
  colorGradeOverride: z.string().optional(),
  motionStyle: z.enum(["static", "slow-pan", "fast-cut", "ken-burns", "zoom-pulse"]).optional(),
  mood: z.enum(["luxury", "energetic", "calm", "dramatic", "playful"]).optional(),
  playbackSpeed: z.number().min(0.1).max(16).optional(),
  visualEffect: z.string().optional(),
});

export const LineupMetaSchema = z.object({
  generatedBy: z.string(),  // accept any model name Gemini may return
  promptUsed: z.string(),
  brandWorkspaceId: z.string(),
  qaScore: z.number().min(0).max(100).optional(),
  qaNotes: z.string().optional(),
  version: z.number().int().min(1),
});

export const TimelineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(200),
  brandWorkspaceId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  totalDuration: z.number().min(1).max(600),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5", "3:4"]),
  targetPlatform: z.enum(["instagram", "tiktok", "youtube", "reels", "facebook", "generic"]).optional(),
  scenes: z.array(SceneSchema).max(50).default([]),
  audioLayers: z.array(AudioLayerSchema),
  globalColorGrade: z.string().optional(),
  meta: LineupMetaSchema.optional(),
  isLocked: z.boolean().default(false),
});

export const LineupResponseSchema = z.object({
  timeline: TimelineSchema,
  suggestions: z.object({
    captionTiming: z.string().optional(),
    transitionRationale: z.string().optional(),
    brandNotes: z.string().optional(),
    improvements: z.array(z.string()).optional(),
  }).optional(),
});

export type TransitionType = z.infer<typeof TransitionTypeSchema>;
export type CaptionLine = z.infer<typeof CaptionLineSchema>;
export type OverlayElement = z.infer<typeof OverlayElementSchema>;
export type AudioLayer = z.infer<typeof AudioLayerSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneClipType = "video" | "image";
export type Timeline = z.infer<typeof TimelineSchema>;
export type LineupResponse = z.infer<typeof LineupResponseSchema>;
