import Link from 'next/link'
import { SectionHeader } from './SectionHeader'
import { QUICK_ACTIONS } from './data'

export function QuickActions() {
  return (
    <section className="dash-section">
      <SectionHeader title="Quick actions" />
      <div className="grid-actions">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <Link key={a.title} href={a.href} className="card card-interactive feature-card as-tile">
              <span className={`tile-icon ${a.tone}`}>
                <Icon size={18} />
              </span>
              <div className="tile-title">{a.title}</div>
              <div className="feature-desc">{a.sub}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
