import { Minus, Plus } from 'lucide-react'

export default function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  large = false,
  disabled = false,
  variant = 'default',
}) {
  if (variant === 'subtle') {
    return (
      <div className="inline-flex items-center gap-1.5" role="group" aria-label="Quantity">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          aria-label="Decrease quantity"
          className="grid h-7 w-7 place-items-center rounded-lg bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] hover:bg-[#38233b] active:scale-95 transition disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-5 text-center text-xs font-bold text-white tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label="Increase quantity"
          className="grid h-7 w-7 place-items-center rounded-lg bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] hover:bg-[#38233b] active:scale-95 transition disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const h = large ? 'h-12' : 'h-10'
  const w = large ? 'w-10' : 'w-9'
  return (
    <div className={`inline-flex ${h} items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/20`} role="group" aria-label="Quantity">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className={`grid ${h} ${w} place-items-center rounded-full active:opacity-75 disabled:opacity-40 transition`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`min-w-6 text-center font-black tabular-nums ${large ? 'text-lg' : 'text-sm'}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className={`grid ${h} ${w} place-items-center rounded-full active:opacity-75 disabled:opacity-40 transition`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
