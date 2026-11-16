import { Plus, Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import QuantityStepper from '../ui/QuantityStepper'

export default function AddControl({ product, large = false }) {
  const { quantityOf, add, setQty, remove, isBusy } = useCart()
  const qty = quantityOf(product.id)
  const busy = isBusy(product.id)

  const hasValidPrice =
    product.price !== undefined &&
    product.price !== null &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) > 0

  if (product.available === false || !hasValidPrice) {
    return (
      <span className="rounded-full bg-[#170F1B] border border-[#593650]/60 px-2.5 py-1 text-[11px] font-semibold text-[#94849A]">
        Unavailable
      </span>
    )
  }

  if (qty > 0) {
    if (large) {
      return (
        <QuantityStepper
          large={large}
          value={qty}
          disabled={busy}
          onChange={(n) => (n <= 0 ? remove(product.id) : setQty(product.id, n))}
        />
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <QuantityStepper
          variant="subtle"
          value={qty}
          disabled={busy}
          onChange={(n) => (n <= 0 ? remove(product.id) : setQty(product.id, n))}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => remove(product.id)}
          aria-label={`Remove ${product.name}`}
          className="grid h-7 w-7 place-items-center rounded-lg text-[#94849A] hover:text-[#F05A79] hover:bg-[#F05A79]/15 active:scale-90 transition disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (large) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => add(product, 1)}
        className="h-12 px-8 rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] font-bold text-white text-base shadow-lg shadow-pink-500/25 transition active:scale-95 hover:brightness-110 disabled:opacity-50"
      >
        Add to Cart
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => add(product, 1)}
      aria-label={`Add ${product.name} to cart`}
      className="grid h-8 w-8 place-items-center rounded-lg bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] transition hover:bg-gradient-to-r hover:from-[#EC55C8] hover:to-[#B65DDA] hover:text-white active:scale-95 shadow-sm disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
    </button>
  )
}
