import { useEffect, useState } from 'react'
import { useLocation as useRouterLocation, useParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Navigation,
  Smartphone,
  Star,
  Plus,
  Bike,
  Store,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { useAsync } from '../../../hooks/useAsync'
import { useToast } from '../../../context/ToastContext'
import { useCart } from '../../../context/CartContext'
import { orderApi, shopApi } from '../../../services/api'
import { getErrorMessage } from '../../../services/apiClient'
import { createSocket } from '../../../services/socket'
import { ROUTES } from '../../../config/routes'
import { formatCurrency, formatDateTime, formatItemQuantity, qrSrc } from '../../../utils/format'
import { PAYMENT_METHOD_LABEL, TERMINAL } from '../../../utils/orderMeta'
import PageHeader from '../../../components/shared/PageHeader'
import OrderTimeline from '../../../components/shared/OrderTimeline'
import { OrderStatusBadge, PaymentStatusBadge } from '../../../components/shared/StatusBadge'
import LiveTrackingModal from './LiveTrackingModal'
import ErrorState from '../../../components/ui/ErrorState'
import Skeleton from '../../../components/ui/Skeleton'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'

function UpiPanel({ order, onMarkPaid, marking }) {
  const { showToast } = useToast()
  const info = useAsync(
    () => shopApi.paymentInfo(order.shopId),
    [order.shopId],
    { enabled: order.paymentStatus === 'pending' || order.paymentStatus === 'customer_marked_paid' },
  )
  const upiLink = info.data?.upiId
    ? `upi://pay?pa=${encodeURIComponent(info.data.upiId)}&am=${order.totalAmount}&cu=INR&tn=${encodeURIComponent(
        `NearBuy order ${order.id.slice(-6)}`,
      )}`
    : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.data.upiId)
      showToast('UPI ID copied')
    } catch {
      showToast('Could not copy. Select the ID manually.', 'error')
    }
  }

  if (order.paymentStatus === 'paid') return null
  const marked = order.paymentStatus === 'customer_marked_paid'

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card border border-line">
      <h2 className="font-bold text-sm text-ink">Pay {formatCurrency(order.totalAmount)} to the shop</h2>
      {info.loading ? (
        <Skeleton className="mt-3 h-44 rounded-2xl" />
      ) : info.error ? (
        <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {getErrorMessage(info.error, 'Store payment details are not available.')}
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center">
          {info.data?.qrCode ? (
            <img
              src={qrSrc(info.data.qrCode)}
              alt="Shop UPI QR code"
              className="h-44 w-44 rounded-2xl border border-line object-contain p-2"
            />
          ) : (
            <p className="text-xs text-mute py-2">The shop has not uploaded a QR code image.</p>
          )}

          {info.data?.upiId && (
            <button
              onClick={copy}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-bold text-purple-700 active:scale-95 transition"
            >
              <Copy className="h-3.5 w-3.5" /> UPI ID: {info.data.upiId}
            </button>
          )}

          {upiLink && !marked && (
            <a
              href={upiLink}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-accent-500 hover:underline"
            >
              <Smartphone className="h-3.5 w-3.5" /> Open installed UPI app
            </a>
          )}
        </div>
      )}

      {marked ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-2.5 text-center text-xs font-semibold text-amber-800">
          Marked as Paid. Awaiting shop owner confirmation.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-mute text-center">
            After sending payment, tap the button below. The shopkeeper confirms upon receipt.
          </p>
          <Button
            full
            className="mt-2.5 bg-accent-500 font-bold text-xs"
            loading={marking}
            onClick={onMarkPaid}
          >
            I Have Paid
          </Button>
        </>
      )}
    </section>
  )
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const { state } = useRouterLocation()
  const { showToast } = useToast()
  const { addItem } = useCart()

  const [marking, setMarking] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const { data: order, loading, error, reload } = useAsync(() => orderApi.get(orderId), [orderId])

  // Real-time socket events + Periodic polling for status progression while active
  useEffect(() => {
    if (!order || TERMINAL.includes(order.status)) return

    const socket = createSocket()
    socket.on('order_status_updated', (payload) => {
      if (String(payload?.orderId) === String(orderId)) {
        reload({ silent: true })
      }
    })
    socket.on('delivery_accepted', (payload) => {
      if (String(payload?.orderId) === String(orderId)) {
        reload({ silent: true })
      }
    })

    const t = setInterval(() => {
      if (document.visibilityState === 'visible') reload({ silent: true })
    }, 12000)

    return () => {
      clearInterval(t)
      socket.disconnect()
    }
  }, [order?.status, orderId, reload])

  if (loading && !order) {
    return (
      <div>
        <PageHeader title="Order Details" fallback={ROUTES.orders} />
        <div className="space-y-3 p-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div>
        <PageHeader title="Order Details" fallback={ROUTES.orders} />
        <ErrorState error={error} onRetry={reload} title="Could not load order" />
      </div>
    )
  }

  const markPaid = async () => {
    setMarking(true)
    try {
      await orderApi.markPaid(order.id)
      await reload({ silent: true })
      showToast('Marked as paid. Waiting for shop confirmation.')
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not mark order as paid.'), 'error')
    } finally {
      setMarking(false)
    }
  }

  const cancel = async () => {
    setCancelling(true)
    try {
      await orderApi.cancel(order.id)
      setCancelOpen(false)
      await reload({ silent: true })
      showToast('Order cancelled successfully')
    } catch (e) {
      setCancelOpen(false)
      showToast(getErrorMessage(e, 'This order can no longer be cancelled.'), 'error')
    } finally {
      setCancelling(false)
    }
  }

  const handleReorderItem = async (item) => {
    try {
      await addItem({ id: item.product || item.productId, name: item.name, price: item.price, unit: item.unit, shopId: order.shopId }, item.quantity)
      showToast(`Added ${item.name} to cart`)
    } catch (err) {
      showToast(err.message || 'Could not add to cart', 'error')
    }
  }

  const isPickup = order.fulfillmentType === 'pickup'
  const isDelivery = order.fulfillmentType === 'delivery'
  const cancellable = order.status === 'placed'
  const isLiveTrackable = isDelivery && ['picked_up', 'out_for_delivery'].includes(order.status)
  const isCompleted = order.status === 'completed'

  return (
    <div className="pb-16">
      <PageHeader title="Order Details" fallback={ROUTES.orders} />

      <div className="space-y-4 px-4 pt-3">
        {state?.justPlaced && (
          <div className="flex items-center gap-3 rounded-2xl bg-pink-50 p-3.5 text-accent-600 border border-pink-100">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-accent-500" />
            <div>
              <p className="text-xs font-bold">Order Placed Successfully</p>
              <p className="text-[11px] text-mute">{order.shopName} will accept and prepare your order.</p>
            </div>
          </div>
        )}

        {/* Order Header & Status Card matching Storyboard Screen 12 */}
        <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-3">
          <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-ink">{order.shopName}</h1>
              <p className="text-[11px] font-semibold text-accent-600">
                Order ID: #{order.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-[10px] text-mute">{formatDateTime(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Timeline */}
          <div>
            <OrderTimeline order={order} />
          </div>

          {/* Live Delivery Tracking Button if available */}
          {isLiveTrackable && (
            <div className="pt-2">
              <Button
                full
                onClick={() => setTrackingOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-pink-500/25"
              >
                <Bike className="h-4 w-4" /> Live Delivery Tracking
              </Button>
            </div>
          )}
        </section>

        {/* UPI Payment panel if applicable */}
        {order.paymentMethod === 'shop_upi' && order.status !== 'cancelled' && (
          <UpiPanel order={order} onMarkPaid={markPaid} marking={marking} />
        )}

        {/* Fulfillment Card */}
        <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
            {isPickup ? <Store className="h-4 w-4 text-purple-600" /> : <Bike className="h-4 w-4 text-accent-500" />}
            {isPickup ? 'Pickup Information' : 'Delivery Address'}
          </h2>

          {isPickup ? (
            <div>
              <p className="text-xs font-bold text-ink">{order.shopName}</p>
              <p className="text-xs text-mute mt-0.5">{order.shopAddress || 'Collect from store counter'}</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.shopAddress || 'store')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-accent-500 hover:underline"
              >
                <Navigation className="h-3.5 w-3.5" /> Directions in Maps
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink font-semibold">{order.deliveryAddress || 'Address on file'}</p>

              {/* Assigned Partner details */}
              {order.captainName && (
                <div className="rounded-xl border border-line bg-canvas p-2.5 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200 grid place-items-center text-accent-600 font-bold shrink-0">
                      <Bike className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-mute">Assigned Partner</p>
                      <p className="text-xs font-bold text-ink">{order.captainName}</p>
                      <p className="text-[10px] text-mute">{order.captainVehicle || 'Verified NearBuy Partner'}</p>
                    </div>
                  </div>
                  {order.captainPhone && (
                    <a
                      href={`tel:${order.captainPhone}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 active:scale-95 transition shrink-0"
                      aria-label="Call partner"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Order Items Breakdown */}
        <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-mute border-b border-line pb-2">
            Items ({order.items.length})
          </h2>

          <ul className="space-y-1.5 text-xs">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between items-center text-ink">
                <span>{formatItemQuantity(i.quantity, i.unit, i.name)}</span>
                <span className="font-bold">{formatCurrency(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-line pt-2 flex justify-between text-xs text-mute">
            <span>Payment Method</span>
            <span className="font-semibold text-ink">{PAYMENT_METHOD_LABEL[order.paymentMethod] || 'UPI / Cash'}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-mute">
            <span>Payment Status</span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>

          <div className="border-t border-line pt-2 flex justify-between text-sm font-black text-ink">
            <span>Total Amount</span>
            <span className="text-base text-accent-600 font-extrabold">{formatCurrency(order.totalAmount)}</span>
          </div>
        </section>

        {/* Rate & Reorder Section matching Storyboard Screen 14 */}
        {isCompleted && (
          <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-mute border-b border-line pb-2">
              Rate Order & Reorder
            </h2>

            {!reviewSubmitted ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink">How was your order from {order.shopName}?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition"
                    >
                      <Star className={`h-6 w-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any feedback? (Great service and fresh products!)"
                  className="w-full text-xs p-2.5 rounded-xl border border-line bg-canvas outline-none focus:border-accent-500"
                />

                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    setReviewSubmitted(true)
                    showToast('Thank you for your rating!')
                  }}
                  className="text-xs font-bold"
                >
                  Submit Feedback
                </Button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl">
                ★ Rating submitted! Thank you for supporting your local kirana store.
              </p>
            )}

            {/* Reorder Items Row */}
            <div className="border-t border-line pt-3">
              <h3 className="text-xs font-bold text-ink mb-2">Reorder Items</h3>
              <div className="space-y-2">
                {order.items.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-canvas p-2.5 rounded-xl border border-line">
                    <div>
                      <p className="font-bold text-ink">{i.name}</p>
                      <p className="text-[10px] text-mute">{formatCurrency(i.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReorderItem(i)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-accent-500 text-white shadow-xs active:scale-95 transition"
                      aria-label="Add item again"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cancellation Button if allowed */}
        {cancellable && (
          <Button full variant="danger" onClick={() => setCancelOpen(true)} className="text-xs font-bold">
            Cancel Order
          </Button>
        )}
      </div>

      {/* Cancel Order Modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <div className="space-y-2 w-full">
            <Button full variant="danger" loading={cancelling} onClick={cancel} className="font-bold text-xs">
              Confirm Cancel
            </Button>
            <Button full variant="ghost" onClick={() => setCancelOpen(false)} className="text-xs">
              Keep Order
            </Button>
          </div>
        }
      >
        <p className="text-xs text-mute py-1">
          Your order will be cancelled immediately and the store will be notified.
        </p>
      </Modal>

      {/* Live Tracking Modal matching Screen 13 */}
      <LiveTrackingModal
        order={order}
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
      />
    </div>
  )
}
