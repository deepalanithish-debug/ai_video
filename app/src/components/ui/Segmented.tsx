import React from 'react'

export interface SegmentedOption<T extends string = string> {
  label: React.ReactNode
  value: T
  icon?: React.ReactNode
}

export interface SegmentedProps<T extends string = string> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Segmented control — a row of mutually-exclusive toggle buttons (mode switch). */
export default function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div role="group" className={['segmented', className].filter(Boolean).join(' ')} {...rest}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            className={['segmented-item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
