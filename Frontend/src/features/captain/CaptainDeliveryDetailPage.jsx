import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Bike,
  Store,
  MapPin,
  Phone,
  CheckCircle2,
  Navigation,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Package,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react'
import { captainApi, mapsApi } from '../../services/api'
import { createSocket } from '../../services/socket'
import { ROUTES } from '../../config/routes'
import { formatCurrency } from '../../utils/format'
import { formatDistance, formatDuration } from '../../utils/geo'
import Button from '../../components/ui/Button'
import DeliveryMap from '../../components/shared/DeliveryMap'

export default function CaptainDeliveryDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [delivery, setDelivery] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [checkedItems, setCheckedItems] = useState({})
  const [hasArrivedAtShop, setHasArrivedAtShop] = useState(false)

  // Live GPS tracking state
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [lastCoords, setLastCoords] = useState(null)
  const watchIdRef = useRef(null)
  const socketRef = useRef(null)

  // Load delivery mission
  const fetchDelivery = async () => {
    try {
      setError('')
      const cur = await captainApi.currentDelivery()
      if (cur && (String(cur.id) === String(orderId) || String(cur.orderId) === String(orderId))) {
        setDelivery(cur)
        if (cur.delivery?.arrivedAt) {
          setHasArrivedAtShop(true)
        }
      } else {
        // Fallback: check history
        const hist = await captainApi.deliveryHistory()
        const match = hist.find(
          (d) => String(d.id) === String(orderId) || String(d.orderId) === String(orderId)
        )
        if (match) {
          setDelivery(match)
        } else if (cur) {
          setDelivery(cur)
        } else {
          setError('Delivery mission not found or already completed.')
        }
      }
    } catch (err) {
      setError('Unable to load delivery mission details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDelivery()
  }, [orderId])

  // Try to load route directions
  const fetchRoute = (coords = lastCoords) => {
    if (!delivery) return
    const activeId = delivery.orderId || delivery.id
    const shopId = delivery.shopId || delivery.shop?._id || delivery.shop
    if (['picked_up', 'out_for_delivery'].includes(delivery.orderStatus)) {
      mapsApi
        .captainToCustomer(activeId, coords)
        .then((res) => setRouteInfo(res?.data || res))
        .catch(() => setRouteInfo(null))
    } else if (shopId) {
      mapsApi
        .captainToShop(shopId, coords)
        .then((res) => setRouteInfo(res?.data || res))
        .catch(() => setRouteInfo(null))
    }
  }

  useEffect(() => {
    fetchRoute()
  }, [delivery?.orderStatus, delivery?.orderId, delivery?.id])

  // Live GPS tracking across active mission (heading to shop, at store, picked up, on the road)
  useEffect(() => {
    const isMissionActive = delivery && ['ready', 'picked_up', 'out_for_delivery'].includes(delivery.orderStatus)
    if (!isMissionActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setGpsActive(false)
      return
    }

    const activeOrderId = delivery.orderId || delivery.id
    const socket = createSocket('captain')
    socketRef.current = socket

    const handleLocation = (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const newCoords = { latitude: lat, longitude: lng, time: new Date() }
      setLastCoords(newCoords)
      setGpsActive(true)
      setGpsError(null)

      if (socket.connected) {
        socket.emit('captain_location_update', {
          orderId: activeOrderId,
          latitude: lat,
          longitude: lng,
        })
      }
      captainApi.updateLocation(lat, lng).catch(() => {})
    }

    const handleError = (err) => {
      setGpsActive(false)
      if (err.code === 1) {
        setGpsError('GPS permission denied. Please allow location access to share live route.')
      } else {
        setGpsError('GPS signal unavailable. Tracking paused.')
      }
    }

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocation,
        handleError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    } else {
      setGpsError('Geolocation is not supported on this device.')
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      socket.disconnect()
      socketRef.current = null
      setGpsActive(false)
    }
  }, [delivery?.orderStatus, delivery?.orderId, delivery?.id])

  const activeId = delivery?.orderId || delivery?.id || orderId

  // Action 1: Confirm arrival at shop
  const handleConfirmArrival = async () => {
    setActionLoading(true)
    setError('')
    try {
      await captainApi.confirmArrived(activeId)
      setHasArrivedAtShop(true)
      setSuccessMsg('Arrival at shop confirmed! Please verify the package items.')
      await fetchDelivery()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to confirm arrival.')
    } finally {
      setActionLoading(false)
    }
  }

  // Action 2: Confirm pickup from shop
  const handleConfirmPickup = async () => {
    setActionLoading(true)
    setError('')
    try {
      await captainApi.confirmPickup(activeId)
      setSuccessMsg('Package picked up from store successfully!')
      await fetchDelivery()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to confirm pickup.')
    } finally {
      setActionLoading(false)
    }
  }

  // Action 3: Start delivery to customer
  const handleStartDelivery = async () => {
    setActionLoading(true)
    setError('')
    try {
      await captainApi.startDelivery(activeId)
      setSuccessMsg('Out for delivery! Navigate safely to the customer.')
      await fetchDelivery()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to start delivery.')
    } finally {
      setActionLoading(false)
    }
  }

  // Action 4: Collect COD cash payment
  const handleCollectPayment = async () => {
    setActionLoading(true)
    setError('')
    try {
      await captainApi.collectPayment(activeId)
      setSuccessMsg('Cash payment collected successfully!')
      await fetchDelivery()
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to collect payment.')
    } finally {
      setActionLoading(false)
    }
  }

  // Action 5: Complete delivery
  const handleCompleteDelivery = async () => {
    setActionLoading(true)
    setError('')
    try {
      await captainApi.completeDelivery(activeId)
      setSuccessMsg('Mission Complete! Delivery finished successfully.')
      setTimeout(() => {
        navigate(ROUTES.captainHome)
      }, 1500)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to complete delivery.')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleCheckItem = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-[#94849A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EC55C8] border-t-transparent mb-2" />
        <p className="text-sm">Loading delivery mission…</p>
      </div>
    )
  }

  if (error && !delivery) {
    return (
      <div className="p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-rose-950/60 text-rose-400 border border-rose-800 mx-auto mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-white">{error}</h2>
        <p className="text-xs text-[#94849A] mt-1">This delivery mission is not currently active.</p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => navigate(ROUTES.captainHome)}
        >
          Return to Home
        </Button>
      </div>
    )
  }

  const status = delivery?.orderStatus || 'ready'
  const isCod = delivery?.paymentMethod === 'cod'
  const isPaid = delivery?.paymentStatus === 'paid'

  return (
    <div className="min-h-screen bg-[#100A14] pb-28 text-white">
      {/* Header bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#593650] bg-[#170F1B]/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(ROUTES.captainHome)}
          className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#EC55C8] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Home</span>
        </button>
        <span className="font-mono text-xs font-black text-[#EC55C8]">
          MISSION #{String(activeId).slice(-6).toUpperCase()}
        </span>
        <span className="rounded-full bg-[#EC55C8]/15 border border-[#EC55C8]/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F58AD8]">
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 p-4">
        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20C878]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Completion celebration view matching Screen 9 */}
        {status === 'completed' ? (
          <div className="rounded-3xl border border-[#593650] bg-[#211522] p-6 text-center shadow-card">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#20C878]/20 text-[#20C878] ring-4 ring-[#20C878]/30">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-black text-white">Delivery Completed!</h2>
            <p className="mt-1 font-mono text-xs text-[#94849A]">
              Order #{String(activeId).slice(-8).toUpperCase()}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-left">
                <span className="text-[11px] text-[#94849A]">Order Earnings</span>
                <p className="mt-1 text-lg font-black text-[#20C878]">₹45</p>
              </div>
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-left">
                <span className="text-[11px] text-[#94849A]">Delivery Status</span>
                <p className="mt-1 text-sm font-bold text-white">Settled</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs">
              <span className="text-[#C4B4C9]">Payment Collection</span>
              <span className="rounded-full bg-emerald-950/60 border border-[#20C878]/40 px-2 py-0.5 text-[10px] font-bold text-[#20C878]">
                {isCod ? 'Cash Collected (COD)' : 'Prepaid Online'}
              </span>
            </div>

            {/* Rate Customer (Optional) */}
            <div className="mt-6 border-t border-[#593650] pt-4">
              <p className="text-xs font-semibold text-[#C4B4C9] mb-2">Rate Delivery Experience (Optional)</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="text-2xl text-amber-400 hover:scale-110 transition-transform"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              full
              className="mt-6 bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 text-sm font-bold shadow-md"
              onClick={() => navigate(ROUTES.captainHome)}
            >
              Back to Home
            </Button>
          </div>
        ) : (
          <>
            {/* Real Interactive Delivery Map */}
            <DeliveryMap
              captain={
                lastCoords ||
                (delivery?.captain?.location
                  ? delivery.captain.location
                  : delivery?.captain?.latitude
                  ? { latitude: delivery.captain.latitude, longitude: delivery.captain.longitude }
                  : null)
              }
              shop={
                delivery?.shop?.location
                  ? {
                      name: delivery.shop.shopName || delivery.shopName,
                      address: delivery.shop.address || delivery.shopAddress,
                      latitude: delivery.shop.location.latitude,
                      longitude: delivery.shop.location.longitude,
                    }
                  : {
                      name: delivery?.shopName || 'Merchant Shop',
                      address: delivery?.shopAddress || '',
                      latitude: delivery?.shopLatitude,
                      longitude: delivery?.shopLongitude,
                    }
              }
              customer={
                delivery?.deliveryLocation
                  ? {
                      name: delivery.customerName || 'Customer',
                      address: delivery.deliveryAddress,
                      latitude: delivery.deliveryLocation.latitude,
                      longitude: delivery.deliveryLocation.longitude,
                    }
                  : {
                      name: delivery?.customerName || 'Customer',
                      address: delivery?.deliveryAddress || '',
                    }
              }
              route={routeInfo?.route || routeInfo}
              activeLeg={['picked_up', 'out_for_delivery', 'completed'].includes(status) ? 'shop_to_customer' : 'captain_to_shop'}
              orderStatus={status}
              distance={routeInfo?.distance}
              duration={routeInfo?.duration}
              isOutOfRange={routeInfo?.isOutOfRange}
              googleMapsUrl={routeInfo?.googleMapsUrl}
              gpsActive={gpsActive}
              gpsError={gpsError}
              title={
                status === 'ready' && !hasArrivedAtShop
                  ? 'Navigate to Merchant Store'
                  : status === 'ready' && hasArrivedAtShop
                  ? 'Arrived at Store • Ready for Pickup'
                  : status === 'picked_up'
                  ? 'Order Picked Up • Ready to Start Transit'
                  : 'Out for Delivery • Navigate to Customer Drop'
              }
            />

            {/* Milestone Steps Bar */}
            <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#94849A]">
                <div
                  className={`flex flex-col items-center gap-1 ${
                    hasArrivedAtShop || status !== 'ready' ? 'text-[#EC55C8] font-bold' : ''
                  }`}
                >
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                      hasArrivedAtShop || status !== 'ready'
                        ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white font-bold'
                        : 'bg-[#170F1B] border border-[#593650] text-[#94849A]'
                    }`}
                  >
                    1
                  </div>
                  <span>Arrive</span>
                </div>
                <div className={`h-0.5 flex-1 mx-1 -mt-4 ${hasArrivedAtShop || status !== 'ready' ? 'bg-[#EC55C8]' : 'bg-[#593650]'}`} />
                <div
                  className={`flex flex-col items-center gap-1 ${
                    status === 'picked_up' || status === 'out_for_delivery' || status === 'completed'
                      ? 'text-[#EC55C8] font-bold'
                      : ''
                  }`}
                >
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                      status === 'picked_up' || status === 'out_for_delivery' || status === 'completed'
                        ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white font-bold'
                        : 'bg-[#170F1B] border border-[#593650] text-[#94849A]'
                    }`}
                  >
                    2
                  </div>
                  <span>Pickup</span>
                </div>
                <div className={`h-0.5 flex-1 mx-1 -mt-4 ${status === 'picked_up' || status === 'out_for_delivery' || status === 'completed' ? 'bg-[#EC55C8]' : 'bg-[#593650]'}`} />
                <div
                  className={`flex flex-col items-center gap-1 ${
                    status === 'out_for_delivery' || status === 'completed'
                      ? 'text-[#EC55C8] font-bold'
                      : ''
                  }`}
                >
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                      status === 'out_for_delivery' || status === 'completed'
                        ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white font-bold'
                        : 'bg-[#170F1B] border border-[#593650] text-[#94849A]'
                    }`}
                  >
                    3
                  </div>
                  <span>On Way</span>
                </div>
                <div className={`h-0.5 flex-1 mx-1 -mt-4 ${status === 'completed' ? 'bg-[#20C878]' : 'bg-[#593650]'}`} />
                <div
                  className={`flex flex-col items-center gap-1 ${
                    status === 'completed' ? 'text-[#20C878] font-bold' : ''
                  }`}
                >
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                      status === 'completed'
                        ? 'bg-[#20C878] text-white font-bold'
                        : 'bg-[#170F1B] border border-[#593650] text-[#94849A]'
                    }`}
                  >
                    4
                  </div>
                  <span>Delivered</span>
                </div>
              </div>
            </div>

            {/* Merchant Store Pickup Card */}
            <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#B65DDA]" />
                  <h3 className="text-xs font-bold text-white">Merchant Pickup</h3>
                </div>
                <span className="rounded-full bg-purple-950/60 border border-[#B65DDA]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#B65DDA]">
                  Store
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-white text-sm">{delivery?.shopName || 'Shop'}</p>
                <p className="text-[#94849A] text-[11px]">{delivery?.shopAddress || 'Address on file'}</p>
              </div>

              {delivery?.shopContact && (
                <a
                  href={`tel:${delivery.shopContact}`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-[#593650] bg-[#170F1B] py-2.5 text-xs font-bold text-[#EC55C8] hover:bg-[#2B1B2D] transition"
                >
                  <Phone className="h-3.5 w-3.5 text-[#EC55C8]" />
                  <span>Call Shop ({delivery.shopContact})</span>
                </a>
              )}
            </div>

            {/* Customer Drop-off Card */}
            <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#EC55C8]" />
                  <h3 className="text-xs font-bold text-white">Customer Delivery</h3>
                </div>
                <span className="rounded-full bg-pink-950/60 border border-[#EC55C8]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#EC55C8]">
                  Destination
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-bold text-white text-sm">{delivery?.customerName || 'Customer'}</p>
                <p className="text-[#94849A] text-[11px]">{delivery?.deliveryAddress || 'Address on file'}</p>
              </div>

              {delivery?.customerPhone && (
                <a
                  href={`tel:${delivery.customerPhone}`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl border border-[#593650] bg-[#170F1B] py-2.5 text-xs font-bold text-[#EC55C8] hover:bg-[#2B1B2D] transition"
                >
                  <Phone className="h-3.5 w-3.5 text-[#EC55C8]" />
                  <span>Call Customer ({delivery.customerPhone})</span>
                </a>
              )}
            </div>

            {/* Order Items & Checklist Card */}
            <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#EC55C8]" />
                  <h3 className="text-xs font-bold text-white">Package Verification</h3>
                </div>
                <span className="text-[11px] text-[#94849A]">{delivery?.items?.length || 0} items</span>
              </div>

              <div className="divide-y divide-[#593650]/50 text-xs">
                {(delivery?.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleCheckItem(idx)}
                    className="flex cursor-pointer items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`grid h-5 w-5 place-items-center rounded-lg border transition ${
                          checkedItems[idx]
                            ? 'border-[#EC55C8] bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white'
                            : 'border-[#593650] bg-[#170F1B]'
                        }`}
                      >
                        {checkedItems[idx] && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="text-[10px] text-[#94849A]">
                          Qty: {item.quantity} {item.unit ? `• ${item.unit}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Payment Status Summary */}
              <div className="mt-3 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">Bill Total: {formatCurrency(delivery?.totalAmount ?? 0)}</p>
                  <p className="text-[10px] text-[#94849A] capitalize">
                    Method: {isCod ? 'Cash on Delivery (Collect Cash)' : 'Paid Online'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    isPaid
                      ? 'bg-emerald-950/60 border-[#20C878]/30 text-[#20C878]'
                      : 'bg-amber-950/60 border-amber-600/30 text-[#F5A623]'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Payment Pending'}
                </span>
              </div>
            </div>

            {/* Cash Collection Alert for COD */}
            {isCod && !isPaid && status === 'out_for_delivery' && (
              <div className="rounded-3xl border border-amber-500/50 bg-[#211522] p-4 shadow-sm text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span>Cash Collection Required</span>
                </div>
                <p className="text-[#C4B4C9] text-[11px] mb-3">
                  Please collect {formatCurrency(delivery.totalAmount)} from customer before handing over the parcel.
                </p>
                <Button
                  variant="primary"
                  full
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-2.5"
                  onClick={handleCollectPayment}
                >
                  {actionLoading ? 'Collecting…' : `Collect Cash: ${formatCurrency(delivery.totalAmount)}`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Bottom Action Progression Button */}
      {status !== 'completed' && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-[#593650] bg-[#170F1B]/95 p-4 backdrop-blur shadow-up">
          {status === 'ready' && !hasArrivedAtShop && (
            <Button
              variant="primary"
              full
              disabled={actionLoading}
              className="bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 text-sm font-bold shadow-md"
              onClick={handleConfirmArrival}
            >
              {actionLoading ? 'Confirming…' : 'I Have Arrived at Merchant Store'}
            </Button>
          )}

          {status === 'ready' && hasArrivedAtShop && (
            <Button
              variant="primary"
              full
              disabled={actionLoading}
              className="bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 text-sm font-bold shadow-md"
              onClick={handleConfirmPickup}
            >
              {actionLoading ? 'Confirming…' : 'Received from Merchant / Confirm Pickup'}
            </Button>
          )}

          {status === 'picked_up' && (
            <Button
              variant="primary"
              full
              disabled={actionLoading}
              className="bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 text-sm font-bold shadow-md"
              onClick={handleStartDelivery}
            >
              {actionLoading ? 'Starting…' : 'Start Delivery to Customer'}
            </Button>
          )}

          {status === 'out_for_delivery' && (
            <Button
              variant="primary"
              full
              disabled={actionLoading || (isCod && !isPaid)}
              className={`py-3.5 text-sm font-bold shadow-md ${
                isCod && !isPaid
                  ? 'bg-[#2B1B2D] text-[#94849A] border border-[#593650] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#20C878] to-emerald-600 hover:brightness-110 text-white'
              }`}
              onClick={handleCompleteDelivery}
            >
              {actionLoading
                ? 'Completing…'
                : isCod && !isPaid
                ? 'Collect Cash First to Complete'
                : 'Confirm Delivery'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
