'use client'

import React from 'react'

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-panel) 50%, var(--bg-elevated) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease infinite',
}

/* ── Base Skeleton ───────────────────────────────────────────────────────────── */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({ width, height = 16, borderRadius = 'var(--r-sm)', className, style, ...props }: SkeletonProps) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        flexShrink: 0,
        ...style,
      }}
      className={className}
      {...props}
    />
  )
}

/* ── Skeleton Text ───────────────────────────────────────────────────────────── */
export interface SkeletonTextProps {
  lines?: number
  className?: string
  style?: React.CSSProperties
}

export function SkeletonText({ lines = 3, className, style }: SkeletonTextProps) {
  const widths = ['100%', '85%', '70%', '90%', '60%', '80%', '75%']

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        ...style,
      }}
      className={className}
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={widths[i % widths.length]}
          borderRadius="var(--r-xs)"
        />
      ))}
    </div>
  )
}

/* ── Skeleton Card ───────────────────────────────────────────────────────────── */
export interface SkeletonCardProps {
  className?: string
  style?: React.CSSProperties
}

export function SkeletonCard({ className, style }: SkeletonCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      {/* Thumbnail */}
      <Skeleton height={160} borderRadius={0} />
      {/* Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Title */}
        <Skeleton height={16} width="75%" borderRadius="var(--r-xs)" />
        {/* Subtitle lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton height={12} width="90%" borderRadius="var(--r-xs)" />
          <Skeleton height={12} width="60%" borderRadius="var(--r-xs)" />
        </div>
        {/* Footer row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
          <Skeleton height={20} width={20} borderRadius="50%" />
          <Skeleton height={10} width="40%" borderRadius="var(--r-xs)" />
        </div>
      </div>
    </div>
  )
}

/* ── Skeleton Avatar ─────────────────────────────────────────────────────────── */
export interface SkeletonAvatarProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function SkeletonAvatar({ size = 36, className, style }: SkeletonAvatarProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      style={{ flexShrink: 0, ...style }}
      className={className}
    />
  )
}
