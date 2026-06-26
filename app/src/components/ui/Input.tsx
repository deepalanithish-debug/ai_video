'use client'

import React from 'react'
import { Icons } from './icons'

export type InputSize = 'sm' | 'md' | 'lg'

const affixSizeClass: Record<InputSize, string> = { sm: 'input-affix-sm', md: '', lg: 'input-affix-lg' }

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

/* ── Input ──────────────────────────────────────────────────────────────── */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  label?: string
  hint?: string
  wrapClassName?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', leftIcon, rightIcon, error, label, hint, wrapClassName, className, id, disabled, ...props },
  ref
) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const msgId = `${inputId}-msg`
  const affixCls = ['input-affix', affixSizeClass[size], error ? 'is-error' : '', disabled ? 'is-disabled' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={['field', wrapClassName].filter(Boolean).join(' ')}>
      {label && <label htmlFor={inputId} className="field-label">{label}</label>}
      <div className={affixCls}>
        {leftIcon && <span className="affix affix-lead" aria-hidden="true">{leftIcon}</span>}
        <input
          id={inputId}
          ref={ref}
          className={className}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          {...props}
        />
        {rightIcon && <span className="affix" aria-hidden="true">{rightIcon}</span>}
      </div>
      {(error || hint) && (
        <span id={msgId} className={['field-msg', error ? 'is-error' : ''].filter(Boolean).join(' ')}>
          {error || hint}
        </span>
      )}
    </div>
  )
})

/* ── Textarea ───────────────────────────────────────────────────────────── */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
  hint?: string
  autoResize?: boolean
  wrapClassName?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, label, hint, autoResize = false, wrapClassName, className, id, onChange, ...props },
  ref
) {
  const autoId = React.useId()
  const taId = id ?? autoId
  const msgId = `${taId}-msg`
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const resize = React.useCallback(() => {
    const el = innerRef.current
    if (!el || !autoResize) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [autoResize])

  React.useEffect(() => {
    resize()
  }, [resize, props.value, props.defaultValue])

  const taCls = ['textarea-base', error ? 'is-error' : '', className].filter(Boolean).join(' ')

  return (
    <div className={['field', wrapClassName].filter(Boolean).join(' ')}>
      {label && <label htmlFor={taId} className="field-label">{label}</label>}
      <textarea
        id={taId}
        ref={mergeRefs(innerRef, ref)}
        className={taCls}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        onChange={(e) => {
          resize()
          onChange?.(e)
        }}
        {...props}
      />
      {(error || hint) && (
        <span id={msgId} className={['field-msg', error ? 'is-error' : ''].filter(Boolean).join(' ')}>
          {error || hint}
        </span>
      )}
    </div>
  )
})

/* ── SearchInput ────────────────────────────────────────────────────────── */
export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: InputSize
  onClear?: () => void
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { size = 'md', value, onClear, className, placeholder = 'Search…', ...props },
  ref
) {
  const hasValue = value != null && String(value).length > 0
  const affixCls = ['input-affix', affixSizeClass[size]].filter(Boolean).join(' ')
  return (
    <div className={affixCls}>
      <span className="affix affix-lead" aria-hidden="true">
        <Icons.Search size={16} />
      </span>
      <input ref={ref} type="search" value={value} placeholder={placeholder} className={className} aria-label={props['aria-label'] ?? 'Search'} {...props} />
      {hasValue && onClear && (
        <button type="button" className="affix-clear" aria-label="Clear search" onClick={onClear}>
          <Icons.Close size={14} />
        </button>
      )}
    </div>
  )
})

/* ── PromptInput (large auto-expanding textarea) ────────────────────────── */
export interface PromptInputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  /** Fires on Cmd/Ctrl+Enter (always) or plain Enter when submitOnEnter is set. */
  onSubmit?: () => void
  submitOnEnter?: boolean
  minRows?: number
  maxRows?: number
}

export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(function PromptInput(
  { onSubmit, submitOnEnter = false, minRows = 2, maxRows = 12, className, onKeyDown, onChange, ...props },
  ref
) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const resize = React.useCallback(() => {
    const el = innerRef.current
    if (!el) return
    const styles = window.getComputedStyle(el)
    const lineHeight = parseFloat(styles.lineHeight) || 24
    const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
    el.style.height = 'auto'
    const maxH = lineHeight * maxRows + padding
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [maxRows])

  React.useEffect(() => {
    resize()
  }, [resize, props.value])

  return (
    <textarea
      ref={mergeRefs(innerRef, ref)}
      className={['prompt-input', className].filter(Boolean).join(' ')}
      rows={minRows}
      onChange={(e) => {
        resize()
        onChange?.(e)
      }}
      onKeyDown={(e) => {
        const enter = e.key === 'Enter'
        if (enter && (e.metaKey || e.ctrlKey || (submitOnEnter && !e.shiftKey))) {
          e.preventDefault()
          onSubmit?.()
        }
        onKeyDown?.(e)
      }}
      {...props}
    />
  )
})
