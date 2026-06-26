import React from 'react'

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: React.ReactNode
  size?: 'sm' | 'md'
}

/** Accessible on/off switch. Wraps a native checkbox (role="switch") in a label. */
const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, size = 'md', className, disabled, ...props },
  ref
) {
  const cls = ['switch', size === 'sm' ? 'switch-sm' : '', disabled ? 'is-disabled' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <label className={cls}>
      <input type="checkbox" role="switch" ref={ref} disabled={disabled} {...props} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      {label != null && <span className="switch-label">{label}</span>}
    </label>
  )
})

export default Toggle
