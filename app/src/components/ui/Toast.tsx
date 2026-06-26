'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Icons } from './icons'
import Spinner from './Spinner'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastOptions {
  title?: string
  message?: string
  variant?: ToastVariant
  /** ms before auto-dismiss; 0 or 'loading' variant disables it. */
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
  leaving?: boolean
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)
  const idRef = React.useRef(0)
  const timers = React.useRef<Record<string, number>>({})

  React.useEffect(() => {
    setMounted(true)
    const t = timers.current
    return () => {
      Object.values(t).forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 200)
  }, [])

  const push = React.useCallback(
    (opts: ToastOptions) => {
      const id = String(++idRef.current)
      const item: ToastItem = { id, variant: 'info', duration: 4000, ...opts }
      setToasts((ts) => [...ts, item])
      if (item.variant !== 'loading' && (item.duration ?? 0) > 0) {
        timers.current[id] = window.setTimeout(() => dismiss(id), item.duration)
      }
      return id
    },
    [dismiss]
  )

  const api = React.useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (message, title) => push({ message, title, variant: 'success' }),
      error: (message, title) => push({ message, title, variant: 'error' }),
      warning: (message, title) => push({ message, title, variant: 'warning' }),
      info: (message, title) => push({ message, title, variant: 'info' }),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div className="toast-viewport" role="region" aria-label="Notifications">
            {toasts.map((t) => (
              <ToastCard key={t.id} item={t} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const icon =
    item.variant === 'success' ? <Icons.CheckCircle size={18} />
    : item.variant === 'error' ? <Icons.Error size={18} />
    : item.variant === 'warning' ? <Icons.Warning size={18} />
    : item.variant === 'loading' ? <Spinner size="sm" />
    : <Icons.Info size={18} />

  return (
    <div
      className={['toast', `toast-${item.variant}`, item.leaving ? 'is-leaving' : ''].filter(Boolean).join(' ')}
      role={item.variant === 'error' ? 'alert' : 'status'}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="toast-body">
        {item.title && <div className="toast-title">{item.title}</div>}
        {item.message && <div className="toast-msg">{item.message}</div>}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={onClose}>
        <Icons.Close size={14} />
      </button>
    </div>
  )
}
