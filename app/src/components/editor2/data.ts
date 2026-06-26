import {
  Film, Type, Captions as CaptionsIcon, Music, Layers, Wand2, Palette, Sparkles,
  Image as ImageIcon, LayoutTemplate, Upload, type LucideIcon,
} from 'lucide-react'
import type { LeftTab, Mood, AspectRatio } from '@/store/editorStore'

/* ── Left toolbox sections ──────────────────────────────────────────────────
   `tab` maps to the store's LeftTab when a panel exists; sections beyond the
   store's set (captions/color/assets/templates/uploads) render their own panel. */
export type ToolSection =
  | 'media' | 'ai' | 'text' | 'captions' | 'music' | 'transitions'
  | 'effects' | 'color' | 'brand' | 'assets' | 'templates' | 'uploads'

export const TOOL_SECTIONS: { id: ToolSection; label: string; Icon: LucideIcon; storeTab?: LeftTab }[] = [
  { id: 'media', label: 'Media', Icon: Film, storeTab: 'media' },
  { id: 'ai', label: 'AI Tools', Icon: Sparkles, storeTab: 'ai' },
  { id: 'text', label: 'Text', Icon: Type, storeTab: 'text' },
  { id: 'captions', label: 'Captions', Icon: CaptionsIcon, storeTab: 'text' },
  { id: 'music', label: 'Music', Icon: Music, storeTab: 'music' },
  { id: 'transitions', label: 'Transitions', Icon: Layers, storeTab: 'transitions' },
  { id: 'effects', label: 'Effects', Icon: Wand2, storeTab: 'effects' },
  { id: 'color', label: 'Color', Icon: Palette, storeTab: 'effects' },
  { id: 'brand', label: 'Brand Kit', Icon: Palette, storeTab: 'brand' },
  { id: 'assets', label: 'Assets', Icon: ImageIcon },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'uploads', label: 'Uploads', Icon: Upload },
]

/* ── Music library (royalty-free demo set) ─────────────────────────────────*/
export interface MusicTrackMeta { name: string; dur: string; genre: string; bpm: number; energy: string; mood: string }
export const MUSIC_TRACKS: MusicTrackMeta[] = [
  { name: 'Cinematic Rise', dur: '2:34', genre: 'Cinematic', bpm: 92, energy: 'High', mood: 'Epic' },
  { name: 'Deep Focus', dur: '3:12', genre: 'Ambient', bpm: 72, energy: 'Low', mood: 'Calm' },
  { name: 'Upbeat Drive', dur: '1:58', genre: 'Pop', bpm: 128, energy: 'High', mood: 'Energetic' },
  { name: 'Lo-Fi Chill', dur: '4:01', genre: 'Lo-Fi', bpm: 85, energy: 'Low', mood: 'Relaxed' },
  { name: 'Epic Trailer', dur: '2:20', genre: 'Cinematic', bpm: 110, energy: 'High', mood: 'Intense' },
  { name: 'Luxury Brand', dur: '1:45', genre: 'Ambient', bpm: 60, energy: 'Low', mood: 'Premium' },
  { name: 'Tech Corporate', dur: '2:10', genre: 'Electronic', bpm: 120, energy: 'Medium', mood: 'Professional' },
  { name: 'Summer Vibes', dur: '2:55', genre: 'Pop', bpm: 115, energy: 'High', mood: 'Happy' },
  { name: 'Dark Minimal', dur: '3:30', genre: 'Electronic', bpm: 95, energy: 'Medium', mood: 'Mysterious' },
  { name: 'Acoustic Warm', dur: '2:48', genre: 'Acoustic', bpm: 80, energy: 'Low', mood: 'Friendly' },
]
export const MUSIC_GENRES = ['All', 'Cinematic', 'Ambient', 'Pop', 'Electronic', 'Lo-Fi', 'Acoustic']

/* Energy → status token (no hardcoded hex). */
export const ENERGY_TOKEN: Record<string, string> = {
  Low: 'var(--success)', Medium: 'var(--warning)', High: 'var(--error)',
}

/* ── Transitions ───────────────────────────────────────────────────────────*/
export const TRANSITIONS_LIST = [
  { name: 'Cut', id: 'cut', icon: '✂' },
  { name: 'Fade', id: 'fade', icon: '◑' },
  { name: 'Dissolve', id: 'dissolve', icon: '∿' },
  { name: 'Zoom In', id: 'zoom-in', icon: '⊕' },
  { name: 'Slide Left', id: 'slide-left', icon: '←' },
  { name: 'Glitch', id: 'glitch', icon: '⚡' },
  { name: 'Whip', id: 'whip', icon: '↔' },
  { name: 'Light Leak', id: 'light-leak', icon: '☀' },
]

/* ── Color / LUT presets ───────────────────────────────────────────────────*/
export const EFFECTS_LIST = [
  'Cinematic Grade', 'Vintage Film', 'Teal & Orange', 'Black & White',
  'Warm Sunset', 'Cool Mist', 'Neon Glow', 'Desaturated',
]
/* Decorative swatch gradients for LUT previews (preset visual data). */
export const EFFECT_GRADIENTS: Record<string, string> = {
  'Warm Sunset': 'linear-gradient(135deg,#F59E0B,#EF4444)',
  'Cool Mist': 'linear-gradient(135deg,#3B82F6,#8B5CF6)',
  'Neon Glow': 'linear-gradient(135deg,#10B981,#6366F1)',
  'Black & White': 'linear-gradient(135deg,#111,#444)',
  'Teal & Orange': 'linear-gradient(135deg,#14B8A6,#F97316)',
  'Vintage Film': 'linear-gradient(135deg,#92400E,#D97706)',
  Desaturated: 'linear-gradient(135deg,#6B7280,#9CA3AF)',
}

export type ColorAdjKey = 'exposure' | 'contrast' | 'saturation' | 'temperature' | 'tint' | 'highlights' | 'shadows'
export const COLOR_ADJ_CONFIG: { key: ColorAdjKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'exposure', label: 'Exposure', min: -2, max: 2, step: 0.05 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1 },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 1 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1 },
]

/* ── Text presets ──────────────────────────────────────────────────────────*/
export const TEXT_PRESETS = [
  { name: 'Title', size: 48, weight: 'bold' },
  { name: 'Subtitle', size: 32, weight: '600' },
  { name: 'Caption', size: 20, weight: 'normal' },
  { name: 'Lower Third', size: 18, weight: '500' },
]

/* ── AI quick actions ──────────────────────────────────────────────────────*/
export const AI_ACTIONS = [
  { label: 'Generate caption for scene', icon: '✦', action: 'captions' },
  { label: 'Improve pacing (4s per scene)', icon: '⟳', action: 'pacing' },
  { label: 'Apply cinematic grade', icon: '◈', action: 'colorgrade' },
  { label: 'Add cinematic fade transitions', icon: '⊕', action: 'transitions' },
]

/* ── Moods & aspect ratios ─────────────────────────────────────────────────*/
export const MOODS: Mood[] = ['luxury', 'energetic', 'calm', 'dramatic', 'playful']
/* Mood accent colors — semantic data palette (documented hex exception). */
export const MOOD_COLORS: Record<Mood, string> = {
  luxury: '#C9A96E', energetic: '#F87171', calm: '#60A5FA', dramatic: '#A78BFA', playful: '#34D399', neutral: '#94A3B8',
}
export const ASPECT_RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1', '4:5', '3:4']
export const ASPECT_LABELS: Record<AspectRatio, string> = {
  '9:16': 'Reels', '16:9': 'YouTube', '1:1': 'Post', '4:5': 'Feed', '3:4': 'Portrait',
}

/* Brand color presets (swatch palette data). */
export const BRAND_SWATCHES = ['#6366F1', '#818CF8', '#F59E0B', '#10B981', '#EF4444', '#FFFFFF']
export const BRAND_FONTS = ['Inter', 'Geist', 'Playfair Display', 'Bebas Neue', 'DM Sans']

/* Canvas mood overlays — preview tint + placeholder gradient (visual data). */
export const MOOD_TINTS: Record<Mood, string> = {
  luxury: 'rgba(201,169,110,0.12)', energetic: 'rgba(248,113,113,0.10)', calm: 'rgba(96,165,250,0.10)',
  dramatic: 'rgba(167,139,250,0.12)', playful: 'rgba(52,211,153,0.10)', neutral: 'rgba(148,163,184,0.08)',
}
export const MOOD_GRADIENTS: Record<Mood, string> = {
  luxury: 'linear-gradient(135deg, #1a1208 0%, #2d2010 40%, #3d2d14 100%)',
  energetic: 'linear-gradient(135deg, #1a0808 0%, #2d1010 40%, #3d1414 100%)',
  calm: 'linear-gradient(135deg, #081018 0%, #0e1e30 40%, #0d2540 100%)',
  dramatic: 'linear-gradient(135deg, #0e0818 0%, #1a1030 40%, #20153d 100%)',
  playful: 'linear-gradient(135deg, #081a12 0%, #0e2d1e 40%, #103d28 100%)',
  neutral: 'linear-gradient(135deg, #0d0d12 0%, #141420 40%, #181825 100%)',
}
