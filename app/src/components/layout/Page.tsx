import React from 'react'

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use the wider 1440px max-width (galleries, grids) instead of the 1200px default. */
  wide?: boolean
}

/** Standard centered page content column with consistent padding. */
export function PageContainer({ wide = false, className, children, ...props }: PageContainerProps) {
  return (
    <div className={[wide ? 'page-container-wide' : 'page-container', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** Standard page header: title + optional subtitle on the left, actions on the right. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={['page-header', className].filter(Boolean).join(' ')}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
