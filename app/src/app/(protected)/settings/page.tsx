'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, Palette, Download, Keyboard, LogOut } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/Page'
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Select,
  Toggle,
  Skeleton,
  ErrorState,
} from '@/components/ui'

// ── Default-export preferences (persisted to localStorage) ──────────────────────

const EXPORT_PREFS_KEY = 'vydeo_export_prefs'

interface ExportPrefs {
  resolution: string
  fps: string
  format: string
}

const DEFAULT_EXPORT_PREFS: ExportPrefs = { resolution: '1080p', fps: '30', format: 'mp4' }

const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '2160p', label: '2160p (4K)' },
]

const FPS_OPTIONS = [
  { value: '24', label: '24 fps (Cinematic)' },
  { value: '30', label: '30 fps (Standard)' },
  { value: '60', label: '60 fps (Smooth)' },
]

const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4 (H.264)' },
  { value: 'mov', label: 'MOV (QuickTime)' },
  { value: 'webm', label: 'WebM (VP9)' },
]

// ── Keyboard shortcuts reference ────────────────────────────────────────────────

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['Space'], action: 'Play / Pause' },
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
  { keys: ['Ctrl', 'S'], action: 'Save' },
  { keys: ['Ctrl', 'C'], action: 'Copy clip' },
  { keys: ['Ctrl', 'V'], action: 'Paste clip' },
  { keys: ['Delete'], action: 'Delete selected clip' },
  { keys: ['S'], action: 'Split clip at playhead' },
  { keys: ['←', '→'], action: 'Step one frame' },
  { keys: ['Esc'], action: 'Deselect / close panel' },
]

// ── Account fetch state ─────────────────────────────────────────────────────────

interface MeUser {
  firstName: string
  lastName: string
  email: string
  plan: string
}

type AccountState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; user: MeUser }

// ── Shared layout helpers ───────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card variant="surface">
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 'var(--r-md)',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-light)',
            }}
          >
            {icon}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {title}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <div style={{ minWidth: 200 }}>{children}</div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [account, setAccount] = useState<AccountState>({ status: 'loading' })
  const [prefs, setPrefs] = useState<ExportPrefs>(DEFAULT_EXPORT_PREFS)
  const [signingOut, setSigningOut] = useState(false)

  const loadAccount = useCallback(async () => {
    setAccount({ status: 'loading' })
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        setAccount({ status: 'error' })
        return
      }
      const data = await res.json()
      if (!data?.user) {
        setAccount({ status: 'error' })
        return
      }
      setAccount({ status: 'ready', user: data.user as MeUser })
    } catch {
      setAccount({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  // Hydrate export preferences from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPORT_PREFS_KEY)
      if (raw) setPrefs({ ...DEFAULT_EXPORT_PREFS, ...JSON.parse(raw) })
    } catch {
      // ignore malformed storage
    }
  }, [])

  const updatePref = useCallback((patch: Partial<ExportPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(EXPORT_PREFS_KEY, JSON.stringify(next))
      } catch {
        // ignore storage write failure
      }
      return next
    })
  }, [])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed to login regardless
    }
    router.push('/login')
  }, [router])

  return (
    <PageContainer>
      <PageHeader title="Settings" subtitle="Manage your account, defaults, and editor preferences." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
        {/* ── Profile ──────────────────────────────────────────────────────── */}
        <SectionCard
          icon={<User size={18} strokeWidth={1.8} />}
          title="Profile"
          description="Your account details."
        >
          {account.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={16} width="40%" />
              <Skeleton height={16} width="60%" />
            </div>
          )}

          {account.status === 'error' && (
            <ErrorState
              title="Couldn't load your profile"
              description="There was a problem fetching your account details."
              onRetry={loadAccount}
            />
          )}

          {account.status === 'ready' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FieldRow label="Name">
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {[account.user.firstName, account.user.lastName].filter(Boolean).join(' ') || '—'}
                </span>
              </FieldRow>
              <div className="divider" />
              <FieldRow label="Email">
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  {account.user.email}
                </span>
              </FieldRow>
              <div className="divider" />
              <FieldRow label="Plan">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'capitalize',
                    color: account.user.plan !== 'free' ? 'var(--accent-light)' : 'var(--text-secondary)',
                  }}
                >
                  {account.user.plan === 'free' ? 'Free plan' : `${account.user.plan} plan`}
                </span>
              </FieldRow>
            </div>
          )}
        </SectionCard>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <SectionCard
          icon={<Palette size={18} strokeWidth={1.8} />}
          title="Appearance"
          description="VydeoAI is crafted for a dark, focused editing environment."
        >
          <FieldRow label="Dark theme">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Toggle checked disabled aria-label="Dark theme (only theme available)" />
            </div>
          </FieldRow>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Light mode isn&apos;t available yet — dark is the only theme.
          </p>
        </SectionCard>

        {/* ── Default Export ───────────────────────────────────────────────── */}
        <SectionCard
          icon={<Download size={18} strokeWidth={1.8} />}
          title="Default Export"
          description="Used as the starting point when you export a new video."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldRow label="Resolution">
              <Select
                aria-label="Default resolution"
                options={RESOLUTION_OPTIONS}
                value={prefs.resolution}
                onChange={(v) => updatePref({ resolution: v })}
              />
            </FieldRow>
            <FieldRow label="Frame rate">
              <Select
                aria-label="Default frame rate"
                options={FPS_OPTIONS}
                value={prefs.fps}
                onChange={(v) => updatePref({ fps: v })}
              />
            </FieldRow>
            <FieldRow label="Format">
              <Select
                aria-label="Default format"
                options={FORMAT_OPTIONS}
                value={prefs.format}
                onChange={(v) => updatePref({ format: v })}
              />
            </FieldRow>
          </div>
        </SectionCard>

        {/* ── Keyboard Shortcuts ───────────────────────────────────────────── */}
        <SectionCard
          icon={<Keyboard size={18} strokeWidth={1.8} />}
          title="Keyboard Shortcuts"
          description="Speed up editing in the timeline."
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {SHORTCUTS.map((s, i) => (
              <div
                key={s.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '9px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.action}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {s.keys.map((k, ki) => (
                    <span key={ki} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {ki > 0 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+</span>}
                      <kbd className="kbd">{k}</kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        <Card variant="surface">
          <CardContent>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Sign out</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  End your session on this device.
                </p>
              </div>
              <Button
                variant="danger"
                leftIcon={<LogOut size={15} />}
                onClick={handleSignOut}
                isLoading={signingOut}
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
