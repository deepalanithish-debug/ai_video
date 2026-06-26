/** Compose a CSS `filter` string from per-scene color adjustments + a LUT grade name. */

export interface ColorAdjustments {
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  tint: number
  highlights: number
  shadows: number
}

export const DEFAULT_ADJ: ColorAdjustments = {
  exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0,
}

export function buildCSSFilter(adj: Partial<ColorAdjustments> | undefined, grade: string | null): string {
  const a = { ...DEFAULT_ADJ, ...(adj ?? {}) }
  const parts: string[] = []

  const brightness = 1 + a.exposure
  if (Math.abs(brightness - 1) > 0.005) parts.push(`brightness(${brightness.toFixed(3)})`)

  const contrast = 1 + a.contrast / 100
  if (Math.abs(contrast - 1) > 0.005) parts.push(`contrast(${contrast.toFixed(3)})`)

  const saturate = 1 + a.saturation / 100
  if (Math.abs(saturate - 1) > 0.005) parts.push(`saturate(${saturate.toFixed(3)})`)

  const hue = -a.temperature * 0.35
  if (Math.abs(hue) > 0.5) parts.push(`hue-rotate(${hue.toFixed(1)}deg)`)

  switch (grade) {
    case 'Black & White':   parts.push('grayscale(1)'); break
    case 'Vintage Film':    parts.push('sepia(0.45) contrast(1.1) brightness(0.88)'); break
    case 'Warm Sunset':     parts.push('saturate(1.4) sepia(0.15) brightness(1.06)'); break
    case 'Cool Mist':       parts.push('saturate(0.75) hue-rotate(18deg) brightness(1.08)'); break
    case 'Neon Glow':       parts.push('saturate(2) brightness(1.12) contrast(1.2)'); break
    case 'Teal & Orange':   parts.push('saturate(1.5) hue-rotate(-14deg) contrast(1.08)'); break
    case 'Desaturated':     parts.push('saturate(0.18) contrast(1.05)'); break
    case 'Cinematic Grade': parts.push('contrast(1.12) saturate(0.82) brightness(0.88)'); break
  }

  return parts.length ? parts.join(' ') : 'none'
}
