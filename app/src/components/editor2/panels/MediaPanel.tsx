'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Scissors } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { Dropzone, Modal, EmptyState, Button } from '@/components/ui'

export function MediaPanel() {
  const router = useRouter()
  const { clips, scenes, activeSceneId, addClip, assignClip, setActiveScene } = useEditorStore()
  const [showChoice, setShowChoice] = useState(false)
  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? null

  function ingest(files: File[]) {
    files.forEach((file) => {
      const src = URL.createObjectURL(file)
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)
      const id = crypto.randomUUID()
      const doAssign = () => {
        const empty = useEditorStore.getState().scenes.find((s) => !s.clipId)
        if (empty) { setActiveScene(empty.id); assignClip(id, empty.id) }
      }
      if (isVideo) {
        const vid = document.createElement('video')
        vid.preload = 'metadata'
        vid.onloadedmetadata = () => { addClip({ id, name: file.name, src, file, type: 'video', duration: vid.duration }); doAssign() }
        vid.onerror = () => { addClip({ id, name: file.name, src, file, type: 'video', duration: 5 }); doAssign() }
        vid.src = src
      } else {
        addClip({ id, name: file.name, src, file, type: 'image', duration: 4 })
        doAssign()
      }
    })
  }

  function onClipClick(clipId: string) {
    if (activeSceneId) assignClip(clipId, activeSceneId)
    else {
      const first = scenes.find((s) => !s.clipId)
      if (first) { setActiveScene(first.id); assignClip(clipId, first.id) }
    }
  }

  return (
    <div className="tool-panel">
      <div className="tool-pad">
        <Dropzone onFiles={ingest} accept="video/*,image/*" title="Drop clips or click to upload" hint="Video or images — assigned to your scenes" />
        <Button variant="secondary" size="sm" fullWidth leftIcon={<Scissors size={13} />} style={{ marginTop: 8 }} onClick={() => setShowChoice(true)}>
          Edit raw footage with AI
        </Button>
      </div>

      <div className="tool-pad" style={{ paddingTop: 0 }}>
        <div className="tool-label">Clips ({clips.length})</div>
        {clips.length === 0 ? (
          <EmptyState icon={<Film size={20} />} title="No clips yet" description="Upload media or generate it from the AI panel." />
        ) : (
          <div className="clip-grid">
            {clips.map((clip) => (
              <button
                type="button"
                key={clip.id}
                className={`clip-thumb${activeScene?.clipId === clip.id ? ' is-assigned' : ''}`}
                onClick={() => onClipClick(clip.id)}
                title={clip.name}
              >
                {clip.type === 'video' ? <video src={clip.src} muted /> : <img src={clip.src} alt="" />}
                <span className="clip-thumb-name">{clip.name}</span>
                {activeScene?.clipId === clip.id && <span className="clip-thumb-dot" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showChoice}
        onClose={() => setShowChoice(false)}
        title="Edit raw footage with AI"
        description="Upload your footage and describe the edit — AI arranges, trims, and adds transitions."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowChoice(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => { setShowChoice(false); router.push('/footage') }}>Open Footage Editor</Button>
          </>
        }
      />
    </div>
  )
}
