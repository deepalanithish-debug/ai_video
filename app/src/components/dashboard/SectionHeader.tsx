import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="section-head">
      <h2 className="text-heading-3">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="section-link">
          {linkLabel} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}
