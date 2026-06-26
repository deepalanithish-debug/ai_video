'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, SkipBack, SkipForward, ChevronLeft, ChevronRight, Play, Pause,
  Undo2, Redo2, Download, Sparkles, Maximize2, Minimize2,
} from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { IconButton, Button } from '@/components/ui'
import { formatTimecode } from '@/lib/format'

function ToolbarTime() {
  const currentTime = useEditorStore((s) => s.currentTime)
  const totalDuration = useEditorStore((s) => s.totalDuration)
  return <span className="tb-time">{formatTimecode(currentTime)} / {formatTimecode(totalDuration)}</span>
}

export function EditorToolbar({ onOpenAI, onExport, exporting, fullscreen, onToggleFullscreen }: {
  onOpenAI: () => void
  onExport: () => void
  exporting: boolean
  fullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const router = useRouter()
  const projectName = useEditorStore((s) => s.projectName)
  const setProjectName = useEditorStore((s) => s.setProjectName)
  const isDirty = useEditorStore((s) => s.isDirty)
  const isPlaying = useEditorStore((s) => s.isPlaying)
  const zoom = useEditorStore((s) => s.zoom)
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(projectName)

  function transport(fn: 'start' | 'back' | 'toggle' | 'fwd' | 'end') {
    const s = useEditorStore.getState()
    if (fn === 'start') s.seek(0)
    else if (fn === 'back') s.seek(Math.max(0, s.currentTime - 1 / 30))
    else if (fn === 'toggle') (s.isPlaying ? s.pause() : s.play())
    else if (fn === 'fwd') s.seek(Math.min(s.totalDuration, s.currentTime + 1 / 30))
    else if (fn === 'end') s.seek(s.totalDuration)
  }

  return (
    <header className="editor-toolbar">
      <div className="tb-cluster">
        <IconButton label="Back to workspace" variant="ghost" size="sm" onClick={() => router.push('/workspace')}><ArrowLeft size={15} /></IconButton>
        <span className="tb-divider" />
        {editing ? (
          <input
            autoFocus
            className="tb-name-input"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { setProjectName(nameVal); setEditing(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setProjectName(nameVal); setEditing(false) }
              if (e.key === 'Escape') { setNameVal(projectName); setEditing(false) }
            }}
          />
        ) : (
          <button className="tb-name" onClick={() => { setNameVal(projectName); setEditing(true) }}>{projectName}</button>
        )}
        <span className={`save-dot ${isDirty ? 'is-saving' : 'is-saved'}`} title={isDirty ? 'Saving…' : 'All changes saved'} />
      </div>

      <div className="tb-cluster center">
        <IconButton label="Skip to start" variant="ghost" size="sm" onClick={() => transport('start')}><SkipBack size={15} /></IconButton>
        <IconButton label="Step back" variant="ghost" size="sm" onClick={() => transport('back')}><ChevronLeft size={14} /></IconButton>
        <button className="tb-play" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={() => transport('toggle')}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
        </button>
        <IconButton label="Step forward" variant="ghost" size="sm" onClick={() => transport('fwd')}><ChevronRight size={14} /></IconButton>
        <IconButton label="Skip to end" variant="ghost" size="sm" onClick={() => transport('end')}><SkipForward size={15} /></IconButton>
        <span className="tb-divider" />
        <ToolbarTime />
        <span className="tb-badge">24 fps</span>
      </div>

      <div className="tb-cluster">
        <IconButton label="Undo" variant="ghost" size="sm" disabled><Undo2 size={14} /></IconButton>
        <IconButton label="Redo" variant="ghost" size="sm" disabled><Redo2 size={14} /></IconButton>
        <span className="tb-divider" />
        <span className="tb-badge">{Math.round(zoom * 100)}%</span>
        <IconButton label={fullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'} variant="ghost" size="sm" onClick={onToggleFullscreen}>
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </IconButton>
        <span className="tb-divider" />
        <Button variant="ai" size="sm" leftIcon={<Sparkles size={13} />} onClick={onOpenAI}>AI</Button>
        <Button variant="primary" size="sm" leftIcon={<Download size={13} />} isLoading={exporting} onClick={onExport}>
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      </div>
    </header>
  )
}
