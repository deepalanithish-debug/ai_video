import React from 'react'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showValue?: boolean
  formatValue?: (v: number) => string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { showValue = false, formatValue, value, className, ...props },
  ref
) {
  const display = formatValue ? formatValue(Number(value)) : String(value ?? '')
  return (
    <div className={['slider', className].filter(Boolean).join(' ')}>
      <input type="range" ref={ref} value={value} {...props} />
      {showValue && <span className="slider-value">{display}</span>}
    </div>
  )
})

export default Slider
