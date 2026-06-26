'use client'

import { useEffect } from 'react'
import { Sparkles, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { IconButton } from '@/components/ui'
import { AIPanel } from './AIPanel'
import { Inspector } from '../inspector/Inspector'

export type RightTab = 'ai' | 'inspector'

export function RightDock({ tab, onTabChange, onCollapse }: {
  tab: RightTab
  onTabChange: (t: RightTab) => void
  onCollapse?: () => void
}) {
  const inspectorTarget = useEditorStore((s) => s.inspectorTarget)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)

  // Surface the Inspector the moment something is selected to refine.
  useEffect(() => { if (inspectorTarget) onTabChange('inspector') }, [inspectorTarget, onTabChange])
  useEffect(() => { if (activeSceneId) onTabChange('inspector') }, [activeSceneId, onTabChange])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, flexShrink: 0 }}>
        <div className="tabs" role="tablist" aria-label="AI and Inspector" style={{ flex: 1 }}>
          <button type="button" role="tab" aria-selected={tab === 'ai'} className={`tab-item${tab === 'ai' ? ' active' : ''}`} onClick={() => onTabChange('ai')}>
            <Sparkles size={13} /> AI Director
          </button>
          <button type="button" role="tab" aria-selected={tab === 'inspector'} className={`tab-item${tab === 'inspector' ? ' active' : ''}`} onClick={() => onTabChange('inspector')}>
            <SlidersHorizontal size={13} /> Inspector
          </button>
        </div>
        {onCollapse && (
          <IconButton label="Collapse panel" variant="ghost" size="sm" onClick={onCollapse}>
            <ChevronRight size={14} />
          </IconButton>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'ai' ? <AIPanel /> : <div style={{ flex: 1, overflowY: 'auto' }}><Inspector /></div>}
      </div>
    </div>
  )
}
