'use client'

import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { MediaThumb } from './MediaThumb'
import { useGenerations } from './useDashboard'
import { formatDuration } from '@/lib/format'
import { Skeleton, EmptyState, ErrorState } from '@/components/ui'

export function RecentGenerations() {
  const { data, loading, error, reload } = useGenerations(8)

  return (
    <section className="dash-section">
      <SectionHeader title="Recent AI generations" href="/workspace/new" linkLabel="New generation" />

      {loading ? (
        <div className="grid-cards" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={172} borderRadius="var(--r-xl)" />
          ))}
        </div>
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="No generations yet"
          description="Describe a video and AI will craft a full scene-by-scene timeline in seconds."
          action={
            <Link href="/workspace/new" className="btn btn-primary btn-sm">
              Generate a video
            </Link>
          }
        />
      ) : (
        <div className="grid-cards">
          {data.map((g) => (
            <Link key={g.id} href={`/workspace/${g.id}`} className="card card-interactive as-tile">
              <MediaThumb seed={g.id + (g.cluster ?? '')} height={100}>
                <div className="media-badges">
                  {g.durationSec ? <span className="media-badge">{formatDuration(g.durationSec)}</span> : null}
                  {g.aspectRatio ? <span className="media-badge">{g.aspectRatio}</span> : null}
                </div>
              </MediaThumb>
              <div className="tile-body">
                <p className="gen-quote">&ldquo;{g.promptPreview}&rdquo;</p>
                <div className="tile-meta" style={{ marginTop: 8, color: 'var(--accent-light)', fontWeight: 600 }}>
                  Open in Workspace <ChevronRight size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
