import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  Store,
  Bike,
  Banknote,
  QrCode,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useCart } from '../../../context/CartContext'
import { useLocation } from '../../../context/LocationContext'
import { orderApi, shopApi } from '../../../services/api'
import { getErrorMessage } from '../../../services/apiClient'
import { ROUTES } from '../../../config/routes'
import { formatCurrency, formatItemQuantity } from '../../../utils/format'
import PageHeader from '../../../components/shared/PageHeader'
import ProductImage from '../../../components/shared/ProductImage'
import QuantityStepper from '../../../components/ui/QuantityStepper'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'

const ADDRESS_KEY = 'nearbuy:lastDeliveryAddress'
const readAddress = () => {
  try {
    return localStorage.getItem(ADDRESS_KEY) || ''
  } catch {
    return ''
  }
}
const saveAddress = (v) => {
  try {
    localStorage.setItem(ADDRESS_KEY, v)
  } catch {
    // ignore
  }
}

export default function CheckoutPage() {
  const { cart, loading, estimatedTotal, refresh, itemCount, setQty, remove } = useCart()
  const { location, openSheet } = useLocation()
  const navigate = useNavigate()

  // Checkout Steps: 'address' -> 'payment' -> placedOrder
  const [step, setStep] = useState('address')
  const [showSummaryAccordion, setShowSummaryAccordion] = useState(false)

  const [fulfillment, setFulfillment] = useState('delivery')
  const [payment, setPayment] = useState('shop_upi')
  const [address, setAddress] = useState(() => {
    return location?.address || readAddress() || (location?.label ? `${location.label}, Hyderabad` : 'Murad Nagar, Hyderabad - 500028')
  })

  // Synchronize delivery address whenever user updates location via GPS or locality picker
  useEffect(() => {
    if (location?.address) {
      setAddress(location.address)
      saveAddress(location.address)
    } else if (location?.label) {
      const fallback = `${location.label}, Hyderabad`
      setAddress(fallback)
      saveAddress(fallback)
    }
  }, [location?.latitude, location?.longitude, location?.address, location?.label])
  const [shopPaymentInfo, setShopPaymentInfo] = useState(null)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [timeLeft, setTimeLeft] = useState(863) // 14:23 countdown
  const lock = useRef(false)

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch shop's UPI & payment settings if UPI selected
  useEffect(() => {
    if (cart.shopId) {
      shopApi
        .paymentInfo(cart.shopId)
        .then((data) => setShopPaymentInfo(data))
        .catch(() => {})
    }
  }, [cart.shopId])

  if (loading && !cart.items.length) {
    return (
      <div className="min-h-screen bg-[#100A14] text-white">
        <PageHeader title="Checkout" fallback={ROUTES.home} right={null} />
        <div className="space-y-4 p-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  // If order was just placed, display Order Confirmation (Screen 11)
  if (placedOrder) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-[#100A14] text-white">
        <div className="w-full max-w-sm space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#20C878]/15 border-2 border-[#20C878] text-[#20C878] shadow-xl shadow-[#20C878]/20 animate-pulse">
            <CheckCircle2 className="h-12 w-12 text-[#20C878]" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Order Placed Successfully!</h1>
            <p className="mt-1 text-xs font-semibold text-[#EC55C8]">
              Order ID: #{placedOrder.id || placedOrder._id}
            </p>
            <p className="mt-2 text-xs text-[#94849A] leading-relaxed">
              Your order has been placed with{' '}
              <strong className="text-white">{cart.shopName || 'the store'}</strong> and is being prepared.
            </p>
          </div>

          {/* Shop Card */}
          <div className="rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card text-left">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650]">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-sm text-white">{cart.shopName || 'Local Kirana Store'}</p>
                <p className="text-xs text-[#94849A]">
                  {fulfillment === 'delivery' ? 'Delivery to Home' : 'Self Pickup from Shop'}
                </p>
                <p className="mt-0.5 text-xs font-bold text-white">
                  Total Amount: {formatCurrency(placedOrder.totalAmount || estimatedTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              full
              onClick={() => navigate(ROUTES.order(placedOrder.id || placedOrder._id))}
              className="py-3"
            >
              View Order Details
            </Button>
            <Button
              full
              variant="outline"
              onClick={() => navigate(ROUTES.home)}
              className="text-xs font-bold"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!cart.items.length && !submitting) {
    return <Navigate to={ROUTES.home} replace />
  }

  const delivery = fulfillment === 'delivery'

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleContinueToPayment = () => {
    const next = {}
    if (delivery && address.trim().length < 8) {
      next.address = 'Enter a complete delivery address'
    }
    setErrors(next)
    if (Object.keys(next).length) return
    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const placeOrder = async () => {
    if (lock.current) return
    const next = {}
    if (delivery) {
      if (address.trim().length < 8) next.address = 'Enter a complete delivery address'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    lock.current = true
    setSubmitting(true)
    setServerError('')

    // Backend order model accepts "shop_upi" or "cod"
    const finalPaymentMethod = payment === 'card' ? 'shop_upi' : payment

    const payload = {
      fulfillmentType: fulfillment,
      paymentMethod: finalPaymentMethod,
      payment: { method: finalPaymentMethod },
      ...(delivery && {
        deliveryAddress: address.trim(),
        deliveryLocation: location
          ? { latitude: location.latitude, longitude: location.longitude }
          : { latitude: 17.3824, longitude: 78.4418 },
      }),
    }

    try {
      const order = await orderApi.create(payload)
      if (delivery) saveAddress(address.trim())
      await refresh()
      setPlacedOrder(order)
    } catch (e) {
      setServerError(getErrorMessage(e, 'Could not place your order. Please try again.'))
      lock.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-36">
      {/* Header */}
      {step === 'payment' ? (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#593650] bg-[#100A14]/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('address')}
              aria-label="Back to Address"
              className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10"
            >
              <span className="text-xl font-bold">‹</span>
            </button>
            <h1 className="text-lg font-bold text-white">Payment Method</h1>
          </div>
        </header>
      ) : (
        <PageHeader title="Checkout & Payment" fallback={ROUTES.home} right={null} />
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 py-3 px-4 bg-[#170F1B] border-b border-[#593650]">
        {/* Step 1: Address */}
        <button
          type="button"
          onClick={() => setStep('address')}
          className="flex items-center gap-1.5 focus:outline-none"
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
              step === 'payment'
                ? 'bg-[#20C878] text-white'
                : 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-sm'
            }`}
          >
            {step === 'payment' ? '✓' : '1'}
          </span>
          <span
            className={`text-xs font-bold ${
              step === 'address' ? 'text-[#EC55C8]' : 'text-white'
            }`}
          >
            Address
          </span>
        </button>

        <div
          className={`h-0.5 w-8 transition-colors ${
            step === 'payment' ? 'bg-[#EC55C8]' : 'bg-[#593650]'
          }`}
        />

        {/* Step 2: Payment */}
        <button
          type="button"
          onClick={handleContinueToPayment}
          className="flex items-center gap-1.5 focus:outline-none"
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
              step === 'payment'
                ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-sm'
                : 'bg-[#2B1B2D] text-[#94849A] border border-[#593650]'
            }`}
          >
            2
          </span>
          <span
            className={`text-xs font-bold ${
              step === 'payment' ? 'text-[#EC55C8]' : 'text-[#94849A]'
            }`}
          >
            Payment
          </span>
        </button>

        <div className="h-0.5 w-8 bg-[#593650]" />

        {/* Step 3: Confirm */}
        <div className="flex items-center gap-1.5 opacity-50">
          <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold bg-[#2B1B2D] text-[#94849A] border border-[#593650]">
            3
          </span>
          <span className="text-xs font-bold text-[#94849A]">Confirm</span>
        </div>
      </div>

      {/* Countdown Timer Banner */}
      <div className="bg-[#2B1B2D] border-b border-[#593650] px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#F58AD8]">
        <Clock className="h-3.5 w-3.5 animate-pulse text-[#EC55C8]" />
        <span>{formatTimer(timeLeft)}</span>
        <span className="font-medium text-[#94849A]">to complete your order</span>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {serverError && (
          <p role="alert" className="rounded-2xl bg-danger/15 border border-danger/30 p-3.5 text-xs font-semibold text-danger">
            {serverError}
          </p>
        )}

        {/* STEP 1: ADDRESS & INTERACTIVE ORDER SUMMARY */}
        {step === 'address' && (
          <>
            {/* Fulfillment Method Selection */}
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A]">
                Choose Fulfillment Method
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFulfillment('delivery')}
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 text-center transition ${
                    delivery
                      ? 'border-[#EC55C8] bg-[#EC55C8]/15 text-[#F58AD8] font-bold'
                      : 'border-[#593650] bg-[#211522] text-[#94849A] font-medium'
                  }`}
                >
                  <Bike className={`h-6 w-6 mb-1 ${delivery ? 'text-[#EC55C8]' : 'text-[#94849A]'}`} />
                  <span className="text-xs">Delivery to Address</span>
                  <span className="text-[10px] text-[#94849A] font-normal">15-30 mins</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillment('pickup')}
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 text-center transition ${
                    !delivery
                      ? 'border-[#EC55C8] bg-[#EC55C8]/15 text-[#F58AD8] font-bold'
                      : 'border-[#593650] bg-[#211522] text-[#94849A] font-medium'
                  }`}
                >
                  <Store className={`h-6 w-6 mb-1 ${!delivery ? 'text-[#EC55C8]' : 'text-[#94849A]'}`} />
                  <span className="text-xs">Pickup from Shop</span>
                  <span className="text-[10px] text-[#20C878] font-semibold">Free of cost</span>
                </button>
              </div>
            </section>

            {/* Delivery Address or Route to Shop */}
            {delivery ? (
              <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#EC55C8]" /> Delivery Address
                  </h2>
                  <button
                    type="button"
                    onClick={openSheet}
                    className="text-xs font-bold text-[#EC55C8] hover:underline flex items-center gap-1"
                  >
                    Change
                  </button>
                </div>

                {location && (
                  <div className="flex items-center justify-between text-[11px] bg-[#170F1B] px-2.5 py-1.5 rounded-xl border border-[#593650]">
                    <span className="flex items-center gap-1.5 text-white font-semibold truncate">
                      <Navigation className="h-3 w-3 text-[#EC55C8] shrink-0" />
                      <span className="truncate">{location.label || 'Selected Location'}</span>
                      {location.pincode && (
                        <span className="text-[10px] text-[#94849A] font-mono">({location.pincode})</span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#EC55C8] font-bold shrink-0">GPS/Map Linked</span>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => {
                    const val = e.target.value
                    setAddress(val)
                    saveAddress(val)
                  }}
                  placeholder="House/Flat no., Street, Landmark, Pincode"
                  className="w-full text-xs font-medium text-white bg-[#170F1B] p-2.5 rounded-xl border border-[#593650] outline-none focus:border-[#EC55C8]"
                />
                <p className="text-[10px] text-[#94849A]">
                  Tip: You can edit flat/street details above while keeping your pinpointed map coordinates.
                </p>
                {errors.address && (
                  <p className="text-[11px] font-semibold text-danger">{errors.address}</p>
                )}
              </section>
            ) : (
              <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A] flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-[#EC55C8]" /> Route to Shop (Pickup)
                </h2>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-bold text-white">{cart.shopName || 'Store Location'}</p>
                    <p className="text-[11px] text-[#94849A]">12 mins (3.2 km) · Via Main Road</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      cart.shopName || 'Kirana store'
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F58AD8] border border-[#593650] bg-[#2B1B2D] px-2.5 py-1.5 rounded-lg"
                  >
                    Open in Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </section>
            )}

            {/* Interactive Order Summary */}
            <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-3">
              <div className="flex items-center justify-between border-b border-[#593650] pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A]">Order Summary</h2>
                <span className="text-xs font-bold text-white">{itemCount} items</span>
              </div>

              {/* Editable items list during checkout */}
              <ul className="divide-y divide-[#593650]/60">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-3 first:pt-1">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#170F1B] p-1 border border-[#593650] flex items-center justify-center">
                      <ProductImage src={i.image} alt={i.name} category={i.category} className="h-full w-full object-contain" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-bold text-white">
                        {i.name}{' '}
                        <span className="text-[#94849A] font-normal">
                          ({i.packSize || formatItemQuantity(1, i.unit)})
                        </span>
                      </h4>
                      <p className="text-[11px] font-semibold text-[#94849A]">
                        x {i.quantity} ·{' '}
                        <span className="font-extrabold text-white">
                          {formatCurrency(i.price * i.quantity)}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <QuantityStepper
                        variant="subtle"
                        value={i.quantity}
                        onChange={(n) => (n <= 0 ? remove(i.productId) : setQty(i.productId, n))}
                      />
                      <button
                        type="button"
                        onClick={() => remove(i.productId)}
                        aria-label={`Remove ${i.name}`}
                        className="grid h-7 w-7 place-items-center rounded-lg text-[#94849A] hover:text-danger hover:bg-danger/15 active:scale-90 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Bill Details */}
              <div className="border-t border-[#593650] pt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#C4B4C9]">
                  <span>Items Total</span>
                  <span className="font-bold text-white">{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex justify-between text-[#C4B4C9]">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-[#20C878]">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-[#593650]">
                  <span>Total Amount</span>
                  <span className="text-base text-[#EC55C8]">{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* STEP 2: PAYMENT METHOD */}
        {step === 'payment' && (
          <>
            {/* Payment Options */}
            <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A]">
                Select Payment Method
              </h2>

              <div className="space-y-2.5">
                {/* 1. UPI */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'shop_upi'
                      ? 'border-[#EC55C8] bg-[#EC55C8]/15'
                      : 'border-[#593650] bg-[#170F1B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="shop_upi"
                    checked={payment === 'shop_upi'}
                    onChange={() => setPayment('shop_upi')}
                    className="mt-1 accent-[#EC55C8]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <QrCode className="h-4 w-4 text-[#F58AD8]" />
                      <span>UPI (PhonePe, GPay, Paytm)</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#94849A]">
                      Pay directly to shop UPI ID or scan QR upon pickup/delivery.
                    </p>
                    {shopPaymentInfo?.upiId && (
                      <div className="mt-2 rounded-xl bg-[#2B1B2D] p-2 text-[11px] text-white font-semibold border border-[#593650]">
                        Store UPI ID:{' '}
                        <span className="font-mono text-[#EC55C8]">{shopPaymentInfo.upiId}</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* 2. Cash on Delivery */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'cod'
                      ? 'border-[#EC55C8] bg-[#EC55C8]/15'
                      : 'border-[#593650] bg-[#170F1B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={payment === 'cod'}
                    onChange={() => setPayment('cod')}
                    className="mt-1 accent-[#EC55C8]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <Banknote className="h-4 w-4 text-[#20C878]" />
                      <span>Cash on Delivery</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#94849A]">
                      Pay cash directly to shopkeeper or delivery partner.
                    </p>
                  </div>
                </label>

                {/* 3. Pay using Card */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'card'
                      ? 'border-[#EC55C8] bg-[#EC55C8]/15'
                      : 'border-[#593650] bg-[#170F1B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={payment === 'card'}
                    onChange={() => setPayment('card')}
                    className="mt-1 accent-[#EC55C8]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                      <CreditCard className="h-4 w-4 text-blue-400" />
                      <span>Pay using Card</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#94849A]">
                      Debit / Credit Card payments via QR or machine on arrival.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Expandable Order Summary Accordion */}
            <div className="rounded-2xl border border-[#593650] bg-[#211522] p-3.5 shadow-card space-y-2">
              <button
                type="button"
                onClick={() => setShowSummaryAccordion(!showSummaryAccordion)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-white shrink-0">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  {/* Thumbnails row */}
                  <div className="flex -space-x-1 overflow-hidden">
                    {cart.items.slice(0, 4).map((i) => (
                      <div
                        key={i.productId}
                        className="inline-block h-6 w-6 rounded-md bg-[#170F1B] border border-[#593650] overflow-hidden p-0.5"
                      >
                        <ProductImage src={i.image} alt={i.name} category={i.category} className="h-full w-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">
                    {formatCurrency(estimatedTotal)}
                  </span>
                  {showSummaryAccordion ? (
                    <ChevronUp className="h-4 w-4 text-[#94849A]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#94849A]" />
                  )}
                </div>
              </button>

              {showSummaryAccordion && (
                <div className="pt-2 border-t border-[#593650] space-y-2 text-xs">
                  <ul className="space-y-1.5">
                    {cart.items.map((i) => (
                      <li key={i.productId} className="flex justify-between text-[#94849A]">
                        <span className="truncate pr-2">
                          {i.name} ({i.packSize || formatItemQuantity(1, i.unit)}) x {i.quantity}
                        </span>
                        <span className="font-semibold text-white shrink-0">
                          {formatCurrency(i.price * i.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between border-t border-[#593650] pt-1.5 font-bold text-white">
                    <span>Total Amount</span>
                    <span className="text-[#EC55C8]">{formatCurrency(estimatedTotal)}</span>
                  </div>
                  <div className="pt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setStep('address')}
                      className="text-[11px] font-bold text-[#F58AD8] hover:underline"
                    >
                      Edit Items & Address ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md lg:max-w-4xl border-t border-[#593650] bg-[#170F1B]/95 p-4 backdrop-blur pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
        {step === 'address' ? (
          <Button
            full
            onClick={handleContinueToPayment}
            className="text-sm shadow-md shadow-pink-500/25"
          >
            Continue to Payment
          </Button>
        ) : (
          <Button
            full
            loading={submitting}
            onClick={placeOrder}
            className="text-sm shadow-md shadow-pink-500/25"
          >
            Place Order · {formatCurrency(estimatedTotal)}
          </Button>
        )}
      </div>
    </div>
  )
}
