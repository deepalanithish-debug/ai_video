'use client'

import React from 'react'
import { Icons } from './icons'
import IconButton from './IconButton'

export interface DropzoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  title?: string
  hint?: string
  disabled?: boolean
  className?: string
}

/** Drag-and-drop file input. Click or keyboard (Enter/Space) opens the picker. */
export function Dropzone({
  onFiles,
  accept,
  multiple = true,
  title = 'Drop files here or click to upload',
  hint,
  disabled = false,
  className,
}: DropzoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    onFiles(Array.from(list))
  }

  return (
    <div
      className={['dropzone', dragging ? 'is-dragging' : '', className].filter(Boolean).join(' ')}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={title}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
    >
      <span className="dropzone-icon" aria-hidden="true">
        <Icons.Upload size={24} />
      </span>
      <span className="dropzone-title">{title}</span>
      {hint && <span className="dropzone-hint">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export interface UploadCardProps {
  name: string
  sub?: string
  thumbnail?: string
  icon?: React.ReactNode
  onRemove?: () => void
  className?: string
}

export function UploadCard({ name, sub, thumbnail, icon, onRemove, className }: UploadCardProps) {
  return (
    <div className={['upload-card', className].filter(Boolean).join(' ')}>
      <div className="upload-thumb">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" />
        ) : (
          icon ?? <Icons.File size={16} />
        )}
      </div>
      <div className="upload-meta">
        <div className="upload-name truncate">{name}</div>
        {sub && <div className="upload-sub">{sub}</div>}
      </div>
      {onRemove && (
        <IconButton label={`Remove ${name}`} variant="ghost" size="sm" onClick={onRemove}>
          <Icons.Close size={14} />
        </IconButton>
      )}
    </div>
  )
}
