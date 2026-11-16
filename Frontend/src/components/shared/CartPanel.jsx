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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity"
      onClick={closeCart}
      role="dialog"
      aria-modal="true"
      aria-label="Your Cart"
    >
      <div
        className="w-full max-w-lg rounded-t-[28px] md:rounded-[28px] bg-[#211522] border border-[#593650] shadow-2xl flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-300 overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle / top bar */}
        <div className="pt-2.5 pb-1 flex justify-center md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#593650]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#593650] px-5 pb-3.5 pt-2">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="truncate text-base font-black text-white">{shopTitle}</h2>
            {shopAddress && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#94849A]">
                <MapPin className="h-3.5 w-3.5 text-[#EC55C8] shrink-0" />
                <span className="truncate">{shopAddress}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart panel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#94849A] hover:bg-[#2B1B2D] hover:text-white active:scale-95 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Panel Body */}
        {cart.items.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#2B1B2D] text-[#EC55C8] border border-[#593650]">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Your Cart is Empty</h3>
              <p className="mt-1 text-xs text-[#94849A] leading-relaxed">
                Add fresh groceries and essentials from a nearby kirana store to begin.
              </p>
            </div>
            <Button
              className="text-xs font-bold py-2.5 px-6 mx-auto"
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
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Product Items List */}
              <ul className="divide-y divide-[#593650]/60">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-3 first:pt-1">
                    {/* Thumbnail Image */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#170F1B] p-1 border border-[#593650] flex items-center justify-center">
                      <ProductImage
                        src={i.image}
                        alt={i.name}
                        category={i.category}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Product Name, Pack size, and Price */}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs sm:text-sm font-bold text-white leading-snug">
                        {i.name}
                      </h4>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#94849A] truncate">
                        {i.packSize || formatItemQuantity(1, i.unit)}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-black text-white">
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
                        className="grid h-7 w-7 place-items-center rounded-lg text-[#94849A] hover:text-[#F05A79] hover:bg-[#F05A79]/15 active:scale-90 transition"
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F58AD8] hover:text-[#EC55C8] hover:underline active:opacity-75 transition"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Add more items
                </button>
              </div>

              {/* Bill Breakdown */}
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-medium text-[#C4B4C9]">
                  <span>Items Total</span>
                  <span className="font-bold text-white">{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex items-center justify-between font-medium text-[#C4B4C9]">
                  <span>Delivery Charges</span>
                  <span className="font-extrabold text-[#20C878]">FREE</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#593650] pt-2.5 text-sm font-black text-white">
                  <span>Total Amount</span>
                  <span className="text-base font-black text-[#EC55C8]">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout CTA */}
            <div className="border-t border-[#593650] bg-[#211522] p-4 pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
              <Button
                full
                onClick={handleProceedToCheckout}
                className="bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] hover:from-[#F58AD8] hover:to-[#C671EC] text-white font-bold py-3.5 text-sm shadow-lg shadow-pink-500/25 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
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
