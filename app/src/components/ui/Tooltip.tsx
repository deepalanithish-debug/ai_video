'use client'

import React from 'react'
import { createPortal } from 'react-dom'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: TooltipSide
  delay?: number
}

/** Hover/focus tooltip rendered in a portal so it never clips. */
export default function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const wrapRef = React.useRef<HTMLSpanElement>(null)
  const timer = React.useRef<number | undefined>(undefined)
  const tipId = React.useId()

  function show() {
    timer.current = window.setTimeout(() => {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 8
      const next =
        side === 'top' ? { top: r.top - gap, left: r.left + r.width / 2 }
        : side === 'bottom' ? { top: r.bottom + gap, left: r.left + r.width / 2 }
        : side === 'left' ? { top: r.top + r.height / 2, left: r.left - gap }
        : { top: r.top + r.height / 2, left: r.right + gap }
      setCoords(next)
      setOpen(true)
    }, delay)
  }

  function hide() {
    window.clearTimeout(timer.current)
    setOpen(false)
  }

  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!content) return <>{children}</>

  return (
    <span
      ref={wrapRef}
      className="tooltip-trigger"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open &&
        createPortal(
          <div id={tipId} role="tooltip" className={`tooltip-pop tooltip-${side}`} style={{ top: coords.top, left: coords.left }}>
            {content}
          </div>,
          document.body
        )}
    </span>
  )
}
