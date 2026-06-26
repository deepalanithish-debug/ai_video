import { Plus, Film, Layout, Palette, Sparkles, Zap, ArrowRight, type LucideIcon } from 'lucide-react'

export const AI_AUTO_PROMPTS = [
  'Cinematic 30-second brand story with dramatic lighting, slow motion product reveals, and premium feel',
  'Viral TikTok hook video with fast cuts, bold text overlays, and trending music energy',
  'Luxury travel vlog with golden hour drone shots, soft color grading, and ambient soundscape',
  'Energetic product launch video with kinetic typography, neon accents, and futuristic transitions',
  'Emotional storytelling brand film with warm tones, personal moments, and inspiring narration',
  'Bold fashion lookbook reel with quick cuts, editorial photography style, and runway energy',
  'Tech startup explainer video with clean motion graphics, minimal design, and confident voiceover',
  'Food & lifestyle reel with mouth-watering close-ups, vibrant colors, and upbeat music',
]

export const QUICK_PROMPTS = [
  '30-second Instagram ad for a luxury product',
  'Cinematic travel vlog with slow motion shots',
  'Product launch video with bold typography',
  'Tutorial walkthrough with screen recording',
]

export const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn'] as const

export interface AspectOption { label: string; sub: string; w: number; h: number }
export const ASPECT_RATIOS: AspectOption[] = [
  { label: '9:16', sub: 'Reels', w: 36, h: 64 },
  { label: '16:9', sub: 'YouTube', w: 64, h: 36 },
  { label: '1:1', sub: 'Square', w: 52, h: 52 },
  { label: '4:5', sub: 'Feed', w: 48, h: 60 },
]

export interface QuickAction { icon: LucideIcon; title: string; sub: string; href: string; tone: string }
export const QUICK_ACTIONS: QuickAction[] = [
  { icon: Plus, title: 'New Project', sub: 'Start from scratch', href: '/workspace/new', tone: 'tone-indigo' },
  { icon: Film, title: 'Edit Footage', sub: 'Upload & edit with AI', href: '/footage', tone: 'tone-violet' },
  { icon: Layout, title: 'Browse Templates', sub: '12 new this week', href: '/templates', tone: 'tone-pink' },
  { icon: Palette, title: 'Brand Kit', sub: 'Set up your brand', href: '/brand-kit', tone: 'tone-emerald' },
]

export interface LearnCard { icon: LucideIcon; title: string; desc: string; tone: string }
export const LEARN_CARDS: LearnCard[] = [
  { icon: Sparkles, title: 'Generate in 60s', desc: 'Describe → AI creates a complete timeline', tone: 'tone-indigo' },
  { icon: Zap, title: 'AI Timeline', desc: 'Scene-by-scene breakdown powered by Gemini', tone: 'tone-violet' },
  { icon: Film, title: 'Professional Editor', desc: 'Trim, caption, music, transitions', tone: 'tone-pink' },
  { icon: ArrowRight, title: 'Export Anywhere', desc: '4K, reels, shorts, branded', tone: 'tone-emerald' },
]

export interface Template { id: number; name: string; platform: string; duration: string; scenes: number; rating: number; uses: number; tone: string }
export const TRENDING_TEMPLATES: Template[] = [
  { id: 1, name: 'Luxury Product Ad', platform: 'Instagram', duration: '0:30', scenes: 8, rating: 4.9, uses: 1240, tone: 'tone-pink' },
  { id: 2, name: 'Travel Cinematic', platform: 'YouTube', duration: '1:00', scenes: 12, rating: 4.8, uses: 893, tone: 'tone-blue' },
  { id: 3, name: 'TikTok Hook Viral', platform: 'TikTok', duration: '0:15', scenes: 5, rating: 4.7, uses: 2103, tone: 'tone-indigo' },
  { id: 4, name: 'Brand Story', platform: 'LinkedIn', duration: '0:45', scenes: 10, rating: 4.6, uses: 456, tone: 'tone-violet' },
]

export const PROMPT_LIBRARY: Record<string, string[]> = {
  Marketing: ['60-second product reveal with unboxing effect', 'Before/after transformation video', 'Customer testimonial montage'],
  Social: ['15-second trending hook for TikTok', 'Instagram story sequence', 'LinkedIn thought leadership clip'],
  Cinematic: ['Aerial drone city reveal', 'Golden hour nature montage', 'Slow motion action sequence'],
  Tutorial: ['Step-by-step how-to guide', 'App walkthrough with screen recording', 'FAQ explainer video'],
}
export const PROMPT_CATEGORY_TONE: Record<string, string> = {
  Marketing: 'tone-amber', Social: 'tone-pink', Cinematic: 'tone-indigo', Tutorial: 'tone-emerald',
}
export const PROMPT_CATEGORIES = ['All', 'Marketing', 'Social', 'Cinematic', 'Tutorial'] as const
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]

export function getGreeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
