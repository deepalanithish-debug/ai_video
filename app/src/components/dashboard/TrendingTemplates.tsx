import Link from 'next/link'
import { Star } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { MediaThumb } from './MediaThumb'
import { TRENDING_TEMPLATES } from './data'

export function TrendingTemplates() {
  return (
    <section className="dash-section">
      <SectionHeader title="Trending templates" href="/templates" linkLabel="Browse all" />
      <div className="h-scroll">
        {TRENDING_TEMPLATES.map((t) => (
          <Link key={t.id} href="/templates" className="card card-interactive as-tile" style={{ minWidth: 220, flexShrink: 0 }}>
            <MediaThumb seed={t.name} height={116}>
              <span className={`tone-chip ${t.tone}`} style={{ position: 'absolute', top: 8, right: 8 }}>
                {t.platform}
              </span>
              <div className="media-overlay">
                <span className="badge badge-accent">Use template</span>
              </div>
            </MediaThumb>
            <div className="tile-body">
              <div className="tile-title">{t.name}</div>
              <div className="tile-meta">
                {t.duration} · {t.scenes} scenes
              </div>
              <div className="tile-meta" style={{ marginTop: 6 }}>
                <span className="rating-star">
                  <Star size={11} fill="currentColor" />
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{t.rating}</strong>
                <span>({t.uses.toLocaleString()} uses)</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
