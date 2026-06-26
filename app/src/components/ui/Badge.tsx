import React from 'react'

export type BadgeVariant =
  | 'default' | 'accent' | 'success' | 'warning' | 'error' | 'ai' | 'premium' | 'outline'
export type BadgeSize = 'xs' | 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  removable?: boolean
  onRemove?: () => void
}

const sizeClass: Record<BadgeSize, string> = { xs: 'badge-xs', sm: '', md: 'badge-md' }

export default function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: BadgeProps) {
  const classes = ['badge', `badge-${variant}`, sizeClass[size], className].filter(Boolean).join(' ')
  return (
    <span className={classes} {...props}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
      {removable && (
        <button
          type="button"
          className="badge-remove"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
        >
          ✕
        </button>
      )}
    </span>
  )
}
