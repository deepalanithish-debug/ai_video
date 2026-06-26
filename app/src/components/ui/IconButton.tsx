import React from 'react'
import Spinner from './Spinner'
import { buttonVariantClass, type ButtonVariant } from './Button'

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible label — icon-only buttons have no visible text. */
  label: string
  variant?: ButtonVariant
  size?: IconButtonSize
  round?: boolean
  isLoading?: boolean
  children: React.ReactNode
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', round = false, isLoading = false, className, children, disabled, ...props },
  ref
) {
  const onAccent = variant === 'primary' || variant === 'ai'
  const classes = ['btn', buttonVariantClass[variant], 'icon-btn', `icon-btn-${size}`, round ? 'btn-round' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner size="xs" variant={onAccent ? 'white' : 'default'} /> : children}
    </button>
  )
})

export default IconButton
