import React from 'react'

export interface ProgressBarProps {
  /** 0–max. Ignored when indeterminate. */
  value?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ai'
  indeterminate?: boolean
  className?: string
  label?: string
}

export default function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  indeterminate = false,
  className,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const cls = [
    'progress',
    size !== 'md' ? `progress-${size}` : '',
    variant === 'ai' ? 'progress-ai' : '',
    indeterminate ? 'progress-indeterminate' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* width is dynamic geometry, not theming */}
      <div className="progress-fill" style={indeterminate ? undefined : { width: `${pct}%` }} />
    </div>
  )
}
