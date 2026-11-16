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
import ProductImage from '../../../components/shared/ProductImage'
import { OrderStatusBadge, PaymentStatusBadge } from '../../../components/shared/StatusBadge'
import LiveTrackingModal from './LiveTrackingModal'
import ErrorState from '../../../components/ui/ErrorState'
import Skeleton from '../../../components/ui/Skeleton'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'

function UpiPanel({ order, onMarkPaid, marking }) {
  const { showToast } = useToast()
  const shopId = order?.shopId
  const info = useAsync(
    () => (shopId ? shopApi.paymentInfo(shopId) : Promise.resolve(null)),
    [shopId],
    { enabled: Boolean(shopId) && (order?.paymentStatus === 'pending' || order?.paymentStatus === 'customer_marked_paid') },
  )
  const upiLink = info.data?.upiId
    ? `upi://pay?pa=${encodeURIComponent(info.data.upiId)}&am=${order?.totalAmount || 0}&cu=INR&tn=${encodeURIComponent(
        `NearBuy order ${String(order?.id || order?._id || '').slice(-6)}`,
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

  if (order?.paymentStatus === 'paid') return null
  const marked = order?.paymentStatus === 'customer_marked_paid'

  return (
    <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650]">
      <h2 className="font-bold text-sm text-white">Pay {formatCurrency(order?.totalAmount || 0)} to the shop</h2>
      {info.loading ? (
        <Skeleton className="mt-3 h-44 rounded-2xl" />
      ) : info.error ? (
        <p role="alert" className="mt-3 rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-[#F5A623]">
          {getErrorMessage(info.error, 'Store payment details are not available.')}
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-center">
          {info.data?.qrCode ? (
            <img
              src={qrSrc(info.data.qrCode)}
              alt="Shop UPI QR code"
              className="h-44 w-44 rounded-2xl border border-[#593650] bg-white object-contain p-2"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <p className="text-xs text-[#94849A] py-2">The shop has not uploaded a QR code image.</p>
          )}

          {info.data?.upiId && (
            <button
              onClick={copy}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-[#2B1B2D] border border-[#593650] px-4 py-1.5 text-xs font-bold text-[#F58AD8] active:scale-95 transition"
            >
              <Copy className="h-3.5 w-3.5" /> UPI ID: {info.data.upiId}
            </button>
          )}

          {upiLink && !marked && (
            <a
              href={upiLink}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#EC55C8] hover:underline"
            >
              <Smartphone className="h-3.5 w-3.5" /> Open installed UPI app
            </a>
          )}
        </div>
      )}

      {marked ? (
        <p className="mt-4 rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-center text-xs font-semibold text-[#F5A623]">
          Marked as Paid. Awaiting shop owner confirmation.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[11px] text-[#94849A] text-center">
            After sending payment, tap the button below. The shopkeeper confirms upon receipt.
          </p>
          <Button
            full
            className="mt-2.5 text-xs"
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
      <div className="min-h-screen bg-[#100A14] text-white">
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
      <div className="min-h-screen bg-[#100A14] text-white">
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
    <div className="min-h-screen bg-[#100A14] text-white pb-16">
      <PageHeader title="Order Details" fallback={ROUTES.orders} />

      <div className="space-y-4 px-4 pt-3">
        {state?.justPlaced && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#EC55C8]/15 border border-[#EC55C8]/30 p-3.5 text-[#F58AD8]">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[#EC55C8]" />
            <div>
              <p className="text-xs font-bold text-white">Order Placed Successfully</p>
              <p className="text-[11px] text-[#94849A]">{order.shopName} will accept and prepare your order.</p>
            </div>
          </div>
        )}

        {/* Order Header & Status Card */}
        <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-3">
          <div className="flex items-start justify-between gap-2 border-b border-[#593650] pb-3">
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-white">{order?.shopName || 'Shop'}</h1>
              <p className="text-[11px] font-semibold text-[#EC55C8]">
                Order ID: #{String(order?.id || order?._id || '').slice(-8).toUpperCase()}
              </p>
              <p className="text-[10px] text-[#94849A]">{formatDateTime(order?.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order?.status} />
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
                className="text-xs flex items-center justify-center gap-2 shadow-md shadow-pink-500/25"
              >
                <Bike className="h-4 w-4" /> Live Delivery Tracking
              </Button>
            </div>
          )}
        </section>

        {/* UPI Payment panel if applicable */}
        {order?.paymentMethod === 'shop_upi' && order?.status !== 'cancelled' && (
          <UpiPanel order={order} onMarkPaid={markPaid} marking={marking} />
        )}

        {/* Fulfillment Card */}
        <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A] flex items-center gap-1.5">
            {isPickup ? <Store className="h-4 w-4 text-[#F58AD8]" /> : <Bike className="h-4 w-4 text-[#EC55C8]" />}
            {isPickup ? 'Pickup Information' : 'Delivery Address'}
          </h2>

          {isPickup ? (
            <div>
              <p className="text-xs font-bold text-white">{order?.shopName || 'Shop'}</p>
              <p className="text-xs text-[#94849A] mt-0.5">{order?.shopAddress || 'Collect from store counter'}</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order?.shopAddress || 'store')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#EC55C8] hover:underline"
              >
                <Navigation className="h-3.5 w-3.5" /> Directions in Maps
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-white font-semibold">{order?.deliveryAddress || 'Address on file'}</p>

              {/* Assigned Partner details */}
              {order?.captainName && (
                <div className="rounded-xl border border-[#593650] bg-[#170F1B] p-2.5 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#2B1B2D] border border-[#593650] grid place-items-center text-[#EC55C8] font-bold shrink-0">
                      <Bike className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[#94849A]">Assigned Partner</p>
                      <p className="text-xs font-bold text-white">{order.captainName}</p>
                      <p className="text-[10px] text-[#94849A]">{order.captainVehicle || 'Verified NearBuy Partner'}</p>
                    </div>
                  </div>
                  {order.captainPhone && (
                    <a
                      href={`tel:${order.captainPhone}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#20C878]/20 text-[#20C878] border border-[#20C878]/30 active:scale-95 transition shrink-0"
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
        <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94849A] border-b border-[#593650] pb-2">
            Items ({order?.items?.length || 0})
          </h2>

          <ul className="space-y-2 text-xs">
            {(order?.items || []).map((i, idx) => (
              <li key={i?.productId || idx} className="flex items-center gap-3 text-white">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-[#170F1B] border border-[#593650] p-0.5 flex items-center justify-center">
                  <ProductImage src={i?.image} alt={i?.name || ''} category={i?.category || ''}
                    className="h-full w-full object-contain" />
                </div>
                <span className="min-w-0 flex-1">{formatItemQuantity(i?.quantity, i?.unit, i?.name)}</span>
                <span className="font-bold">{formatCurrency((Number(i?.price) || 0) * (Number(i?.quantity) || 0))}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-[#593650] pt-2 flex justify-between text-xs text-[#94849A]">
            <span>Items total</span>
            <span className="font-semibold text-white">{formatCurrency(order?.itemsTotal || order?.totalAmount || 0)}</span>
          </div>

          <div className="flex justify-between border-t border-[#593650] pt-2 text-sm font-black text-white">
            <span>Total paid</span>
            <span className="text-[#EC55C8]">{formatCurrency(order?.totalAmount || 0)}</span>
          </div>
        </section>

        {/* Cancel Button if eligible */}
        {cancellable && (
          <div className="pt-2">
            <Button
              full
              variant="danger"
              onClick={() => setCancelOpen(true)}
              className="text-xs font-bold"
            >
              Cancel Order
            </Button>
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <div className="flex gap-2">
            <Button full variant="outline" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button full variant="danger" loading={cancelling} onClick={cancel}>
              Yes, cancel
            </Button>
          </div>
        }
      >
        Are you sure you want to cancel this order? This cannot be undone once processed.
      </Modal>

      {/* Live Tracking Modal */}
      <LiveTrackingModal
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        order={order}
      />
    </div>
  )
}
