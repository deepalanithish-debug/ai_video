import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LEARN_CARDS } from './data'

// Each learn card links to the most relevant existing route (there is no docs/learn route).
const LEARN_LINKS: Record<string, string> = {
  'Generate in 60s': '/workspace/new',
  'AI Timeline': '/ai-tools',
  'Professional Editor': '/editor',
  'Export Anywhere': '/projects',
}

export function LearnCards({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="dash-section animate-fade-up">
      <div className="section-head">
        <h2 className="text-heading-3">Learn VydeoAI</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDismiss}>
          Got it, hide this
        </button>
      </div>
      <div className="grid-actions">
        {LEARN_CARDS.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.title} href={LEARN_LINKS[c.title] ?? '/workspace/new'} className="card card-interactive feature-card">
              <span className={`tile-icon ${c.tone}`}>
                <Icon size={18} />
              </span>
              <div className="tile-title">{c.title}</div>
              <div className="feature-desc">{c.desc}</div>
              <span className="feature-cta">
                Learn <ArrowRight size={11} />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
