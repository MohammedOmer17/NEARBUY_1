import { ShoppingCart, ChevronRight, ChevronUp } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { formatCurrency } from '../../utils/format'

export default function CartBar({ bottom }) {
  const { itemCount, estimatedTotal, openCart } = useCart()

  if (!itemCount) return null

  const offset =
    bottom === 0
      ? 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'
      : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]'

  return (
    <div className={`pointer-events-none fixed inset-x-0 ${offset} z-30 mx-auto w-full max-w-md px-3`}>
      <div className="relative pointer-events-auto">
        {/* Curved top notch with chevron up */}
        <button
          type="button"
          onClick={openCart}
          aria-label="Expand cart panel"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex h-4 w-12 items-center justify-center rounded-t-xl bg-[#EC55C8] text-white shadow-sm transition hover:bg-[#F58AD8] active:scale-95"
        >
          <ChevronUp className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>

        {/* Main sticky cart bar */}
        <button
          type="button"
          onClick={openCart}
          aria-label={`View cart with ${itemCount} items, total ${formatCurrency(estimatedTotal)}`}
          className="flex h-14 w-full items-center justify-between rounded-3xl bg-gradient-to-r from-[#EC55C8] via-[#cf40b3] to-[#B65DDA] px-4 text-white shadow-xl shadow-pink-500/30 transition active:scale-[0.99] hover:brightness-105"
        >
          {/* Left item count & estimated total */}
          <span className="flex min-w-0 items-center gap-2.5 font-bold">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            <span className="shrink-0 text-sm">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-white/60 font-normal">|</span>
            <span className="truncate text-sm font-extrabold tracking-tight">
              {formatCurrency(estimatedTotal)}
            </span>
          </span>

          {/* Right "View Cart >" pill */}
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/30">
            <span>View Cart</span>
            <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </span>
        </button>
      </div>
    </div>
  )
}
