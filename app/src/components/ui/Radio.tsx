import React from 'react'

export interface RadioOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

export interface RadioGroupProps {
  name: string
  value?: string
  onChange?: (value: string) => void
  options: RadioOption[]
  horizontal?: boolean
  className?: string
  'aria-label'?: string
}

/** Radio group. Native radio inputs provide arrow-key navigation within the group. */
export function RadioGroup({ name, value, onChange, options, horizontal = false, className, ...rest }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={['radio-group', horizontal ? 'is-horizontal' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {options.map((opt) => (
        <label key={opt.value} className={['radio', opt.disabled ? 'is-disabled' : ''].filter(Boolean).join(' ')}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={opt.disabled}
            onChange={() => onChange?.(opt.value)}
          />
          <span className="radio-dot" aria-hidden="true" />
          <span className="radio-label">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}
