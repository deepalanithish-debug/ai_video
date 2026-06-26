'use client'

import React from 'react'
import { Icons } from './icons'

export interface SelectOption {
  label: string
  value: string
  icon?: React.ReactNode
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

/** Accessible custom select (ARIA listbox pattern, full keyboard nav, click-outside). */
export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className,
  id,
  ...rest
}: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()
  const selected = options.find((o) => o.value === value)

  React.useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  React.useEffect(() => {
    if (open) setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(idx: number) {
    const opt = options[idx]
    if (!opt) return
    onChange?.(opt.value)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'Escape': e.preventDefault(); setOpen(false); break
      case 'ArrowDown': e.preventDefault(); setActiveIdx((i) => Math.min(options.length - 1, i + 1)); break
      case 'ArrowUp': e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); break
      case 'Home': e.preventDefault(); setActiveIdx(0); break
      case 'End': e.preventDefault(); setActiveIdx(options.length - 1); break
      case 'Enter': case ' ': e.preventDefault(); commit(activeIdx); break
    }
  }

  return (
    <div ref={rootRef} className={['select', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        id={id}
        className={['select-trigger', !selected ? 'is-placeholder' : ''].filter(Boolean).join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        {...rest}
      >
        <span className="select-value">
          {selected ? (
            <>
              {selected.icon}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <Icons.ChevronDown size={16} className="chev" />
      </button>
      {open && (
        <ul className="select-menu" role="listbox" id={listId}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={[
                'select-option',
                i === activeIdx ? 'is-active' : '',
                opt.value === value ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => commit(i)}
            >
              <span className="select-option-label">
                {opt.icon}
                {opt.label}
              </span>
              <Icons.Check size={14} className="opt-check" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
