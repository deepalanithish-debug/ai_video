'use client'

import { Plus, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useEditorStore, type Mood, type TransitionType } from '@/store/editorStore'
import { Input, Textarea, Select, Slider, Button, EmptyState } from '@/components/ui'
import { MOODS, MOOD_COLORS, ASPECT_RATIOS, ASPECT_LABELS, BRAND_FONTS } from '../data'
import { formatTimecode } from '@/lib/format'

const CAPTION_COLORS = ['#FFFFFF', '#F0F0F8', '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#000000']
const CAPTION_ANIMS = ['none', 'fade', 'slide-up', 'slide-down', 'typewriter', 'scale', 'bounce']
const SCENE_TRANSITIONS = ['cut', 'fade', 'dissolve', 'wipe-left', 'wipe-right', 'zoom-in', 'slide-left', 'glitch', 'cinematic-fade']
const POSITIONS: [string, number, number][] = [
  ['TL', 10, 10], ['TC', 50, 10], ['TR', 90, 10],
  ['ML', 10, 50], ['MC', 50, 50], ['MR', 90, 50],
  ['BL', 10, 85], ['BC', 50, 85], ['BR', 90, 85],
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="insp-field">
      <label className="insp-field-label">{label}</label>
      {children}
    </div>
  )
}

export function Inspector() {
  const {
    scenes, activeSceneId, aspectRatio, totalDuration,
    setAspectRatio, updateScene, addScene, removeScene, updateCaption,
    audioTracks, updateAudioTrack, removeAudioTrack, inspectorTarget,
  } = useEditorStore()

  /* ── Caption ──────────────────────────────────────────────────────────*/
  if (inspectorTarget?.type === 'caption') {
    const scene = scenes.find((s) => s.id === inspectorTarget.sceneId)
    const caption = scene?.captions.find((c) => c.id === inspectorTarget.captionId)
    if (!scene || !caption) return null
    const upd = (patch: Partial<typeof caption>) => updateCaption(scene.id, caption.id, patch)
    return (
      <div className="insp">
        <div className="insp-title">Caption</div>
        <Field label="Text"><Textarea value={caption.text} rows={3} autoResize onChange={(e) => upd({ text: e.target.value })} /></Field>
        <Field label="Font"><Select options={BRAND_FONTS.map((f) => ({ label: f, value: f }))} value={caption.fontFamily} onChange={(v) => upd({ fontFamily: v })} /></Field>
        <Field label={`Size — ${caption.fontSize}px`}><Slider min={8} max={120} step={2} value={caption.fontSize} onChange={(e) => upd({ fontSize: Number(e.target.value) })} aria-label="Font size" /></Field>
        <Field label="Color">
          <div className="swatch-row">
            {CAPTION_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch${caption.color === c ? ' is-active' : ''}`} style={{ background: c }} aria-label={`Color ${c}`} onClick={() => upd({ color: c })} />
            ))}
          </div>
        </Field>
        <Field label="Animation">
          <Select options={CAPTION_ANIMS.map((a) => ({ label: a, value: a }))} value={caption.animation} onChange={(v) => upd({ animation: v as typeof caption.animation })} />
        </Field>
        <Field label="Position">
          <div className="pos-grid">
            {POSITIONS.map(([lbl, x, y]) => (
              <button key={lbl} type="button" className={`pos-cell${caption.x === x && caption.y === y ? ' is-active' : ''}`} onClick={() => upd({ x, y })}>{lbl}</button>
            ))}
          </div>
        </Field>
      </div>
    )
  }

  /* ── Audio (music) ────────────────────────────────────────────────────*/
  if (inspectorTarget?.type === 'audio') {
    const track = audioTracks.find((t) => t.id === inspectorTarget.id)
    if (!track) return null
    return (
      <div className="insp">
        <div className="insp-title">Music</div>
        <Field label="Track">
          <div className="track-name">{track.name}</div>
        </Field>
        <Field label={`Volume — ${Math.round((track.volume ?? 0.8) * 100)}%`}>
          <Slider min={0} max={1} step={0.01} value={track.volume ?? 0.8} onChange={(e) => updateAudioTrack(track.id, { volume: parseFloat(e.target.value) })} aria-label="Volume" />
        </Field>
        <Field label={`Fade in — ${(track.fadeIn ?? 0).toFixed(1)}s`}>
          <Slider min={0} max={3} step={0.1} value={track.fadeIn ?? 0} onChange={(e) => updateAudioTrack(track.id, { fadeIn: parseFloat(e.target.value) })} aria-label="Fade in" />
        </Field>
        <Field label={`Fade out — ${(track.fadeOut ?? 0).toFixed(1)}s`}>
          <Slider min={0} max={3} step={0.1} value={track.fadeOut ?? 0} onChange={(e) => updateAudioTrack(track.id, { fadeOut: parseFloat(e.target.value) })} aria-label="Fade out" />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" fullWidth leftIcon={track.muted ? <VolumeX size={13} /> : <Volume2 size={13} />} onClick={() => updateAudioTrack(track.id, { muted: !track.muted })}>
            {track.muted ? 'Unmute' : 'Mute'}
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => removeAudioTrack(track.id)}>Delete</Button>
        </div>
      </div>
    )
  }

  /* ── Scene ────────────────────────────────────────────────────────────*/
  const activeScene = scenes.find((s) => s.id === activeSceneId)
  if (activeScene) {
    return (
      <div className="insp">
        <div className="insp-title">Scene</div>
        <Field label="Label"><Input value={activeScene.label} onChange={(e) => updateScene(activeScene.id, { label: e.target.value })} /></Field>
        <Field label={`Duration — ${activeScene.duration}s`}><Slider min={0.5} max={60} step={0.5} value={activeScene.duration} onChange={(e) => updateScene(activeScene.id, { duration: Number(e.target.value) })} aria-label="Duration" /></Field>
        <Field label="Mood">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {MOODS.map((m) => {
              const active = activeScene.mood === m
              return (
                <button key={m} type="button" className="chip" style={active ? { background: `color-mix(in srgb, ${MOOD_COLORS[m as Mood]} 18%, transparent)`, borderColor: `${MOOD_COLORS[m as Mood]}55`, color: MOOD_COLORS[m as Mood], textTransform: 'capitalize' } : { textTransform: 'capitalize' }} onClick={() => updateScene(activeScene.id, { mood: m })}>{m}</button>
              )
            })}
          </div>
        </Field>
        <Field label="Transition in">
          <Select options={SCENE_TRANSITIONS.map((t) => ({ label: t, value: t }))} value={activeScene.transition.type} onChange={(v) => updateScene(activeScene.id, { transition: { ...activeScene.transition, type: v as TransitionType } })} />
        </Field>
        <Field label="Description"><Textarea value={activeScene.description} rows={2} autoResize onChange={(e) => updateScene(activeScene.id, { description: e.target.value })} /></Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button variant="secondary" size="sm" fullWidth leftIcon={<Plus size={13} />} onClick={() => addScene(activeScene.id)}>Add scene after</Button>
          <Button variant="danger" size="sm" fullWidth leftIcon={<Trash2 size={13} />} onClick={() => removeScene(activeScene.id)}>Delete scene</Button>
        </div>
      </div>
    )
  }

  /* ── Project (default) ────────────────────────────────────────────────*/
  return (
    <div className="insp">
      <div className="insp-title">Project</div>
      <Field label="Aspect ratio">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ASPECT_RATIOS.map((ar) => {
            const active = aspectRatio === ar
            return (
              <button key={ar} type="button" className="track-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', cursor: 'pointer', borderColor: active ? 'var(--accent-border)' : undefined, background: active ? 'var(--accent-subtle)' : undefined, color: active ? 'var(--accent-light)' : 'var(--text-secondary)' }} onClick={() => setAspectRatio(ar)}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{ar}</span>
                <span className="tool-note">{ASPECT_LABELS[ar]}</span>
              </button>
            )
          })}
        </div>
      </Field>
      <Field label="Total duration">
        <div className="track-card" style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{formatTimecode(totalDuration)}</div>
      </Field>
      <Field label="Scenes">
        <div className="track-card" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{scenes.length}</div>
      </Field>
      <div className="tool-note">Select a scene, caption, or track to edit it here.</div>
    </div>
  )
}
