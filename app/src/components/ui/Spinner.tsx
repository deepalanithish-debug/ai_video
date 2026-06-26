import React from 'react'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'default' | 'white' | 'subtle'

export interface SpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
  /** Accessible label announced to screen readers. */
  label?: string
}

/** Indeterminate loading spinner. Color comes from the `variant` token class. */
export default function Spinner({ size = 'md', variant = 'default', className, label = 'Loading' }: SpinnerProps) {
  const cls = ['spinner', `spinner-${size}`, `spinner-${variant}`, className].filter(Boolean).join(' ')
  return <span className={cls} role="status" aria-label={label} />
}
