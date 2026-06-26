import React from 'react'

function hashHue(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

/** Thumbnail surface: shows `src` if provided, else a deterministic gradient from `seed`. */
export function MediaThumb({
  seed,
  src,
  height = 110,
  className,
  children,
}: {
  seed: string
  src?: string | null
  height?: number
  className?: string
  children?: React.ReactNode
}) {
  const h = hashHue(seed)
  // Dynamic geometry/color derived from data — not a theme token.
  const bg: React.CSSProperties = src
    ? { backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, hsl(${h}, 38%, 16%), hsl(${(h + 42) % 360}, 50%, 30%))` }
  return (
    <div className={['media-thumb', className].filter(Boolean).join(' ')} style={{ height, ...bg }}>
      {children}
    </div>
  )
}
