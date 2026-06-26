'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Sparkles, FolderOpen, Layout, Image as ImageIcon, Music, Palette,
  Settings, ChevronLeft, ChevronRight, Search, Zap, LogOut, User, CreditCard, Scissors, Menu,
} from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

interface NavItemDef {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
  exact?: boolean
}

interface AppShellProps {
  children: React.ReactNode
  user?: { firstName: string; email: string; plan: string } | null
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}
function getAvatarHue(name: string) {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
}

/** SSR-safe media query hook. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setMatches(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])
  return matches
}

function UserAvatar({ name, size = 28 }: { name: string; size?: number }) {
  // hue is derived per-user → dynamic value, not a theme token
  return (
    <div className="app-avatar" style={{ width: size, height: size, fontSize: size * 0.37, background: `hsl(${getAvatarHue(name)}, 35%, 32%)` }}>
      {getInitials(name)}
    </div>
  )
}

function NavItem({ href, label, icon, badge, exact = false, rail }: NavItemDef & { rail: boolean }) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      title={rail ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={['nav-item', isActive ? 'active' : '', rail ? 'is-rail' : ''].filter(Boolean).join(' ')}
    >
      <span className="nav-item-icon">{icon}</span>
      {!rail && <span className="nav-item-label">{label}</span>}
      {!rail && badge && <span className="nav-badge">{badge}</span>}
    </Link>
  )
}

const NAV_ITEMS: NavItemDef[] = [
  { href: '/', label: 'Home', icon: <Home size={18} strokeWidth={1.5} />, exact: true },
  { href: '/workspace', label: 'AI Workspace', icon: <Sparkles size={18} strokeWidth={1.5} />, badge: 'New' },
  { href: '/footage', label: 'Footage Editor', icon: <Scissors size={18} strokeWidth={1.5} /> },
  { href: '/projects', label: 'Projects', icon: <FolderOpen size={18} strokeWidth={1.5} /> },
  { href: '/templates', label: 'Templates', icon: <Layout size={18} strokeWidth={1.5} /> },
  { href: '/assets', label: 'Assets', icon: <ImageIcon size={18} strokeWidth={1.5} /> },
  { href: '/music', label: 'Music', icon: <Music size={18} strokeWidth={1.5} /> },
  { href: '/brand-kit', label: 'Brand Kit', icon: <Palette size={18} strokeWidth={1.5} /> },
]

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Home', '/workspace': 'AI Workspace', '/projects': 'Projects', '/templates': 'Templates',
  '/footage': 'Footage Editor', '/assets': 'Assets', '/music': 'Music', '/brand-kit': 'Brand Kit', '/settings': 'Settings',
}

function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const parts = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/')
    return { label: ROUTE_LABELS[path] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), path }
  })
  const crumbs = parts.length ? parts : [{ label: 'Home', path: '/' }]
  return (
    <nav className="text-body" aria-label="Breadcrumb" style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13 }}>
      {crumbs.map((part, i) => (
        <span key={part.path}>
          {i > 0 && <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>/</span>}
          <span style={{ color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{part.label}</span>
        </span>
      ))}
    </nav>
  )
}

export default function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isCompact = useMediaQuery('(max-width: 1024px)')
  const menuRef = useRef<HTMLDivElement>(null)

  // Auto-collapse to an icon rail on laptop/tablet widths.
  useEffect(() => {
    if (isCompact && !isMobile) setCollapsed(true)
  }, [isCompact, isMobile])

  // Close the drawer + account menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [pathname])

  // Dismiss the account menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const displayName = user?.firstName ?? 'User'
  const isPro = !!user?.plan && user.plan !== 'free'
  const rail = !isMobile && collapsed

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const sidebarClass = isMobile
    ? `sidebar sidebar-overlay${mobileOpen ? ' is-open' : ''}`
    : `sidebar ${rail ? 'sidebar-collapsed' : 'sidebar-expanded'}`

  return (
    <div className="app-shell">
      {isMobile && mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      <aside className={sidebarClass} aria-label="Primary navigation">
        <div className={`sidebar-head${rail ? ' is-rail' : ''}`}>
          <Link href="/" className="sidebar-brand" aria-label="VydeoAI home">
            <span className="sidebar-logo">
              <Zap size={16} fill="currentColor" />
            </span>
            {!rail && <span className="sidebar-brand-name">VydeoAI</span>}
          </Link>
          {!isMobile && !rail && (
            <IconButton label="Collapse sidebar" variant="ghost" size="sm" onClick={() => setCollapsed(true)}>
              <ChevronLeft size={16} />
            </IconButton>
          )}
          {isMobile && (
            <IconButton label="Close menu" variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
              <ChevronLeft size={16} />
            </IconButton>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          <Link href="/workspace" className={`nav-cta${rail ? ' is-rail' : ''}`} title={rail ? 'New Video' : undefined}>
            <Sparkles size={15} />
            {!rail && <span>New Video</span>}
          </Link>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} rail={rail} />
          ))}
          {rail && (
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <IconButton label="Expand sidebar" variant="ghost" size="md" onClick={() => setCollapsed(false)}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
          )}
        </nav>

        <div className="sidebar-foot">
          {!isPro && !rail && (
            <button className="upgrade-btn" onClick={() => router.push('/settings')}>
              <Zap size={13} />
              Upgrade to Pro
            </button>
          )}
          <NavItem href="/settings" label="Settings" icon={<Settings size={18} strokeWidth={1.5} />} rail={rail} />
          <div className={`app-user-row${rail ? ' is-rail' : ''}`}>
            <UserAvatar name={displayName} size={28} />
            {!rail && (
              <div className="grow-min">
                <div className="app-user-name">{displayName}</div>
                <div className="app-user-plan">{isPro ? 'Pro' : 'Free plan'}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="app-topbar">
          {isMobile && (
            <IconButton label="Open menu" variant="ghost" size="sm" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </IconButton>
          )}
          <div className="grow-min">
            <Breadcrumb />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => router.push('/workspace')}
            aria-label="Create with AI"
          >
            <Sparkles size={13} />
            {!isMobile && 'Create with AI'}
          </button>

          <IconButton label="Search projects" variant="ghost" size="sm" onClick={() => router.push('/projects')}>
            <Search size={16} />
          </IconButton>

          <div ref={menuRef} className="topbar-menu-anchor">
            <button
              type="button"
              className="app-avatar-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <UserAvatar name={displayName} size={30} />
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-head">
                  <div className="app-user-name">{displayName}</div>
                  <div className="app-user-plan">{user?.email ?? ''}</div>
                </div>
                <Link href="/settings" role="menuitem" className="menu-item">
                  <User size={14} /> Profile
                </Link>
                <Link href="/settings" role="menuitem" className="menu-item">
                  <CreditCard size={14} /> {isPro ? 'Manage plan' : 'Upgrade to Pro'}
                </Link>
                <Link href="/settings" role="menuitem" className="menu-item">
                  <Settings size={14} /> Settings
                </Link>
                <div className="menu-sep">
                  <button type="button" className="menu-item is-danger" role="menuitem" onClick={handleLogout}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="app-page">
          <div key={pathname} className="animate-fade-in" style={{ minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
