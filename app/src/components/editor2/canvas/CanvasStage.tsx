'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Upload, Grid3x3, Frame, Maximize2, Minimize2 } from 'lucide-react'
import { useEditorStore, type Scene } from '@/store/editorStore'
import { IconButton } from '@/components/ui'
import { buildCSSFilter } from '../lib/colorFilter'
import { formatTimecode } from '@/lib/format'
import { MOOD_COLORS, MOOD_TINTS, MOOD_GRADIENTS } from '../data'

function ScenePlaceholder({ scene, sceneIndex, totalScenes }: { scene: Scene | null; sceneIndex: number; totalScenes: number }) {
  const moodColor = scene ? MOOD_COLORS[scene.mood] : '#6366F1'
  const gradient = scene ? MOOD_GRADIENTS[scene.mood] : 'linear-gradient(160deg, #0d0d14 0%, #1a1a2e 100%)'
  return (
    <div style={{ width: '100%', height: '100%', background: gradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 35%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', zIndex: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>SC {String(sceneIndex + 1).padStart(2, '0')}</span>
        {scene && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 3, background: `${moodColor}18`, border: `1px solid ${moodColor}28` }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: moodColor }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: moodColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{scene.mood}</span>
          </span>
        )}
        <span style={{ flex: 1 }} />
        {totalScenes > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{sceneIndex + 1}/{totalScenes}</span>}
      </div>
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${moodColor}18`, border: `1px solid ${moodColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Upload size={16} color={moodColor} style={{ opacity: 0.7 }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Drop a clip or use the Media tool</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>Ask the AI director to refine · ⌘K</div>
      </div>
      {scene && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '28px 14px 12px', zIndex: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{scene.label}</div>
          {scene.description && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{scene.description}</div>}
        </div>
      )}
    </div>
  )
}

function CanvasTimecode() {
  const currentTime = useEditorStore((s) => s.currentTime)
  return <div className="canvas-timecode">{formatTimecode(currentTime)}</div>
}

function CanvasPreview({ containerWidth, containerHeight, showGrid, showSafe }: { containerWidth: number; containerHeight: number; showGrid: boolean; showSafe: boolean }) {
  const scenes = useEditorStore((s) => s.scenes)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)
  const aspectRatio = useEditorStore((s) => s.aspectRatio)
  const activeScene = scenes.find((s) => s.id === activeSceneId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [transitionFlash, setTransitionFlash] = useState<{ type: string; opacity: number } | null>(null)
  const [enterAnim, setEnterAnim] = useState<string | null>(null)
  const prevSceneIdRef = useRef<string | null>(null)
  const dragRef = useRef<{ captionId: string; sceneId: string; startX: number; startY: number; startCX: number; startCY: number } | null>(null)

  const sceneStartTime = useMemo(() => {
    let offset = 0
    for (const s of scenes) { if (s.id === activeSceneId) break; offset += s.duration }
    return offset
  }, [scenes, activeSceneId])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !activeScene?.clipSrc) return
    function seekAndPlay() {
      if (!v) return
      const store = useEditorStore.getState()
      let elapsed = 0
      for (const s of store.scenes) { if (s.id === store.activeSceneId) break; elapsed += s.duration }
      v.currentTime = Math.max(0, store.currentTime - elapsed)
      if (store.isPlaying) v.play().catch(() => {})
    }
    if (v.readyState >= 2) seekAndPlay()
    else { v.addEventListener('loadeddata', seekAndPlay, { once: true }); return () => v.removeEventListener('loadeddata', seekAndPlay) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.clipSrc])

  useEffect(() => {
    let prevPlaying = useEditorStore.getState().isPlaying
    let prevTime = useEditorStore.getState().currentTime
    const v0 = videoRef.current
    if (v0) {
      const { isPlaying, currentTime } = useEditorStore.getState()
      if (isPlaying) { const local = Math.max(0, currentTime - sceneStartTime); if (Math.abs(v0.currentTime - local) > 0.35) v0.currentTime = local; v0.play().catch(() => {}) }
      else v0.pause()
    }
    return useEditorStore.subscribe((state) => {
      const v = videoRef.current
      if (!v) return
      if (state.isPlaying !== prevPlaying) {
        prevPlaying = state.isPlaying
        if (state.isPlaying) { const local = Math.max(0, state.currentTime - sceneStartTime); if (Math.abs(v.currentTime - local) > 0.35) v.currentTime = local; v.play().catch(() => {}) }
        else v.pause()
      }
      if (!state.isPlaying && state.currentTime !== prevTime) {
        prevTime = state.currentTime
        const local = Math.max(0, state.currentTime - sceneStartTime)
        if (Math.abs(v.currentTime - local) > 0.05) v.currentTime = local
      }
    })
  }, [sceneStartTime])

  useEffect(() => {
    if (prevSceneIdRef.current !== null && prevSceneIdRef.current !== activeSceneId) {
      const prevScene = scenes.find((s) => s.id === prevSceneIdRef.current)
      const type = prevScene?.transition?.type ?? 'cut'
      const dur = (prevScene?.transition?.duration ?? 0.5) * 1000
      if (type !== 'cut') {
        setTransitionFlash({ type, opacity: 1 }); setTimeout(() => setTransitionFlash(null), dur)
        setEnterAnim(type); setTimeout(() => setEnterAnim(null), dur + 100)
      }
    }
    prevSceneIdRef.current = activeSceneId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current
      const frame = frameRef.current
      if (!drag || !frame) return
      const rect = frame.getBoundingClientRect()
      const dx = ((e.clientX - drag.startX) / rect.width) * 100
      const dy = ((e.clientY - drag.startY) / rect.height) * 100
      useEditorStore.getState().updateCaption(drag.sceneId, drag.captionId, {
        x: Math.max(5, Math.min(95, drag.startCX + dx)),
        y: Math.max(5, Math.min(95, drag.startCY + dy)),
      })
    }
    function onUp() { dragRef.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const [arW, arH] = aspectRatio.split(':').map(Number)
  let previewW = containerWidth - 48
  let previewH = (previewW / arW) * arH
  if (previewH > containerHeight - 48) { previewH = containerHeight - 48; previewW = (previewH / arH) * arW }
  previewW = Math.floor(previewW)
  previewH = Math.floor(previewH)

  const tint = activeScene ? MOOD_TINTS[activeScene.mood] ?? 'transparent' : 'transparent'
  const cssFilter = buildCSSFilter(activeScene?.colorAdjustments, activeScene?.colorGrade ?? null)

  const transitionOverlay = useMemo((): React.CSSProperties => {
    if (!transitionFlash) return { display: 'none' }
    const t = transitionFlash.type
    const base: React.CSSProperties = { position: 'absolute', inset: 0, opacity: transitionFlash.opacity, pointerEvents: 'none', zIndex: 10 }
    if (t === 'fade' || t === 'cinematic-fade' || t === 'dissolve') return { ...base, background: 'rgba(0,0,0,0.9)', transition: 'opacity 0.5s ease' }
    if (t === 'flash' || t === 'light-leak') return { ...base, background: 'rgba(255,255,255,0.95)', transition: 'opacity 0.4s ease' }
    if (t === 'glitch') return { ...base, background: 'rgba(99,102,241,0.5)', transition: 'opacity 0.3s ease', mixBlendMode: 'screen' }
    return { ...base, background: 'rgba(0,0,0,0.7)', transition: 'opacity 0.4s ease' }
  }, [transitionFlash])

  const enterStyle = useMemo((): React.CSSProperties => {
    if (!enterAnim) return {}
    const dur = `${activeScene?.transition?.duration ?? 0.5}s`
    const map: Record<string, string> = {
      'zoom-out': 'zoomOutEnter', 'zoom-in': 'zoomInEnter', fade: 'fadeEnter', 'cinematic-fade': 'fadeEnter',
      dissolve: 'fadeEnter', 'slide-left': 'slideLeftEnter', 'slide-right': 'slideRightEnter', whip: 'whipEnter',
    }
    const anim = map[enterAnim]
    return anim ? { animation: `${anim} ${dur} ease-out forwards` } : {}
  }, [enterAnim, activeScene?.transition?.duration])

  const mediaStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', filter: cssFilter !== 'none' ? cssFilter : undefined, ...enterStyle }

  return (
    <div className="canvas-fill">
      <div ref={frameRef} className="canvas-frame" style={{ width: previewW, height: previewH }}>
        {activeScene?.clipSrc ? (
          activeScene.clipType === 'video'
            ? <video ref={videoRef} src={activeScene.clipSrc} muted={activeScene.muteVideoAudio === true} playsInline preload="auto" style={mediaStyle} />
            : <img src={activeScene.clipSrc} alt="" style={mediaStyle} />
        ) : (
          <ScenePlaceholder scene={activeScene ?? null} sceneIndex={activeScene ? scenes.findIndex((s) => s.id === activeScene.id) : 0} totalScenes={scenes.length} />
        )}

        {tint !== 'transparent' && <div style={{ position: 'absolute', inset: 0, background: tint, pointerEvents: 'none' }} />}
        {showGrid && <div className="canvas-grid" />}
        {showSafe && <div className="canvas-safe" />}
        <div style={transitionOverlay} />

        {activeScene?.captions.map((cap) => (
          <div
            key={cap.id}
            className="canvas-cap"
            style={{
              left: `${cap.x}%`, top: `${cap.y}%`,
              fontSize: cap.fontSize * (previewW / 1080),
              fontWeight: cap.bold ? 'bold' : 'normal',
              fontStyle: cap.italic ? 'italic' : 'normal',
              fontFamily: cap.fontFamily,
              color: cap.color,
              textAlign: cap.align,
              textShadow: cap.shadow ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
            }}
            onMouseDown={(e) => {
              e.stopPropagation(); e.preventDefault()
              dragRef.current = { captionId: cap.id, sceneId: activeScene.id, startX: e.clientX, startY: e.clientY, startCX: cap.x, startCY: cap.y }
              document.body.style.cursor = 'move'; document.body.style.userSelect = 'none'
              useEditorStore.getState().setInspectorTarget({ type: 'caption', sceneId: activeScene.id, captionId: cap.id })
            }}
          >
            {cap.text}
          </div>
        ))}

        <div className="canvas-badge">{aspectRatio}</div>
        <CanvasTimecode />
      </div>
    </div>
  )
}

function CanvasResizer({ showGrid, showSafe }: { showGrid: boolean; showSafe: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => { const r = entries[0].contentRect; setSize({ w: r.width, h: r.height }) })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      {size.w > 0 && <CanvasPreview containerWidth={size.w} containerHeight={size.h} showGrid={showGrid} showSafe={showSafe} />}
    </div>
  )
}

function ControlsTime() {
  const currentTime = useEditorStore((s) => s.currentTime)
  const totalDuration = useEditorStore((s) => s.totalDuration)
  return <span className="tb-time">{formatTimecode(currentTime)} / {formatTimecode(totalDuration)}</span>
}

function CanvasControls({ showGrid, setShowGrid, showSafe, setShowSafe, fullscreen, onToggleFullscreen }: {
  showGrid: boolean; setShowGrid: (v: boolean) => void; showSafe: boolean; setShowSafe: (v: boolean) => void
  fullscreen?: boolean; onToggleFullscreen?: () => void
}) {
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const play = useEditorStore((s) => s.play)
  const pause = useEditorStore((s) => s.pause)
  return (
    <div className="canvas-controls">
      <IconButton label={isPlaying ? 'Pause' : 'Play'} variant="ghost" size="sm" onClick={() => (isPlaying ? pause() : play())}>
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </IconButton>
      <ControlsTime />
      <span className="tb-divider" style={{ height: 16 }} />
      <IconButton label="Rule-of-thirds grid" variant={showGrid ? 'primary' : 'ghost'} size="sm" onClick={() => setShowGrid(!showGrid)}><Grid3x3 size={14} /></IconButton>
      <IconButton label="Safe area guides" variant={showSafe ? 'primary' : 'ghost'} size="sm" onClick={() => setShowSafe(!showSafe)}><Frame size={14} /></IconButton>
      {onToggleFullscreen && (
        <IconButton label={fullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'} variant="ghost" size="sm" onClick={onToggleFullscreen}>
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </IconButton>
      )}
    </div>
  )
}

export function CanvasStage({ fullscreen, onToggleFullscreen }: { fullscreen?: boolean; onToggleFullscreen?: () => void }) {
  const [showGrid, setShowGrid] = useState(false)
  const [showSafe, setShowSafe] = useState(false)
  return (
    <div className="canvas-stage">
      <CanvasResizer showGrid={showGrid} showSafe={showSafe} />
      <CanvasControls showGrid={showGrid} setShowGrid={setShowGrid} showSafe={showSafe} setShowSafe={setShowSafe} fullscreen={fullscreen} onToggleFullscreen={onToggleFullscreen} />
    </div>
  )
}
