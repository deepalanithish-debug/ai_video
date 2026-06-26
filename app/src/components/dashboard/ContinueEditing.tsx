'use client'

import Link from 'next/link'
import { Clock, Play, Film } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { MediaThumb } from './MediaThumb'
import { useProjects } from './useDashboard'
import { timeAgo } from '@/lib/format'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui'

export function ContinueEditing() {
  const { data, loading, error, reload } = useProjects()

  return (
    <section className="dash-section">
      <SectionHeader title="Continue editing" href="/projects" linkLabel="View all" />

      {loading ? (
        <div className="h-scroll" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={200} height={158} borderRadius="var(--r-xl)" />
          ))}
        </div>
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Film size={22} />}
          title="No projects yet"
          description="Generate a video from a prompt and it'll appear here so you can pick up right where you left off."
          action={
            <Link href="/workspace/new" className="btn btn-primary btn-sm">
              New project
            </Link>
          }
        />
      ) : (
        <div className="h-scroll">
          {data.map((p) => {
            const when = timeAgo(p.updated_at ?? p.created_at)
            return (
              <Link key={p.id} href={`/editor/${p.id}`} className="card card-interactive as-tile" style={{ minWidth: 200, flexShrink: 0 }}>
                <MediaThumb seed={p.id + p.name} src={p.thumbnail ?? undefined} height={108}>
                  <div className="media-overlay">
                    <span className="media-play">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </div>
                </MediaThumb>
                <div className="tile-body">
                  <div className="tile-title">{p.name}</div>
                  <div className="tile-meta">
                    {when && (
                      <>
                        <Clock size={10} /> {when}
                      </>
                    )}
                    {p.status && <span>· {p.status}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
