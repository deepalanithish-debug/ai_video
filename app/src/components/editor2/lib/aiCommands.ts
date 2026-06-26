import { useEditorStore, type Mood, type TransitionType } from '@/store/editorStore'

type Store = ReturnType<typeof useEditorStore.getState>

/** Contextual quick-suggestion chips shown in the AI panel. */
export const QUICK_CHIPS = [
  'Add captions to all scenes',
  'Improve pacing (faster)',
  'Apply cinematic transitions',
  'Trim first clip to 4s',
  'Apply luxury color grade',
  'Make it black and white',
  'Increase subtitle size',
  'Set mood to dramatic',
]

/**
 * Local natural-language → timeline edit processor. Handles the common
 * refinement commands synchronously against the store. (Phase 5 layers the
 * model-backed planner on top of this for open-ended requests.)
 */
export async function processAICommand(text: string, store: Store): Promise<string> {
  const lower = text.toLowerCase()

  if (lower.includes('transition')) {
    const type = lower.includes('fade') ? 'fade'
      : lower.includes('dissolve') ? 'dissolve'
      : lower.includes('zoom') ? 'zoom-in'
      : lower.includes('glitch') ? 'glitch'
      : lower.includes('slide') ? 'slide-left'
      : lower.includes('cinematic') ? 'cinematic-fade'
      : 'fade'
    store.scenes.forEach((s) => store.updateScene(s.id, { transition: { type: type as TransitionType, duration: 0.6 } }))
    return `Applied ${type} transitions to all ${store.scenes.length} scenes.`
  }

  if (lower.includes('caption') && (lower.includes('add') || lower.includes('generate'))) {
    store.scenes.forEach((sc) => {
      if (sc.captions.length === 0 && sc.description) {
        store.addCaption(sc.id)
        const updated = useEditorStore.getState().scenes.find((s) => s.id === sc.id)
        if (updated?.captions[0]) store.updateCaption(sc.id, updated.captions[0].id, { text: sc.description.slice(0, 60) })
      }
    })
    return 'Added captions to scenes with descriptions.'
  }

  if (lower.includes('faster') || lower.includes('pacing')) {
    store.scenes.forEach((s) => { if (s.duration > 2) store.updateScene(s.id, { duration: Math.max(2, s.duration * 0.7) }) })
    return 'Reduced all scene durations by 30% for faster pacing.'
  }
  if (lower.includes('slower')) {
    store.scenes.forEach((s) => store.updateScene(s.id, { duration: s.duration * 1.4 }))
    return 'Increased all scene durations by 40%.'
  }

  const trimMatch = lower.match(/trim.*?(\d+)\s*s(?:ec)?/)
  if (trimMatch && store.scenes.length > 0) {
    const secs = parseInt(trimMatch[1])
    store.updateScene(store.scenes[0].id, { duration: Math.max(1, secs) })
    return `Trimmed first scene to ${secs} seconds.`
  }

  if ((lower.includes('subtitle') || lower.includes('caption')) && (lower.includes('size') || lower.includes('larger') || lower.includes('bigger') || lower.includes('smaller'))) {
    const larger = lower.includes('larger') || lower.includes('bigger') || lower.includes('increase')
    store.scenes.forEach((sc) => sc.captions.forEach((cap) => store.updateCaption(sc.id, cap.id, { fontSize: larger ? Math.min(64, cap.fontSize + 8) : Math.max(12, cap.fontSize - 6) })))
    return `${larger ? 'Increased' : 'Decreased'} subtitle size across all scenes.`
  }

  const grades: [string[], string][] = [
    [['black and white', 'b&w', 'grayscale', 'greyscale'], 'Black & White'],
    [['warm'], 'Warm Sunset'],
    [['cool', 'cold', 'mist', 'blue tone'], 'Cool Mist'],
    [['vintage', 'retro', 'film grain'], 'Vintage Film'],
    [['neon', 'glow', 'vibrant'], 'Neon Glow'],
    [['teal', 'orange'], 'Teal & Orange'],
    [['desaturate', 'muted color'], 'Desaturated'],
    [['color grade', 'cinematic grade', 'luxury grade', 'cinematic look'], 'Cinematic Grade'],
  ]
  for (const [keys, grade] of grades) {
    if (keys.some((k) => lower.includes(k))) {
      store.scenes.forEach((s) => store.updateScene(s.id, { colorGrade: grade }))
      return `Applied ${grade} grade to all scenes.`
    }
  }
  if (lower.includes('remove grade') || lower.includes('clear grade') || lower.includes('no filter') || lower.includes('original color')) {
    store.scenes.forEach((s) => store.updateScene(s.id, { colorGrade: null }))
    return 'Removed color grade from all scenes.'
  }

  const moods: [string[], Mood][] = [
    [['luxury'], 'luxury'],
    [['energetic', 'energy', 'hype'], 'energetic'],
    [['calm', 'serene', 'peaceful'], 'calm'],
    [['dramatic', 'intense', 'dark'], 'dramatic'],
    [['playful', 'fun', 'happy'], 'playful'],
  ]
  for (const [keys, mood] of moods) {
    if (keys.some((k) => lower.includes(k))) {
      store.scenes.forEach((s) => store.updateScene(s.id, { mood }))
      return `Set mood to "${mood}" on all scenes.`
    }
  }

  const durMatch = lower.match(/(?:make|set).{0,20}(?:video|total|length|duration).{0,10}(\d+)\s*s/)
  if (durMatch) {
    const target = parseInt(durMatch[1])
    const per = Math.max(1, target / Math.max(1, store.scenes.length))
    store.scenes.forEach((s) => store.updateScene(s.id, { duration: parseFloat(per.toFixed(1)) }))
    return `Set each scene to ~${per.toFixed(1)}s for a total of ~${target}s.`
  }

  if ((lower.includes('remove') || lower.includes('delete') || lower.includes('clear')) && (lower.includes('caption') || lower.includes('subtitle') || lower.includes('text'))) {
    store.scenes.forEach((sc) => store.updateScene(sc.id, { captions: [] }))
    return 'Removed all captions from all scenes.'
  }

  if ((lower.includes('replace') || lower.includes('change') || lower.includes('remove')) && (lower.includes('music') || lower.includes('audio') || lower.includes('sound'))) {
    store.audioTracks.forEach((t) => store.updateAudioTrack(t.id, { muted: true }))
    return 'Muted existing music tracks. Open the Music tool to add a new one.'
  }

  const volMatch = lower.match(/(?:set|change|reduce|increase).{0,15}(?:volume|music|audio).{0,10}(\d+)\s*%/)
  if (volMatch) {
    const vol = Math.min(1, parseInt(volMatch[1]) / 100)
    store.audioTracks.forEach((t) => store.updateAudioTrack(t.id, { volume: vol }))
    return `Set music volume to ${volMatch[1]}%.`
  }

  return 'I can help with transitions, captions, pacing, color grades, mood, trim, and music. Try: "apply cinematic grade", "make it faster", "add captions", or "set mood to dramatic".'
}
