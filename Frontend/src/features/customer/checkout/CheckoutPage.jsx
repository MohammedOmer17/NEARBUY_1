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

  // Checkout Steps: 'address' (Screen 9) -> 'payment' (Screen 10) -> placedOrder (Screen 11)
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

  // Countdown timer matching Storyboard screen 10
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
      <div>
        <PageHeader title="Checkout" fallback={ROUTES.home} />
        <div className="space-y-3 p-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    )
  }

  // If order was just placed, display Storyboard Screen 11: Order Confirmation!
  if (placedOrder) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-canvas">
        <div className="w-full max-w-sm space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-accent-500 shadow-xl shadow-pink-500/20 animate-bounce">
            <CheckCircle2 className="h-12 w-12 text-accent-500 fill-accent-500 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-ink tracking-tight">Order Placed Successfully!</h1>
            <p className="mt-1 text-xs font-semibold text-accent-500">
              Order ID: #{placedOrder.id || placedOrder._id}
            </p>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              Your order has been placed with{' '}
              <strong className="text-ink">{cart.shopName || 'the store'}</strong> and is being prepared.
            </p>
          </div>

          {/* Shop Card */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card text-left">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-sm text-ink">{cart.shopName || 'Local Kirana Store'}</p>
                <p className="text-xs text-mute">
                  {fulfillment === 'delivery' ? 'Delivery to Home' : 'Self Pickup from Shop'}
                </p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  Total Amount: {formatCurrency(placedOrder.totalAmount || estimatedTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              full
              onClick={() => navigate(ROUTES.order(placedOrder.id || placedOrder._id))}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 shadow-md shadow-pink-500/25"
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
          : { latitude: 17.3824, longitude: 78.4418 }, // Murad Nagar hub center
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
    <div className="pb-36">
      {/* Header */}
      {step === 'payment' ? (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('address')}
              aria-label="Back to Address"
              className="grid h-10 w-10 place-items-center rounded-full active:bg-canvas"
            >
              <span className="text-xl font-bold">‹</span>
            </button>
            <h1 className="text-lg font-bold text-ink">Payment Method</h1>
          </div>
        </header>
      ) : (
        <PageHeader title="Checkout & Payment" fallback={ROUTES.home} right={null} />
      )}


      {/* Step Indicator matching Storyboard Screens 9 & 10 */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-b border-line">
        {/* Step 1: Address */}
        <button
          type="button"
          onClick={() => setStep('address')}
          className="flex items-center gap-1.5 focus:outline-none"
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
              step === 'payment'
                ? 'bg-emerald-500 text-white'
                : 'bg-accent-500 text-white shadow-sm'
            }`}
          >
            {step === 'payment' ? '✓' : '1'}
          </span>
          <span
            className={`text-xs font-bold ${
              step === 'address' ? 'text-accent-600' : 'text-ink'
            }`}
          >
            Address
          </span>
        </button>

        <div
          className={`h-0.5 w-8 transition-colors ${
            step === 'payment' ? 'bg-accent-500' : 'bg-line'
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
                ? 'bg-accent-500 text-white shadow-sm'
                : 'bg-canvas text-mute border border-line'
            }`}
          >
            2
          </span>
          <span
            className={`text-xs font-bold ${
              step === 'payment' ? 'text-accent-600' : 'text-mute'
            }`}
          >
            Payment
          </span>
        </button>

        <div className="h-0.5 w-8 bg-line" />

        {/* Step 3: Confirm */}
        <div className="flex items-center gap-1.5 opacity-50">
          <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold bg-canvas text-mute border border-line">
            3
          </span>
          <span className="text-xs font-bold text-mute">Confirm</span>
        </div>
      </div>

      {/* Countdown Timer Banner */}
      <div className="bg-pink-50 border-b border-pink-100 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-accent-600">
        <Clock className="h-3.5 w-3.5 animate-pulse text-accent-500" />
        <span>{formatTimer(timeLeft)}</span>
        <span className="font-medium text-mute">to complete your order</span>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {serverError && (
          <p role="alert" className="rounded-2xl bg-danger-50 p-3.5 text-xs font-semibold text-danger">
            {serverError}
          </p>
        )}

        {/* STEP 1: ADDRESS & INTERACTIVE ORDER SUMMARY (Screen 9) */}
        {step === 'address' && (
          <>
            {/* Fulfillment Method Selection */}
            <section className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-mute">
                Choose Fulfillment Method
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFulfillment('delivery')}
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 text-center transition ${
                    delivery
                      ? 'border-accent-500 bg-pink-50/40 text-accent-600 font-bold'
                      : 'border-line bg-white text-mute font-medium'
                  }`}
                >
                  <Bike className={`h-6 w-6 mb-1 ${delivery ? 'text-accent-500' : 'text-mute'}`} />
                  <span className="text-xs">Delivery to Address</span>
                  <span className="text-[10px] text-mute font-normal">15-30 mins</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillment('pickup')}
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 text-center transition ${
                    !delivery
                      ? 'border-accent-500 bg-pink-50/40 text-accent-600 font-bold'
                      : 'border-line bg-white text-mute font-medium'
                  }`}
                >
                  <Store className={`h-6 w-6 mb-1 ${!delivery ? 'text-accent-500' : 'text-mute'}`} />
                  <span className="text-xs">Pickup from Shop</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Free of cost</span>
                </button>
              </div>
            </section>

            {/* Delivery Address or Route to Shop */}
            {delivery ? (
              <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-accent-500" /> Delivery Address
                  </h2>
                  <button
                    type="button"
                    onClick={openSheet}
                    className="text-xs font-bold text-accent-500 hover:underline flex items-center gap-1"
                  >
                    Change
                  </button>
                </div>

                {location && (
                  <div className="flex items-center justify-between text-[11px] bg-canvas/80 px-2.5 py-1.5 rounded-xl border border-line/70">
                    <span className="flex items-center gap-1.5 text-ink font-semibold truncate">
                      <Navigation className="h-3 w-3 text-accent-500 shrink-0" />
                      <span className="truncate">{location.label || 'Selected Location'}</span>
                      {location.pincode && (
                        <span className="text-[10px] text-mute font-mono">({location.pincode})</span>
                      )}
                    </span>
                    <span className="text-[10px] text-accent-600 font-bold shrink-0">GPS/Map Linked</span>
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
                  className="w-full text-xs font-medium text-ink bg-canvas p-2.5 rounded-xl border border-line outline-none focus:border-accent-500"
                />
                <p className="text-[10px] text-mute">
                  Tip: You can edit flat/street details above while keeping your pinpointed map coordinates.
                </p>
                {errors.address && (
                  <p className="text-[11px] font-semibold text-danger">{errors.address}</p>
                )}
              </section>
            ) : (
              <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-accent-500" /> Route to Shop (Pickup)
                </h2>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs font-bold text-ink">{cart.shopName || 'Store Location'}</p>
                    <p className="text-[11px] text-mute">12 mins (3.2 km) · Via Main Road</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      cart.shopName || 'Kirana store'
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-500 border border-pink-200 bg-pink-50/50 px-2.5 py-1.5 rounded-lg"
                  >
                    Open in Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </section>
            )}

            {/* Interactive Order Summary matching Storyboard Screen 9 */}
            <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-mute">Order Summary</h2>
                <span className="text-xs font-bold text-ink">{itemCount} items</span>
              </div>

              {/* Editable items list during checkout */}
              <ul className="divide-y divide-line/60">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-3 first:pt-1">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-canvas p-1 border border-line/60 flex items-center justify-center">
                      <ProductImage src={i.image} alt={i.name} className="h-full w-full object-contain" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-bold text-ink">
                        {i.name}{' '}
                        <span className="text-mute font-normal">
                          ({i.packSize || formatItemQuantity(1, i.unit)})
                        </span>
                      </h4>
                      <p className="text-[11px] font-semibold text-mute">
                        x {i.quantity} ·{' '}
                        <span className="font-extrabold text-ink">
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
                        className="grid h-7 w-7 place-items-center rounded-lg text-pink-500 hover:text-red-600 hover:bg-pink-50 active:scale-90 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Bill Details */}
              <div className="border-t border-line/70 pt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-mute">
                  <span>Items Total</span>
                  <span className="font-bold text-ink">{formatCurrency(estimatedTotal)}</span>
                </div>
                <div className="flex justify-between text-mute">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-black text-ink pt-2 border-t border-line">
                  <span>Total Amount</span>
                  <span className="text-base text-accent-600">{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* STEP 2: PAYMENT METHOD (Screen 10) */}
        {step === 'payment' && (
          <>
            {/* Payment Options matching Storyboard Screen 10 */}
            <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-mute">
                Select Payment Method
              </h2>

              <div className="space-y-2.5">
                {/* 1. UPI */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'shop_upi'
                      ? 'border-accent-500 bg-pink-50/30'
                      : 'border-line bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="shop_upi"
                    checked={payment === 'shop_upi'}
                    onChange={() => setPayment('shop_upi')}
                    className="mt-1 text-accent-500 focus:ring-accent-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      <QrCode className="h-4 w-4 text-purple-700" />
                      <span>UPI (PhonePe, GPay, Paytm)</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-mute">
                      Pay directly to shop UPI ID or scan QR upon pickup/delivery.
                    </p>
                    {shopPaymentInfo?.upiId && (
                      <div className="mt-2 rounded-xl bg-purple-50 p-2 text-[11px] text-purple-900 font-semibold border border-purple-100">
                        Store UPI ID:{' '}
                        <span className="font-mono text-accent-600">{shopPaymentInfo.upiId}</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* 2. Cash on Delivery */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'cod'
                      ? 'border-accent-500 bg-pink-50/30'
                      : 'border-line bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={payment === 'cod'}
                    onChange={() => setPayment('cod')}
                    className="mt-1 text-accent-500 focus:ring-accent-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <span>Cash on Delivery</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-mute">
                      Pay cash directly to shopkeeper or delivery partner.
                    </p>
                  </div>
                </label>

                {/* 3. Pay using Card */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                    payment === 'card'
                      ? 'border-accent-500 bg-pink-50/30'
                      : 'border-line bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={payment === 'card'}
                    onChange={() => setPayment('card')}
                    className="mt-1 text-accent-500 focus:ring-accent-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span>Pay using Card</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-mute">
                      Debit / Credit Card payments via QR or machine on arrival.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Expandable Order Summary Accordion matching Storyboard Screen 10 */}
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card space-y-2">
              <button
                type="button"
                onClick={() => setShowSummaryAccordion(!showSummaryAccordion)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-ink shrink-0">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  {/* Thumbnails row */}
                  <div className="flex -space-x-1 overflow-hidden">
                    {cart.items.slice(0, 4).map((i) => (
                      <div
                        key={i.productId}
                        className="inline-block h-6 w-6 rounded-md bg-canvas border border-line overflow-hidden p-0.5"
                      >
                        <ProductImage src={i.image} alt={i.name} className="h-full w-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-ink">
                    {formatCurrency(estimatedTotal)}
                  </span>
                  {showSummaryAccordion ? (
                    <ChevronUp className="h-4 w-4 text-mute" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-mute" />
                  )}
                </div>
              </button>

              {showSummaryAccordion && (
                <div className="pt-2 border-t border-line/60 space-y-2 text-xs">
                  <ul className="space-y-1.5">
                    {cart.items.map((i) => (
                      <li key={i.productId} className="flex justify-between text-mute">
                        <span className="truncate pr-2">
                          {i.name} ({i.packSize || formatItemQuantity(1, i.unit)}) x {i.quantity}
                        </span>
                        <span className="font-semibold text-ink shrink-0">
                          {formatCurrency(i.price * i.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between border-t border-line/60 pt-1.5 font-bold text-ink">
                    <span>Total Amount</span>
                    <span className="text-accent-600">{formatCurrency(estimatedTotal)}</span>
                  </div>
                  <div className="pt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setStep('address')}
                      className="text-[11px] font-bold text-accent-500 hover:underline"
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
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-line bg-white/95 p-4 backdrop-blur pb-[calc(1.2rem+env(safe-area-inset-bottom))]">
        {step === 'address' ? (
          <Button
            full
            onClick={handleContinueToPayment}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-md shadow-pink-500/25"
          >
            Continue to Payment
          </Button>
        ) : (
          <Button
            full
            loading={submitting}
            onClick={placeOrder}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-md shadow-pink-500/25"
          >
            Place Order · {formatCurrency(estimatedTotal)}
          </Button>
        )}
      </div>
    </div>
  )
}
