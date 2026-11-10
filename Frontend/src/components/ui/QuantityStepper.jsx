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
          className="grid h-7 w-7 place-items-center rounded-lg bg-pink-50 text-accent-600 border border-pink-200 hover:bg-pink-100 active:scale-95 transition disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-5 text-center text-xs font-bold text-ink tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label="Increase quantity"
          className="grid h-7 w-7 place-items-center rounded-lg bg-pink-50 text-accent-600 border border-pink-200 hover:bg-pink-100 active:scale-95 transition disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const h = large ? 'h-12' : 'h-11'
  const w = large ? 'w-12' : 'w-11'
  return (
    <div className={`inline-flex ${h} items-center rounded-full bg-accent-500 text-white`} role="group" aria-label="Quantity">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className={`grid ${h} ${w} place-items-center rounded-full active:bg-accent-600 disabled:opacity-60`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={`min-w-6 text-center font-bold tabular-nums ${large ? 'text-lg' : 'text-sm'}`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className={`grid ${h} ${w} place-items-center rounded-full active:bg-accent-600 disabled:opacity-60`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

