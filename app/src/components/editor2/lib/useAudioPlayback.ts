import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'

/** Drives the timeline's audio layers: keeps <audio> elements synced to the playhead. */
export function useAudioPlayback() {
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const { audioTracks, isPlaying, currentTime, isMuted, volume } = useEditorStore()

  useEffect(() => {
    const existing = audioElsRef.current
    const activeIds = new Set(audioTracks.map((t) => t.id))

    for (const [id, el] of existing) {
      if (!activeIds.has(id)) { el.pause(); el.src = ''; existing.delete(id) }
    }

    for (const track of audioTracks) {
      if (!track.src) continue
      let el = existing.get(track.id)
      if (!el) { el = new Audio(); el.preload = 'auto'; existing.set(track.id, el) }
      if (el.src !== track.src) el.src = track.src
      el.volume = track.muted ? 0 : Math.min(1, (track.volume ?? 0.8) * (isMuted ? 0 : volume))
      el.loop = true

      const relTime = currentTime - (track.startTime ?? 0)
      if (isPlaying && relTime >= 0 && relTime < (track.duration || Infinity)) {
        if (Math.abs(el.currentTime - relTime) > 0.4) el.currentTime = Math.max(0, relTime)
        el.play().catch(() => {})
      } else {
        el.pause()
        if (!isPlaying && relTime >= 0) el.currentTime = Math.max(0, relTime)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTime, audioTracks, isMuted, volume])

  useEffect(() => {
    const els = audioElsRef.current
    return () => { for (const el of els.values()) { el.pause(); el.src = '' } }
  }, [])
}
