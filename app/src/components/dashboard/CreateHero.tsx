'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Upload } from 'lucide-react'
import { Button, Segmented, PromptInput, UploadCard } from '@/components/ui'
import { AI_AUTO_PROMPTS, QUICK_PROMPTS, PLATFORMS, ASPECT_RATIOS, getGreeting } from './data'

export function CreateHero({ promptRef }: { promptRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  const router = useRouter()
  const [mode, setMode] = useState<'ai' | 'custom'>('custom')
  const [prompt, setPrompt] = useState('')
  const [platform, setPlatform] = useState<string | null>(null)
  const [aspect, setAspect] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [greeting, setGreeting] = useState('Welcome back')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setGreeting(getGreeting()), [])

  function go(extra: Record<string, string>) {
    if (files.length) (window as unknown as Record<string, unknown>).__vydeoUploadFiles = files
    const params = new URLSearchParams({ autoGenerate: '1', aspectRatio: ASPECT_RATIOS[aspect].label, ...extra })
    if (platform) params.set('platform', platform)
    router.push(`/workspace/new?${params.toString()}`)
  }
  const generate = () => prompt.trim() && go({ prompt: prompt.trim() })
  const autoGenerate = () => go({ prompt: AI_AUTO_PROMPTS[Math.floor(Math.random() * AI_AUTO_PROMPTS.length)], aiMode: 'auto' })

  function addFiles(list: FileList | null) {
    const incoming = Array.from(list ?? [])
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...incoming.filter((f) => !names.has(f.name))]
    })
  }

  return (
    <section className="dash-section">
      <div className="hero-grid">
        <div>
          <h1 className="create-greeting">{greeting},</h1>
          <p className="create-sub">What video will you create today?</p>

          <div style={{ margin: '20px 0' }}>
            <Segmented
              aria-label="Creation mode"
              options={[
                { value: 'ai', label: 'Full AI', icon: <Sparkles size={14} /> },
                { value: 'custom', label: 'Custom Prompt' },
                { value: 'footage', label: 'Edit Footage' },
              ]}
              value={mode}
              onChange={(v) => (v === 'footage' ? router.push('/footage') : setMode(v as 'ai' | 'custom'))}
            />
          </div>

          <div className="workspace-prompt-ring" style={{ marginBottom: 12 }}>
            <PromptInput
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onSubmit={() => (mode === 'ai' && !prompt.trim() ? autoGenerate() : generate())}
              minRows={mode === 'ai' ? 2 : 3}
              aria-label="Video prompt"
              placeholder={
                mode === 'ai'
                  ? "Optional: add a theme (e.g. 'luxury skincare brand') — or leave blank to let AI decide"
                  : "Describe your video… (e.g. '30-second Instagram ad for a luxury skincare brand')"
              }
            />
          </div>

          {mode === 'ai' ? (
            <>
              <Button
                variant="ai"
                size="lg"
                fullWidth
                leftIcon={<Sparkles size={18} />}
                onClick={() => (prompt.trim() ? generate() : autoGenerate())}
              >
                {prompt.trim() ? 'Generate with your prompt' : 'Generate — AI picks everything'}
              </Button>
              <p className="text-small" style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 10 }}>
                AI creates topic, style, scenes &amp; music — or uses your prompt as direction
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {QUICK_PROMPTS.map((qp) => (
                  <button key={qp} type="button" className={`chip${prompt === qp ? ' is-active' : ''}`} onClick={() => setPrompt(qp)}>
                    {qp}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="ai" leftIcon={<Sparkles size={15} />} disabled={!prompt.trim()} onClick={generate}>
                  Generate with AI
                </Button>
                <Button variant={files.length ? 'outline' : 'secondary'} leftIcon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
                  {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Upload reference'}
                </Button>
                <input ref={fileRef} type="file" multiple accept="video/*,image/*" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                <div style={{ display: 'flex', gap: 6, marginLeft: 4, flexWrap: 'wrap' }}>
                  {PLATFORMS.map((p) => (
                    <button key={p} type="button" className={`chip${platform === p ? ' is-active' : ''}`} aria-pressed={platform === p} onClick={() => setPlatform((prev) => (prev === p ? null : p))}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {files.length > 0 && (
                <div className="grid-cards" style={{ marginTop: 12 }}>
                  {files.map((f, i) => (
                    <UploadCard
                      key={f.name + i}
                      name={f.name}
                      sub={`${(f.size / 1024 / 1024).toFixed(1)} MB`}
                      onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Aspect ratio */}
        <div className="create-panel">
          <div className="section-label" style={{ marginBottom: 14 }}>Aspect ratio</div>
          <div className="aspect-grid" role="group" aria-label="Aspect ratio">
            {ASPECT_RATIOS.map((ar, i) => (
              <button key={ar.label} type="button" className={`aspect-tile${aspect === i ? ' is-active' : ''}`} aria-pressed={aspect === i} onClick={() => setAspect(i)}>
                <span className="aspect-preview" style={{ width: ar.w * 0.7, height: ar.h * 0.7 }} />
                <span style={{ textAlign: 'center' }}>
                  <span className="aspect-label" style={{ display: 'block' }}>{ar.label}</span>
                  <span className="aspect-sub" style={{ display: 'block' }}>{ar.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="card" style={{ marginTop: 16, padding: '12px 14px' }}>
            <div className="text-small" style={{ color: 'var(--text-tertiary)' }}>Selected</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {ASPECT_RATIOS[aspect].label} — {ASPECT_RATIOS[aspect].sub}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
