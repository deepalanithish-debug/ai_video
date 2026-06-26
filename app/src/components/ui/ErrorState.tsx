import React from 'react'
import { Icons } from './icons'
import Button from './Button'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/** Friendly error state with a retry affordance. Announced via role="alert". */
export default function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  action,
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div className={['error-state', className].filter(Boolean).join(' ')} role="alert">
      <div className="error-state-icon" aria-hidden="true">
        {icon ?? <Icons.Warning size={24} />}
      </div>
      <div className="error-state-title">{title}</div>
      {description && <p className="error-state-desc">{description}</p>}
      {(onRetry || action) && (
        <div className="error-state-action">
          {onRetry && (
            <Button variant="secondary" size="sm" leftIcon={<Icons.Redo size={14} />} onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
