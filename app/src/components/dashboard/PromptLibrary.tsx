'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { PROMPT_LIBRARY, PROMPT_CATEGORIES, PROMPT_CATEGORY_TONE, type PromptCategory } from './data'

export function PromptLibrary({ onSelectPrompt }: { onSelectPrompt?: (prompt: string) => void }) {
  const router = useRouter()
  const [cat, setCat] = useState<PromptCategory>('All')

  const items =
    cat === 'All'
      ? Object.entries(PROMPT_LIBRARY).flatMap(([c, ps]) => ps.map((text) => ({ category: c, text })))
      : (PROMPT_LIBRARY[cat] ?? []).map((text) => ({ category: cat, text }))

  const choose = (prompt: string) =>
    onSelectPrompt ? onSelectPrompt(prompt) : router.push(`/workspace/new?prompt=${encodeURIComponent(prompt)}`)

  return (
    <section className="dash-section">
      <SectionHeader title="Prompt library" href="/workspace/new" linkLabel="Start with a prompt" />

      <div role="group" aria-label="Filter prompts by category" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PROMPT_CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip${cat === c ? ' is-active' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid-cards-3">
        {items.map(({ category, text }) => (
          <button key={text} type="button" className="card card-interactive prompt-card" onClick={() => choose(text)}>
            <span className={`tone-chip ${PROMPT_CATEGORY_TONE[category] ?? 'tone-indigo'}`}>{category}</span>
            <span className="prompt-card-text">{text}</span>
            <span className="prompt-card-cta">
              <Sparkles size={11} /> Use this prompt
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
