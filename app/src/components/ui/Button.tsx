import React from 'react'
import Spinner from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'ai'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
  ai: 'btn-ai',
}

const sizeClass: Record<ButtonSize, string> = { xs: 'btn-xs', sm: 'btn-sm', md: '', lg: 'btn-lg' }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth, className, children, disabled, ...props },
  ref
) {
  const onAccent = variant === 'primary' || variant === 'ai'
  const classes = ['btn', buttonVariantClass[variant], sizeClass[size], fullWidth ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size={size === 'lg' ? 'sm' : 'xs'} variant={onAccent ? 'white' : 'default'} />
          {children != null && <span className="btn-loading-text">{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="btn-icon-slot" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon-slot" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  )
})

export default Button
