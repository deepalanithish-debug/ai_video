import { useState, useRef, useCallback, useEffect } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

export type PanelEdge = 'left' | 'right' | 'timeline'

/** Owns the editor's resizable/collapsible panel geometry + fullscreen-preview mode. */
export function usePanelLayout() {
  const [leftWidth, setLeftWidth] = useState(312)
  const [rightWidth, setRightWidth] = useState(340)
  const [timelineHeight, setTimelineHeight] = useState(300)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const dragging = useRef<PanelEdge | null>(null)
  const start = useRef({ x: 0, y: 0, val: 0 })

  const onMove = useCallback((e: MouseEvent) => {
    const d = dragging.current
    if (!d) return
    if (d === 'left') setLeftWidth(Math.max(232, Math.min(520, start.current.val + (e.clientX - start.current.x))))
    else if (d === 'right') setRightWidth(Math.max(280, Math.min(560, start.current.val + (start.current.x - e.clientX))))
    else if (d === 'timeline') setTimelineHeight(Math.max(120, Math.min(720, start.current.val + (start.current.y - e.clientY))))
  }, [])

  const onUp = useCallback(() => { dragging.current = null; document.body.style.userSelect = '' }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onMove, onUp])

  const startDrag = useCallback((which: PanelEdge, e: ReactMouseEvent, val: number) => {
    dragging.current = which
    start.current = { x: e.clientX, y: e.clientY, val }
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }, [])

  return {
    leftWidth, rightWidth, timelineHeight,
    leftCollapsed, setLeftCollapsed, rightCollapsed, setRightCollapsed,
    fullscreen, setFullscreen, setTimelineHeight, startDrag,
  }
}
