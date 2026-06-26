'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AsyncResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/** Map an HTTP status to user-facing copy (the raw status is shown via ErrorState only for unmapped codes). */
function friendlyError(status: number): string {
  if (status === 401) return 'Please sign in again to see this.'
  if (status >= 500) return 'Something went wrong on our end — please try again.'
  return `Couldn't load — please try again. (${status})`
}

/** Minimal data-fetching hook with loading / error / reload, used for dashboard sections. */
export function useFetch<T>(url: string, select: (json: unknown) => T): AsyncResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(friendlyError(res.status))
      const json = await res.json()
      setData(select(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
    // `select` is intentionally excluded — callers pass an inline fn; url is the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}

export interface DashProject {
  id: string
  name: string
  thumbnail?: string | null
  status?: string
  updated_at?: string | number
  created_at?: string | number
}

export interface DashGeneration {
  id: string
  promptPreview: string
  cluster?: string
  durationSec?: number
  aspectRatio?: string
  createdAt?: string | number
}

export function useProjects() {
  return useFetch<DashProject[]>('/api/projects', (j) => ((j as { projects?: DashProject[] })?.projects ?? []))
}

export function useGenerations(limit = 8) {
  return useFetch<DashGeneration[]>(
    `/api/generations?limit=${limit}`,
    (j) => ((j as { generations?: DashGeneration[] })?.generations ?? [])
  )
}
