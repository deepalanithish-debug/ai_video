import React from 'react'

export type CardVariant = 'default' | 'surface' | 'elevated' | 'glass' | 'interactive'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantClass: Record<CardVariant, string> = {
  default: '',
  surface: 'card-surface',
  elevated: 'card-elevated',
  glass: 'card-glass',
  interactive: 'card-interactive',
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  const classes = ['card', variantClass[variant], className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean
}

export function CardHeader({ withBorder = false, className, children, ...props }: CardSectionProps) {
  const classes = ['card-header', withBorder ? 'card-header-bordered' : '', className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['card-content', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ withBorder = false, className, children, ...props }: CardSectionProps) {
  const classes = ['card-footer', withBorder ? 'card-footer-bordered' : '', className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}
