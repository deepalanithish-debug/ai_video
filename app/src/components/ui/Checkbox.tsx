import React from 'react'
import { Icons } from './icons'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: React.ReactNode
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, disabled, ...props },
  ref
) {
  return (
    <label className={['checkbox', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ')}>
      <input type="checkbox" ref={ref} disabled={disabled} {...props} />
      <span className="checkbox-box" aria-hidden="true">
        <Icons.Check size={12} />
      </span>
      {label != null && <span className="checkbox-label">{label}</span>}
    </label>
  )
})

export default Checkbox
