/** Shared display formatters. */

/** Relative time, e.g. "2h ago". Accepts epoch ms, ISO string, or Date. */
export function timeAgo(input: number | string | Date | null | undefined): string {
  if (input == null) return ''
  const ts = typeof input === 'number' ? input : new Date(input).getTime()
  if (!ts || Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

/** Seconds → m:ss, e.g. 90 → "1:30". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds < 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Seconds → mm:ss.cs editing timecode, e.g. 12.34 → "00:12.34". */
export function formatTimecode(s: number): string {
  const safe = Number.isFinite(s) && s > 0 ? s : 0
  const m = Math.floor(safe / 60)
  const sec = Math.floor(safe % 60)
  const cs = Math.floor((safe % 1) * 100)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
