import { useEffect } from 'react'
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom'
import { X, MapPin, Trash2, Plus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useLocation } from '../../context/LocationContext'
import { ROUTES } from '../../config/routes'
import { formatCurrency, formatItemQuantity } from '../../utils/format'
import ProductImage from './ProductImage'
import QuantityStepper from '../ui/QuantityStepper'
import Button from '../ui/Button'

export default function CartPanel() {
  const { cart, itemCount, estimatedTotal, setQty, remove, isCartOpen, closeCart } = useCart()
  const { location } = useLocation()
  const navigate = useNavigate()
  const routerLocation = useRouterLocation()

  const isOwnerOrCaptain =
    routerLocation.pathname.startsWith('/owner') ||
    routerLocation.pathname.startsWith('/shop-owner') ||
    routerLocation.pathname.startsWith('/captain')

  // Auto-close if navigating to owner or captain interface
  useEffect(() => {
    if (isOwnerOrCaptain && isCartOpen) {
      closeCart()
    }
  }, [isOwnerOrCaptain, isCartOpen, closeCart])

  // Close on Escape key
  useEffect(() => {
    if (!isCartOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isCartOpen, closeCart])

  if (!isCartOpen || isOwnerOrCaptain) return null

  const handleAddMore = () => {
    closeCart()
    if (cart.shopId && !window.location.pathname.includes(`/customer/shops/${cart.shopId}`)) {
      navigate(ROUTES.shop(cart.shopId))
    }
  }

  const handleProceedToCheckout = () => {
    closeCart()
    navigate(ROUTES.checkout)
  }

  const hasItems = cart.items.length > 0
  const shopTitle = hasItems && cart.shopName ? `Your Cart (${cart.shopName})` : 'Your Cart'
  const shopAddress = hasItems ? cart.shopAddress || location?.label || '' : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] transition-opacity"
      onClick={closeCart}
      role="dialog"
      aria-modal="true"
      aria-label="Your Cart"
    >
      <div
        className="w-full max-w-md rounded-t-[28px] bg-white shadow-2xl border-t border-line flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle / top bar */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-line/80" />
        </div>

        {/* Header matching Storyboard Screen 4, 6 & 12 */}
        <div className="flex items-start justify-between border-b border-line px-4 pb-3 pt-1">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="truncate text-base font-black text-ink">{shopTitle}</h2>
            {shopAddress && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-mute">
                <MapPin className="h-3.5 w-3.5 text-accent-500 shrink-0" />
                <span className="truncate">{shopAddress}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart panel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-canvas hover:text-ink active:scale-95 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panel Body */}
        {cart.items.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-pink-50 text-accent-500">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Your Cart is Empty</h3>
              <p className="mt-1 text-xs text-mute leading-relaxed">
                Add fresh groceries and essentials from a nearby kirana store to begin.
              </p>
            </div>
            <Button
              className="bg-accent-500 text-xs font-bold py-2.5 px-6 mx-auto"
              onClick={() => {
                closeCart()
                navigate(ROUTES.home)
              }}
            >
              Browse Shops
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* Product Items List matching Screen 4 */}
              <ul className="divide-y divide-line/60">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-3 first:pt-1">
                    {/* Thumbnail Image */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-canvas p-1 border border-line/60 flex items-center justify-center">
                      <ProductImage
                        src={i.image}
                        alt={i.name}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Product Name, Pack size, and Price */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs sm:text-sm font-bold text-ink leading-snug">
                        {i.name}
                      </h4>
                      <p className="mt-0.5 text-[11px] font-semibold text-mute truncate">
                        {i.packSize || formatItemQuantity(1, i.unit)}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-black text-ink">
                        {formatCurrency(i.price)}
                      </p>
                    </div>

                    {/* Stepper & Individual Delete Button */}
                    <div className="flex shrink-0 items-center gap-2">
                      <QuantityStepper
                        variant="subtle"
                        value={i.quantity}
                        onChange={(n) =>
                          n <= 0 ? remove(i.productId) : setQty(i.productId, n)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => remove(i.productId)}
                        aria-label={`Remove ${i.name}`}
                        className="grid h-7 w-7 place-items-center rounded-lg text-pink-500 hover:text-red-600 hover:bg-pink-50 active:scale-90 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* + Add more items action */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleAddMore}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-500 hover:text-accent-600 hover:underline active:opacity-75 transition"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Add more items
                </button>
              </div>

              {/* Bill Breakdown matching Storyboard Screen 4, 6 & 12 */}
              <div className="rounded-2xl border border-line/70 bg-canvas/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-medium text-mute">
                  <span>Items Total</span>
                  <span className="font-bold text-ink">{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex items-center justify-between font-medium text-mute">
                  <span>Delivery Charges</span>
                  <span className="font-extrabold text-emerald-600">FREE</span>
                </div>
                <div className="flex items-center justify-between border-t border-line/60 pt-2 text-sm font-black text-ink">
                  <span>Total Amount</span>
                  <span className="text-base font-black text-accent-600">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout CTA */}
            <div className="border-t border-line bg-white p-4 pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
              <Button
                full
                onClick={handleProceedToCheckout}
                className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-bold py-3.5 text-sm shadow-lg shadow-pink-500/25 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Checkout</span>
                <span className="text-white/80 font-normal">·</span>
                <span>{formatCurrency(estimatedTotal)}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
