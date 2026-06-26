'use client'

import React from 'react'

export interface TabItem {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
}

/** Accessible tablist with roving focus + arrow-key navigation. */
export function Tabs({ tabs, value, onChange, className, ...rest }: TabsProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const idx = tabs.findIndex((t) => t.value === value)

  function onKeyDown(e: React.KeyboardEvent) {
    let next = -1
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next >= 0) {
      e.preventDefault()
      onChange(tabs[next].value)
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
    }
  }

  return (
    <div ref={ref} role="tablist" className={['tabs', className].filter(Boolean).join(' ')} onKeyDown={onKeyDown} {...rest}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={active}
            aria-controls={`panel-${t.value}`}
            tabIndex={active ? 0 : -1}
            className={['tab-item', active ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(t.value)}
          >
            {t.icon}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  activeValue: string
}

export function TabPanel({ value, activeValue, children, className, ...rest }: TabPanelProps) {
  if (value !== activeValue) return null
  return (
    <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`} tabIndex={0} className={className} {...rest}>
      {children}
    </div>
  )
}
