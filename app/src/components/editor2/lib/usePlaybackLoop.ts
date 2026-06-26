import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'

/** RAF playback ticker: advances currentTime and follows the active scene. */
export function usePlaybackLoop() {
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = null
      return
    }
    const tick = (now: number) => {
      if (lastRef.current !== null) {
        const delta = (now - lastRef.current) / 1000
        const store = useEditorStore.getState()
        const next = store.currentTime + delta
        if (next >= store.totalDuration) { store.stop(); return }
        store.seek(next)
        let elapsed = 0
        for (const scene of store.scenes) {
          if (next < elapsed + scene.duration) {
            if (scene.id !== store.activeSceneId) store.setActiveScene(scene.id)
            break
          }
          elapsed += scene.duration
        }
      }
      lastRef.current = now
      rafRef.current = requestAnimationFrame(tick)
    }
    lastRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying])
}
