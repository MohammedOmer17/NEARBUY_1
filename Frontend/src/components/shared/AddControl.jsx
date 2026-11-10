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
      <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-mute">
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
          className="grid h-7 w-7 place-items-center rounded-lg text-pink-500 hover:text-red-600 hover:bg-pink-50 active:scale-90 transition disabled:opacity-50"
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
        className="h-12 px-8 rounded-full border border-accent-500 font-bold text-accent-500 text-base transition active:bg-accent-50 disabled:opacity-50"
      >
        Add
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => add(product, 1)}
      aria-label={`Add ${product.name} to cart`}
      className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-accent-500 border border-pink-200 transition hover:bg-accent-500 hover:text-white active:scale-95 shadow-sm disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
    </button>
  )
}
