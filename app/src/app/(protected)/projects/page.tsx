'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ConfirmDialog, ErrorState, useToast } from '@/components/ui'
import type { DbProject } from '@/lib/user-db'
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Film,
  Sparkles,
  FolderPlus,
  Folder,
  ChevronDown,
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Clock,
  GitBranch,
  Share2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  FolderOpen,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  status: 'active' | 'complete' | 'archived'
  platform: string
  lastEdited: string
  updatedAt: string
  progress: number
  thumbnail: string | null
  gradient: string
  autosave: 'saved' | 'saving' | 'unsaved'
  projectType: string
}

// ── Folders (display-only; no backend yet) ──────────────────────────────────────

const mockFolders = [
  { id: 'f1', name: 'Marketing', count: 3 },
  { id: 'f2', name: 'Social Media', count: 2 },
  { id: 'f3', name: 'Client Work', count: 1 },
]

// ── DB → view-model mapping ─────────────────────────────────────────────────────

// Deterministic gradient palette; picked per-project by hashing the id so a
// given project always renders with the same thumbnail gradient.
const GRADIENT_PALETTE = [
  'linear-gradient(135deg, #1a1035, #6366F1)',
  'linear-gradient(135deg, #0f2027, #2c5364)',
  'linear-gradient(135deg, #0a0a0a, #374151)',
  'linear-gradient(135deg, #1e3a5f, #0f3460)',
  'linear-gradient(135deg, #3b0764, #7e22ce)',
  'linear-gradient(135deg, #052e16, #166534)',
]

function gradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return GRADIENT_PALETTE[Math.abs(hash) % GRADIENT_PALETTE.length]
}

// Map a stored project_type to a human-facing platform label. Falls back to a
// neutral "Video" so the badge never renders an empty string.
function platformForType(projectType: string): string {
  const map: Record<string, string> = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
  }
  return map[projectType?.toLowerCase()] ?? 'Video'
}

// "just now" / "2h ago" / "3d ago" from an ISO timestamp.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'just now'
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function coerceStatus(status: string): Project['status'] {
  return status === 'archived' || status === 'complete' ? status : 'active'
}

function mapDbProject(db: DbProject): Project {
  const status = coerceStatus(db.status)
  return {
    id: db.id,
    name: db.name,
    status,
    platform: platformForType(db.project_type),
    lastEdited: timeAgo(db.updated_at),
    updatedAt: db.updated_at,
    progress: status === 'complete' ? 100 : 0,
    thumbnail: db.thumbnail,
    gradient: gradientForId(db.id),
    autosave: 'saved',
    projectType: db.project_type ?? 'custom',
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'var(--accent-light)', bg: 'var(--accent-subtle)' },
  complete: { label: 'Complete', color: 'var(--success)', bg: 'var(--success-bg)' },
  archived: { label: 'Archived', color: 'var(--text-muted)', bg: 'var(--bg-panel)' },
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  YouTube: '#FF0000',
  TikTok: '#69C9D0',
  LinkedIn: '#0077B5',
}

// ── Framer variants ───────────────────────────────────────────────────────────

const containerVariants = {
  animate: { transition: { staggerChildren: 0.045 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const } },
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AutosaveDot({ state }: { state: Project['autosave'] }) {
  const colors: Record<Project['autosave'], string> = {
    saved: 'var(--success)',
    saving: 'var(--warning)',
    unsaved: 'var(--text-tertiary)',
  }
  const labels: Record<Project['autosave'], string> = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: colors[state],
          boxShadow: state === 'saved' ? `0 0 6px ${colors[state]}` : 'none',
          animation: state === 'saving' ? 'pulse-glow 1.5s ease infinite' : 'none',
        }}
      />
      <span style={{ fontSize: 10, color: colors[state], fontWeight: 600, letterSpacing: '0.03em' }}>
        {labels[state]}
      </span>
    </div>
  )
}

function ProgressBar({ value, status }: { value: number; status: string }) {
  const color =
    status === 'complete'
      ? 'var(--success)'
      : status === 'archived'
      ? 'var(--text-tertiary)'
      : 'var(--accent)'
  return (
    <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.5s var(--ease-smooth)',
        }}
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.active
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 'var(--r-full)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: meta.bg,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? 'var(--text-muted)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: 'var(--r-full)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {platform}
    </span>
  )
}

function ContextMenu({
  onOpen,
  onDuplicate,
  onArchive,
  onDelete,
  onClose,
}: {
  onOpen: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const menuItems = [
    { label: 'Open', icon: <Play size={12} strokeWidth={2} />, action: onOpen },
    { label: 'Quick Edit', icon: <Pencil size={12} strokeWidth={2} />, action: onOpen },
    { label: 'Duplicate', icon: <Copy size={12} strokeWidth={2} />, action: onDuplicate },
    { label: 'Archive', icon: <Archive size={12} strokeWidth={2} />, action: onArchive },
    { label: 'Delete', icon: <Trash2 size={12} strokeWidth={2} />, action: onDelete, danger: true },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'absolute',
        right: 8,
        top: 'calc(100% + 4px)',
        zIndex: 200,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        minWidth: 160,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, i) => (
        <button
          key={item.label}
          onClick={(e) => {
            e.stopPropagation()
            item.action()
            onClose()
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            borderTop: i > 0 && item.danger ? '1px solid var(--border)' : 'none',
            marginTop: item.danger ? 2 : 0,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: item.danger ? 'var(--error)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.08s ease, color 0.08s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = item.danger ? 'var(--error-bg)' : 'var(--bg-hover)'
            if (!item.danger) e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = item.danger ? 'var(--error)' : 'var(--text-secondary)'
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  )
}

// ── Grid Card ─────────────────────────────────────────────────────────────────

function ProjectGridCard({
  project,
  onOpen,
  onDelete,
  onDuplicate,
  onArchive,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
  onArchive: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <motion.div
      variants={itemVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setMenuOpen(false)
      }}
      whileHover={{ scale: 1.015, y: -2 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 'var(--r-xl)',
        overflow: 'visible',
        cursor: 'pointer',
        boxShadow: hovered ? 'var(--shadow-md)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Thumbnail */}
      <div
        onClick={onOpen}
        style={{
          height: 130,
          background: project.gradient,
          borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Film size={28} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.12)' }} />
        )}

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onOpen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
                  color: '#fff',
                }}
              >
                <Play size={14} fill="white" strokeWidth={0} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen()
                }}
                aria-label="Edit project"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <Pencil size={13} strokeWidth={2} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform badge top-right */}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <PlatformBadge platform={project.platform} />
        </div>

        {/* Autosave dot top-left */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--r-full)',
            padding: '3px 7px',
          }}
        >
          <AutosaveDot state={project.autosave} />
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              onClick={onOpen}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: 4,
                cursor: 'pointer',
              }}
            >
              {project.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusBadge status={project.status} />
            </div>
          </div>

          {/* More menu */}
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              aria-label="Project actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              style={{
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: menuOpen ? 'var(--bg-panel)' : 'transparent',
                border: menuOpen ? '1px solid var(--border-strong)' : '1px solid transparent',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-panel)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              <MoreHorizontal size={14} strokeWidth={2} />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <ContextMenu
                  onOpen={onOpen}
                  onDuplicate={onDuplicate}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <ProgressBar value={project.progress} status={project.status} />
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
            <Clock size={10} strokeWidth={2} />
            <span style={{ fontSize: 11 }}>{project.lastEdited}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
            {project.progress}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── List Row ──────────────────────────────────────────────────────────────────

function ProjectListRow({
  project,
  onOpen,
  onDelete,
  onDuplicate,
  onArchive,
}: {
  project: Project
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
  onArchive: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <motion.div
      variants={itemVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setMenuOpen(false)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        borderRadius: 'var(--r-lg)',
        background: hovered ? 'var(--bg-elevated)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        marginBottom: 4,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        position: 'relative',
      }}
    >
      {/* Thumbnail */}
      <div
        onClick={onOpen}
        style={{
          width: 52,
          height: 40,
          borderRadius: 'var(--r-md)',
          background: project.gradient,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Film size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.2)' }} />
        )}
      </div>

      {/* Name */}
      <div onClick={onOpen} style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 3,
          }}
        >
          {project.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={10} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{project.lastEdited}</span>
        </div>
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={project.status} />
      </div>

      {/* Platform */}
      <div style={{ flexShrink: 0 }}>
        <PlatformBadge platform={project.platform} />
      </div>

      {/* Progress */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} status={project.status} />
      </div>

      {/* Autosave */}
      <div style={{ flexShrink: 0, minWidth: 56 }}>
        <AutosaveDot state={project.autosave} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpen}
              transition={{ duration: 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                color: 'var(--accent-light)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Play size={10} fill="currentColor" strokeWidth={0} />
              Open
            </motion.button>
          )}
        </AnimatePresence>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            aria-label="Project actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: menuOpen ? 'var(--bg-panel)' : 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-panel)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
            onMouseLeave={(e) => {
              if (!menuOpen) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }
            }}
          >
            <MoreHorizontal size={14} strokeWidth={2} />
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <ContextMenu
                onOpen={onOpen}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                onDelete={onDelete}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ search, onCreateAI, onCreateBlank }: { search: string; onCreateAI: () => void; onCreateBlank: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 32px',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--r-2xl)',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        {search ? (
          <Search size={24} strokeWidth={1.5} style={{ color: 'var(--accent-light)' }} />
        ) : (
          <Film size={24} strokeWidth={1.5} style={{ color: 'var(--accent-light)' }} />
        )}
      </div>

      <div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            marginBottom: 6,
          }}
        >
          {search ? `No results for "${search}"` : 'No projects yet'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320 }}>
          {search
            ? 'Try a different search term or clear your filters.'
            : 'Create your first AI video to get started. It only takes a few seconds.'}
        </p>
      </div>

      {!search && (
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            onClick={onCreateAI}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 20px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--r-lg)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Sparkles size={13} strokeWidth={2.5} />
            Create with AI
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
            onClick={onCreateBlank}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 20px',
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-lg)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Start from scratch
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          height: 34,
          paddingLeft: 10,
          paddingRight: 28,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          appearance: 'none',
          WebkitAppearance: 'none',
          transition: 'border-color 0.1s ease',
          outline: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        strokeWidth={2.5}
        style={{
          position: 'absolute',
          right: 8,
          pointerEvents: 'none',
          color: 'var(--text-muted)',
        }}
      />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Section = 'all' | 'drafts' | 'versions' | 'archived' | 'shared'
type StatusFilter = 'all' | 'active' | 'complete' | 'archived'
type SortBy = 'recent' | 'az' | 'oldest'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; countKey?: string }[] = [
  { id: 'all', label: 'All Projects', icon: <FolderOpen size={15} strokeWidth={1.8} /> },
  { id: 'drafts', label: 'Drafts', icon: <AlertCircle size={15} strokeWidth={1.8} /> },
  { id: 'versions', label: 'Versions', icon: <GitBranch size={15} strokeWidth={1.8} /> },
  { id: 'archived', label: 'Archived', icon: <Archive size={15} strokeWidth={1.8} /> },
  { id: 'shared', label: 'Shared with me', icon: <Share2 size={15} strokeWidth={1.8} /> },
]

export default function ProjectsPage() {
  const router = useRouter()
  const toast = useToast()

  const [projects, setProjects] = useState<Project[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [activeSection, setActiveSection] = useState<Section>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch real projects from the API.
  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) {
        setError(
          res.status === 401
            ? 'Please sign in again.'
            : 'We couldn’t load your projects. Please try again.'
        )
        return
      }
      const data = await res.json()
      setProjects((data.projects as DbProject[]).map(mapDbProject))
    } catch {
      setError('We couldn’t load your projects. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Counts for sidebar badges
  const draftsCount = projects.filter((p) => p.status === 'active').length
  const archivedCount = projects.filter((p) => p.status === 'archived').length

  // Filter + sort
  const filtered = projects
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (status !== 'all' && p.status !== status) return false
      if (activeSection === 'drafts' && p.status !== 'active') return false
      if (activeSection === 'archived' && p.status !== 'archived') return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name)
      const at = new Date(a.updatedAt).getTime()
      const bt = new Date(b.updatedAt).getTime()
      if (sortBy === 'oldest') return at - bt
      // 'recent' — newest updated first
      return bt - at
    })

  const handleOpenProject = useCallback(
    (id: string) => {
      router.push(`/editor/${id}`)
    },
    [router]
  )

  // Runs the actual DELETE once confirmed via the ConfirmDialog.
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    const { id, name } = pendingDelete
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setProjects((prev) => prev.filter((p) => p.id !== id))
      toast.success(`“${name}” was deleted.`)
      setPendingDelete(null)
    } catch {
      toast.error('Could not delete the project. Please try again.')
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, toast])

  const handleDuplicate = useCallback(
    async (project: Project) => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${project.name} (copy)`,
            projectType: project.projectType || 'custom',
          }),
        })
        const data = await res.json()
        if (!res.ok || !data?.id) throw new Error('duplicate failed')
        // Build a view-model for the new project without a refetch. created_at /
        // updated_at are "now" since it was just created.
        const now = new Date().toISOString()
        const created = mapDbProject({
          id: data.id,
          user_id: '',
          name: `${project.name} (copy)`,
          thumbnail: null,
          project_type: project.projectType || 'custom',
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        setProjects((prev) => [created, ...prev])
        toast.success(`Duplicated “${project.name}”.`)
      } catch {
        toast.error('Could not duplicate the project. Please try again.')
      }
    },
    [toast]
  )

  const handleArchive = useCallback(
    async (project: Project) => {
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        })
        if (!res.ok) throw new Error('archive failed')
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, status: 'archived' } : p))
        )
        toast.success(`“${project.name}” was archived.`)
      } catch {
        toast.error('Could not archive the project. Please try again.')
      }
    },
    [toast]
  )

  const handleNewProject = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Video', projectType: 'custom' }),
      })
      const data = await res.json()
      router.push(`/editor/${data.id ?? 'new'}`)
    } catch {
      router.push('/workspace')
    }
  }, [router])

  // Folders have no backend yet — give honest feedback instead of a dead button.
  const handleFolderSoon = useCallback(() => {
    toast.info('Folder organization is coming soon.')
  }, [toast])

  const sectionLabel = SECTIONS.find((s) => s.id === activeSection)?.label ?? 'All Projects'

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      style={{
        height: '100%',
        display: 'flex',
        minHeight: 0,
        background: 'var(--bg-base)',
      }}
    >
      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Section nav */}
        <div style={{ padding: '20px 10px 12px', flex: 1, overflowY: 'auto' }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 8px',
              marginBottom: 6,
            }}
          >
            Library
          </p>

          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id
            const count =
              section.id === 'all'
                ? projects.length
                : section.id === 'drafts'
                ? draftsCount
                : section.id === 'archived'
                ? archivedCount
                : null

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 10px',
                  borderRadius: 'var(--r-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.1s ease',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>{section.icon}</span>
                <span style={{ flex: 1 }}>{section.label}</span>
                {count !== null && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 'var(--r-full)',
                      background: isActive ? 'var(--accent-border)' : 'var(--bg-panel)',
                      color: isActive ? 'var(--accent-light)' : 'var(--text-tertiary)',
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 8px' }} />

          {/* Folders */}
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0 8px',
              marginBottom: 6,
            }}
          >
            Folders
          </p>

          {mockFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={handleFolderSoon}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 10px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.1s ease',
                textAlign: 'left',
                marginBottom: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Folder size={14} strokeWidth={1.8} style={{ opacity: 0.6, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {folder.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  padding: '1px 5px',
                  borderRadius: 'var(--r-full)',
                  background: 'var(--bg-panel)',
                  flexShrink: 0,
                }}
              >
                {folder.count}
              </span>
            </button>
          ))}
        </div>

        {/* New Folder button */}
        <div style={{ padding: '10px 10px 16px', flexShrink: 0 }}>
          <button
            onClick={handleFolderSoon}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 'var(--r-md)',
              border: '1px dashed var(--border-strong)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-muted)',
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--border-focus)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
          >
            <FolderPlus size={13} strokeWidth={2} />
            New Folder
          </button>
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header row */}
        <div
          style={{
            padding: '20px 28px 0',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 14,
            }}
          >
            {/* Title */}
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.018em',
                  marginBottom: 2,
                }}
              >
                {sectionLabel}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {filtered.length} project{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={13}
                  strokeWidth={2}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  style={{
                    width: 240,
                    height: 34,
                    paddingLeft: 32,
                    paddingRight: 12,
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--r-md)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-focus)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-subtle)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Status filter */}
              <Select
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'complete', label: 'Complete' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />

              {/* Sort */}
              <Select
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'recent', label: 'Recent' },
                  { value: 'az', label: 'A-Z' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
              />

              {/* View toggle */}
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: 3,
                }}
              >
                {(['grid', 'list'] as const).map((v) => (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setView(v)}
                    title={v === 'grid' ? 'Grid view' : 'List view'}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--r-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      background: view === v ? 'var(--bg-panel)' : 'transparent',
                      color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    {v === 'grid' ? (
                      <LayoutGrid size={13} strokeWidth={2} />
                    ) : (
                      <List size={13} strokeWidth={2} />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* New Project */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.1 }}
                onClick={handleNewProject}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '0 16px',
                  height: 34,
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 6px rgba(99,102,241,0.3)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.12s ease, box-shadow 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-hover)'
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 1px 6px rgba(99,102,241,0.3)'
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                New Project
              </motion.button>
            </div>
          </div>

          {/* Folder chips row */}
          <div style={{ display: 'flex', gap: 6, paddingBottom: 14, overflowX: 'auto' }}>
            {mockFolders.map((folder) => (
              <motion.button
                key={folder.id}
                whileTap={{ scale: 0.96 }}
                onClick={handleFolderSoon}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-full)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-panel)'
                  e.currentTarget.style.borderColor = 'var(--border-strong)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                <Folder size={11} strokeWidth={2} style={{ opacity: 0.6 }} />
                {folder.name}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-base)',
                    padding: '1px 5px',
                    borderRadius: 'var(--r-full)',
                  }}
                >
                  {folder.count}
                </span>
              </motion.button>
            ))}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleFolderSoon}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: 'transparent',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--r-full)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-focus)'
                e.currentTarget.style.color = 'var(--accent-light)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <Plus size={11} strokeWidth={2.5} />
              New folder
            </motion.button>
          </div>
        </div>

        {/* Project grid / list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--r-xl)' }} />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Couldn’t load projects"
              description={error}
              onRetry={fetchProjects}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              search={search}
              onCreateAI={() => router.push('/workspace')}
              onCreateBlank={handleNewProject}
            />
          ) : view === 'grid' ? (
            <motion.div
              key="grid"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <AnimatePresence>
                {filtered.map((project) => (
                  <ProjectGridCard
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpenProject(project.id)}
                    onDelete={() => setPendingDelete(project)}
                    onDuplicate={() => handleDuplicate(project)}
                    onArchive={() => handleArchive(project)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence>
                {filtered.map((project) => (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    onOpen={() => handleOpenProject(project.id)}
                    onDelete={() => setPendingDelete(project)}
                    onDuplicate={() => handleDuplicate(project)}
                    onArchive={() => handleArchive(project)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete project?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be permanently deleted. This can’t be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        isConfirming={deleting}
      />
    </motion.div>
  )
}
