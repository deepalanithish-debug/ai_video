import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'

interface ShortcutHandlers {
  onOpenAI?: () => void
  onSave?: () => void
}

/** Professional editor keyboard map: Space/K play·pause, J/L ±5s, arrows frame-step, Home/End, ⌘K AI, ⌘S save, Esc deselect. */
export function useEditorShortcuts(handlers: ShortcutHandlers = {}) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const s = useEditorStore.getState()
      const meta = e.metaKey || e.ctrlKey

      if (meta && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); ref.current.onOpenAI?.(); return }
      if (meta && (e.key === 's' || e.key === 'S')) { e.preventDefault(); ref.current.onSave?.(); return }
      if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); s.isPlaying ? s.pause() : s.play(); return }
      if (e.key === 'Escape') { useEditorStore.setState({ activeSceneId: null, inspectorTarget: null }); return }
      if (e.key === 'j') { e.preventDefault(); s.seek(Math.max(0, s.currentTime - 5)); return }
      if (e.key === 'l') { e.preventDefault(); s.seek(Math.min(s.totalDuration, s.currentTime + 5)); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); s.seek(Math.max(0, s.currentTime - 1 / 24)); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); s.seek(Math.min(s.totalDuration, s.currentTime + 1 / 24)); return }
      if (e.key === 'Home') { e.preventDefault(); s.seek(0); return }
      if (e.key === 'End') { e.preventDefault(); s.seek(s.totalDuration); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
