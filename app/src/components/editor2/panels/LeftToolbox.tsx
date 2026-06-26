'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, ImageIcon, LayoutTemplate, Sparkles } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { Button, EmptyState, Select } from '@/components/ui'
import {
  TOOL_SECTIONS, TRANSITIONS_LIST, TEXT_PRESETS, AI_ACTIONS, BRAND_SWATCHES, BRAND_FONTS,
  type ToolSection,
} from '../data'
import type { TransitionType } from '@/store/editorStore'
import { MediaPanel } from './MediaPanel'
import { MusicPanel } from './MusicPanel'
import { ColorPanel } from './ColorPanel'

/* ── Text / Captions ───────────────────────────────────────────────────────*/
function TextPanel() {
  const { scenes, activeSceneId, addCaption, removeCaption, updateCaption, setInspectorTarget } = useEditorStore()
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  function addPreset(preset?: { size: number }) {
    if (!activeSceneId) return
    addCaption(activeSceneId)
    requestAnimationFrame(() => {
      const scene = useEditorStore.getState().scenes.find((s) => s.id === activeSceneId)
      const last = scene?.captions.at(-1)
      if (last) {
        if (preset) updateCaption(activeSceneId, last.id, { fontSize: preset.size })
        setInspectorTarget({ type: 'caption', sceneId: activeSceneId, captionId: last.id })
      }
    })
  }

  if (!activeSceneId) {
    return <div className="tool-panel"><EmptyState title="No scene selected" description="Select a scene to add captions and text." /></div>
  }

  return (
    <div className="tool-panel">
      <div className="tool-pad">
        <Button variant="outline" size="sm" fullWidth leftIcon={<Plus size={13} />} onClick={() => addPreset()}>Add caption</Button>
      </div>
      {activeScene && activeScene.captions.length > 0 && (
        <div className="tool-pad" style={{ paddingTop: 0 }}>
          <div className="tool-label">Captions in scene</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {activeScene.captions.map((cap) => (
              <div key={cap.id} className="track-card" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px' }}>
                <button type="button" className="grow-min" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
                  onClick={() => setInspectorTarget({ type: 'caption', sceneId: activeSceneId, captionId: cap.id })}>
                  <div className="track-name">{cap.text || '(empty caption)'}</div>
                  <div className="track-sub"><span>{cap.fontFamily}</span><span className="track-dot" /><span>{cap.fontSize}px</span></div>
                </button>
                <button type="button" className="btn btn-ghost btn-xs" aria-label="Remove caption" onClick={() => removeCaption(activeSceneId, cap.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="tool-divider" />
      <div className="tool-pad" style={{ paddingTop: 0 }}>
        <div className="tool-label">Preset styles</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TEXT_PRESETS.map((p) => (
            <button key={p.name} type="button" className="track-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', cursor: 'pointer' }} onClick={() => addPreset(p)}>
              <span style={{ fontSize: p.name === 'Title' ? 14 : 12, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
              <span className="tool-note">{p.size}px</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Transitions ───────────────────────────────────────────────────────────*/
function TransitionsPanel() {
  const { scenes, activeSceneId, updateScene } = useEditorStore()
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null
  return (
    <div className="tool-panel">
      <div className="tool-pad">
        <div className="tool-label">Transition types</div>
        <div className="tool-grid-2">
          {TRANSITIONS_LIST.map((t) => {
            const active = activeScene?.transition?.type === t.id
            return (
              <button key={t.id} type="button" className={`tool-tile${active ? ' is-active' : ''}`}
                onClick={() => activeSceneId && updateScene(activeSceneId, { transition: { type: t.id as TransitionType, duration: 0.5 } })}>
                <span className="tool-tile-glyph">{t.icon}</span>
                <span className="tool-tile-label">{t.name}</span>
              </button>
            )
          })}
        </div>
        {!activeSceneId && <div className="tool-note" style={{ marginTop: 10, textAlign: 'center' }}>Select a scene to set its transition.</div>}
      </div>
    </div>
  )
}

/* ── AI quick tools ────────────────────────────────────────────────────────*/
function AIToolsPanel() {
  const { scenes, activeSceneId, addCaption, updateCaption, updateScene, setInspectorTarget } = useEditorStore()
  function run(action: string) {
    const store = useEditorStore.getState()
    if (action === 'captions' && activeSceneId) {
      const scene = store.scenes.find((s) => s.id === activeSceneId)
      if (!scene) return
      const text = scene.label || scene.description.split(' ').slice(0, 5).join(' ').toUpperCase()
      addCaption(activeSceneId)
      requestAnimationFrame(() => {
        const last = useEditorStore.getState().scenes.find((s) => s.id === activeSceneId)?.captions.at(-1)
        if (last) { updateCaption(activeSceneId, last.id, { text, fontSize: 28, bold: true, y: 85 }); setInspectorTarget({ type: 'caption', sceneId: activeSceneId, captionId: last.id }) }
      })
    } else if (action === 'pacing') scenes.forEach((s) => updateScene(s.id, { duration: 4 }))
    else if (action === 'transitions') scenes.forEach((s) => updateScene(s.id, { transition: { type: 'cinematic-fade' as TransitionType, duration: 0.7 } }))
    else if (action === 'colorgrade') scenes.forEach((s) => updateScene(s.id, { colorGrade: 'Cinematic Grade' }))
  }
  return (
    <div className="tool-panel">
      <div className="tool-pad">
        <div className="tool-label">Quick actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {AI_ACTIONS.map((a) => (
            <Button key={a.label} variant="outline" size="sm" fullWidth disabled={a.action === 'captions' && !activeSceneId}
              style={{ justifyContent: 'flex-start' }} onClick={() => run(a.action)}>
              <span style={{ marginRight: 6 }}>{a.icon}</span>{a.label}
            </Button>
          ))}
        </div>
        <div className="tool-note" style={{ marginTop: 10 }}>For conversational edits, use the AI Creative Director on the right.</div>
      </div>
    </div>
  )
}

/* ── Brand Kit ─────────────────────────────────────────────────────────────*/
function BrandPanel() {
  const { brandKit, updateBrandKit } = useEditorStore()
  const logoRef = useRef<HTMLInputElement>(null)
  function applyColor(c: string) {
    const store = useEditorStore.getState()
    store.scenes.forEach((s) => s.captions.forEach((cap) => store.updateCaption(s.id, cap.id, { color: c })))
  }
  function applyFont(font: string) {
    const store = useEditorStore.getState()
    store.scenes.forEach((s) => s.captions.forEach((cap) => store.updateCaption(s.id, cap.id, { fontFamily: font })))
  }
  return (
    <div className="tool-panel">
      <div className="tool-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="tool-label">Logo</div>
          <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0]; if (f) updateBrandKit({ logo: URL.createObjectURL(f) }); e.target.value = ''
          }} />
          <div className="brand-logo-drop" onClick={() => logoRef.current?.click()}>
            {brandKit?.logo ? <img src={brandKit.logo} alt="Brand logo" /> : <><Upload size={13} /> <span className="tool-note">Upload logo</span></>}
          </div>
        </div>
        <div>
          <div className="tool-label">Brand colors</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {BRAND_SWATCHES.map((c) => (
              <button key={c} type="button" className="brand-swatch" style={{ background: c }} title={`Apply ${c} to captions`} aria-label={`Apply ${c} to captions`} onClick={() => applyColor(c)} />
            ))}
          </div>
          <div className="tool-note" style={{ marginTop: 4 }}>Click a color to apply to all captions.</div>
        </div>
        <div>
          <div className="tool-label">Font</div>
          <Select options={BRAND_FONTS.map((f) => ({ label: f, value: f }))} placeholder="Choose a font" onChange={applyFont} aria-label="Brand font" />
          <div className="tool-note" style={{ marginTop: 4 }}>Applies to all captions.</div>
        </div>
      </div>
    </div>
  )
}

function ScaffoldPanel({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="tool-panel"><EmptyState icon={icon} title={title} description={description} /></div>
}

/* ── Left toolbox shell ────────────────────────────────────────────────────*/
export function LeftToolbox() {
  const setLeftTab = useEditorStore((s) => s.setLeftTab)
  const [active, setActive] = useState<ToolSection>('media')
  const section = TOOL_SECTIONS.find((s) => s.id === active) ?? TOOL_SECTIONS[0]

  function select(s: typeof TOOL_SECTIONS[number]) {
    setActive(s.id)
    if (s.storeTab) setLeftTab(s.storeTab)
  }

  function renderPanel() {
    switch (active) {
      case 'media': return <MediaPanel />
      case 'ai': return <AIToolsPanel />
      case 'text':
      case 'captions': return <TextPanel />
      case 'music': return <MusicPanel />
      case 'transitions': return <TransitionsPanel />
      case 'effects':
      case 'color': return <ColorPanel />
      case 'brand': return <BrandPanel />
      case 'assets': return <ScaffoldPanel icon={<ImageIcon size={20} />} title="Assets" description="AI-generated images and videos will collect here, ready to drag onto the timeline." />
      case 'templates': return <ScaffoldPanel icon={<LayoutTemplate size={20} />} title="Templates" description="Apply a starting structure. Browse the full library from Templates." />
      case 'uploads': return <ScaffoldPanel icon={<Upload size={20} />} title="Uploads" description="Your uploaded media lives in Media — drop files there to add them." />
      default: return null
    }
  }

  return (
    <>
      <div className="tool-rail" role="tablist" aria-label="Editing tools">
        {TOOL_SECTIONS.map((s) => {
          const Icon = s.Icon
          const isActive = s.id === active
          return (
            <button key={s.id} type="button" role="tab" aria-selected={isActive} title={s.label}
              className={`tool-rail-btn${isActive ? ' is-active' : ''}`} onClick={() => select(s)}>
              <Icon size={18} />
              <span className="lbl">{s.label}</span>
            </button>
          )
        })}
      </div>
      <div className="tool-panel-wrap" style={{ width: '100%' }}>
        <div className="tool-head">
          <span className="tool-head-title">{section.label}</span>
          {active === 'ai' && <Sparkles size={14} color="var(--accent-light)" />}
        </div>
        {renderPanel()}
      </div>
    </>
  )
}
