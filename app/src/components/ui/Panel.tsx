import React from 'react'

export type PanelVariant = 'default' | 'sidebar' | 'floating' | 'modal' | 'inspector'

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant
  className?: string
  children?: React.ReactNode
}

const variantStyles: Record<PanelVariant, React.CSSProperties> = {
  default: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  sidebar: {
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRight: '1px solid var(--border)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
  },
  floating: {
    background: 'rgba(24,24,30,0.92)',
    backdropFilter: 'blur(24px) saturate(200%)',
    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 'var(--r-xl)',
    boxShadow: 'var(--shadow-xl)',
  },
  modal: {
    background: 'var(--bg-elevated)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-2xl)',
    boxShadow: 'var(--shadow-xl)',
  },
  inspector: {
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(16px) saturate(160%)',
    WebkitBackdropFilter: 'blur(16px) saturate(160%)',
    borderLeft: '1px solid var(--border)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
  },
}

function Panel({ variant = 'default', className, children, style, ...props }: PanelProps) {
  return (
    <div
      style={{ ...variantStyles[variant], ...style }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export default Panel
