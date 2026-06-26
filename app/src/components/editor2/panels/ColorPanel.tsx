'use client'

import { useEditorStore } from '@/store/editorStore'
import { Slider, Button, EmptyState } from '@/components/ui'
import { Palette } from 'lucide-react'
import { EFFECTS_LIST, EFFECT_GRADIENTS, COLOR_ADJ_CONFIG, type ColorAdjKey } from '../data'
import { DEFAULT_ADJ } from '../lib/colorFilter'

export function ColorPanel() {
  const { scenes, activeSceneId, updateScene } = useEditorStore()
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  if (!activeSceneId || !activeScene) {
    return (
      <div className="tool-panel">
        <EmptyState icon={<Palette size={20} />} title="No scene selected" description="Select a scene on the timeline to grade its color." />
      </div>
    )
  }

  const adj = { ...DEFAULT_ADJ, ...(activeScene.colorAdjustments ?? {}) }
  const grade = activeScene.colorGrade ?? null
  const hasAdj = Object.values(adj).some((v) => v !== 0)

  const setAdj = (key: ColorAdjKey, val: number) => updateScene(activeSceneId, { colorAdjustments: { ...adj, [key]: val } })

  return (
    <div className="tool-panel">
      <div className="tool-pad">
        <div className="flex-between" style={{ marginBottom: 8 }}>
          <div className="tool-label" style={{ marginBottom: 0 }}>LUT presets</div>
          {grade && <button type="button" className="adj-val" onClick={() => updateScene(activeSceneId, { colorGrade: null })}>Clear</button>}
        </div>
        <div className="tool-grid-2">
          {EFFECTS_LIST.map((e) => {
            const active = grade === e
            return (
              <button key={e} type="button" className={`tool-tile${active ? ' is-active' : ''}`} onClick={() => updateScene(activeSceneId, { colorGrade: active ? null : e })}>
                <span className="lut-swatch" style={{ width: '100%', background: EFFECT_GRADIENTS[e] ?? 'linear-gradient(135deg,var(--accent),var(--ai-light))' }} />
                <span className="tool-tile-label">{e}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="tool-divider" />

      <div className="tool-pad" style={{ paddingTop: 0 }}>
        <div className="flex-between" style={{ marginBottom: 10 }}>
          <div className="tool-label" style={{ marginBottom: 0 }}>Adjustments</div>
          {hasAdj && <button type="button" className="adj-val" onClick={() => updateScene(activeSceneId, { colorAdjustments: { ...DEFAULT_ADJ } })}>Reset</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {COLOR_ADJ_CONFIG.map(({ key, label, min, max, step }) => {
            const val = adj[key]
            return (
              <div key={key} className="adj-row">
                <div className="adj-head">
                  <span className="adj-label">{label}</span>
                  <button type="button" className="adj-val" onClick={() => setAdj(key, 0)}>
                    {val > 0 ? `+${val.toFixed(step < 1 ? 2 : 0)}` : val.toFixed(step < 1 ? 2 : 0)}
                  </button>
                </div>
                <Slider min={min} max={max} step={step} value={val} aria-label={label} onChange={(e) => setAdj(key, parseFloat(e.target.value))} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="tool-pad" style={{ paddingTop: 0 }}>
        <Button variant="secondary" size="sm" fullWidth onClick={() => {
          const store = useEditorStore.getState()
          store.scenes.forEach((s) => store.updateScene(s.id, { colorGrade: grade, colorAdjustments: { ...adj } }))
        }}>
          Apply to all scenes
        </Button>
      </div>
    </div>
  )
}
