import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  MapPin,
  Package,
  TrendingUp,
  Power,
  Navigation,
  ArrowRight,
  Clock,
  Phone,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Store,
  Bell,
} from 'lucide-react'
import { useCaptainAuth } from '../../context/CaptainAuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { captainApi } from '../../services/api'
import { ROUTES } from '../../config/routes'
import { formatCurrency } from '../../utils/format'
import { createSocket } from '../../services/socket'
import Button from '../../components/ui/Button'

export default function CaptainHomePage() {
  const navigate = useNavigate()
  const { captain, updateAvailability, updateLocation } = useCaptainAuth()
  const { unread } = useNotifications()

  const [currentDelivery, setCurrentDelivery] = useState(null)
  const [availableOffers, setAvailableOffers] = useState([])
  const [serviceAreas, setServiceAreas] = useState([])
  const [historyCount, setHistoryCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offersLoading, setOffersLoading] = useState(false)
  const [acceptingId, setAcceptingId] = useState(null)
  const [offerError, setOfferError] = useState('')
  const [locUpdating, setLocUpdating] = useState(false)
  const [locSuccess, setLocSuccess] = useState('')
  const [toggleLoading, setToggleLoading] = useState(false)

  const isOnline = captain?.availabilityStatus === 'available' || captain?.availabilityStatus === 'busy'

  const loadData = async () => {
    try {
      const [curRes, histRes, offersRes, areasRes] = await Promise.all([
        captainApi.currentDelivery().catch(() => null),
        captainApi.deliveryHistory().catch(() => []),
        captainApi.availableDeliveries().catch(() => []),
        captainApi.serviceAreas().catch(() => null),
      ])
      setCurrentDelivery(curRes)
      setHistoryCount(Array.isArray(histRes) ? histRes.length : 0)
      setAvailableOffers(Array.isArray(offersRes) ? offersRes : [])
      if (Array.isArray(areasRes?.serviceAreas)) {
        setServiceAreas(areasRes.serviceAreas)
      } else if (Array.isArray(captain?.serviceAreas)) {
        setServiceAreas(captain.serviceAreas)
      }
    } finally {
      setLoading(false)
      setOffersLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Real-time Socket.IO listeners for new dispatch offers and rival claims
    const socket = createSocket('captain')

    socket.on('new_delivery_available', (payload) => {
      // Refresh available offers dynamically without manual reload
      captainApi.availableDeliveries().then((offers) => {
        if (Array.isArray(offers)) setAvailableOffers(offers)
      }).catch(() => {})
    })

    socket.on('delivery_claimed', ({ orderId }) => {
      // Remove offer immediately when claimed by another captain
      setAvailableOffers((prev) =>
        prev.filter((o) => String(o.id || o.orderId) !== String(orderId))
      )
    })

    socket.on('order_status_updated', () => {
      loadData()
    })

    return () => {
      socket.disconnect()
    }
  }, [captain?.serviceAreas ? captain.serviceAreas.map(a => a.localityId || a.id || a.name).join(',') : ''])

  const handleAcceptOffer = async (orderId) => {
    setAcceptingId(orderId)
    setOfferError('')
    try {
      await captainApi.acceptDelivery(orderId)
      await loadData()
      navigate(ROUTES.captainDelivery(orderId))
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Unable to accept this delivery'
      setOfferError(msg)
      // Reload offers to clear stale assignments
      captainApi.availableDeliveries().then((offers) => {
        if (Array.isArray(offers)) setAvailableOffers(offers)
      }).catch(() => {})
    } finally {
      setAcceptingId(null)
    }
  }

  const handleToggleOnline = async () => {
    setToggleLoading(true)
    try {
      const nextStatus = isOnline ? 'offline' : 'available'
      await updateAvailability(nextStatus)
    } catch (err) {
      console.error('Failed to toggle status:', err)
    } finally {
      setToggleLoading(false)
    }
  }

  const [locError, setLocError] = useState('')

  const handlePingLocation = () => {
    setLocUpdating(true)
    setLocSuccess('')
    setLocError('')
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await updateLocation(position.coords.latitude, position.coords.longitude)
            setLocSuccess('GPS location updated!')
            setTimeout(() => setLocSuccess(''), 4000)
          } catch (err) {
            console.error('Location update failed:', err)
            setLocError('Failed to save GPS location.')
          } finally {
            setLocUpdating(false)
          }
        },
        (err) => {
          setLocUpdating(false)
          if (err.code === 1) {
            setLocError('GPS permission denied. Please allow location access.')
          } else {
            setLocError('GPS signal unavailable. Please check device location.')
          }
          setTimeout(() => setLocError(''), 5000)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    } else {
      setLocUpdating(false)
      setLocError('Geolocation is not supported by your browser.')
    }
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-pink-600 to-purple-900 p-5 text-white shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-lg font-black backdrop-blur">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-brand-100">Welcome Back,</p>
              <h1 className="text-lg font-black tracking-tight">{captain?.name || 'Partner Captain'}</h1>
            </div>
          </div>

          {/* Header Actions: Notifications + Online/Offline Toggle */}
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.captainNotifications}
              className="relative grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30 transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-pink-500 px-1 text-[9px] font-black text-white shadow-xs">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={handleToggleOnline}
              disabled={toggleLoading}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-md transition-all ${
                isOnline
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-400/30'
                  : 'bg-white/20 text-white backdrop-blur hover:bg-white/30'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* Status announcement */}
        <div className="mt-4 rounded-2xl bg-white/10 p-3 text-xs text-white/90 backdrop-blur">
          {isOnline ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
              <span>You are Online. Delivery missions will appear automatically when assigned.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span>You are currently Offline. Tap button above to start accepting missions.</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS Location Tracker Card */}
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-brand-600" />
            <h2 className="text-xs font-bold text-ink">Captain GPS Location</h2>
          </div>
          <button
            type="button"
            onClick={handlePingLocation}
            disabled={locUpdating}
            className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
          >
            <RefreshCw className={`h-3 w-3 ${locUpdating ? 'animate-spin' : ''}`} />
            {locUpdating ? 'Pinging…' : 'Update GPS'}
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-canvas p-3 text-xs">
          <div className="flex items-center gap-2 text-mute">
            <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">
                {captain?.location?.latitude
                  ? `${captain.location.latitude.toFixed(4)}, ${captain.location.longitude.toFixed(4)}`
                  : 'Location not pinged yet'}
              </p>
              <p className="text-[10px] text-mute">
                Used for customer live route calculation and dispatch
              </p>
            </div>
          </div>
          {locSuccess && (
            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
              {locSuccess}
            </span>
          )}
          {locError && (
            <span className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
              {locError}
            </span>
          )}
        </div>
      </div>

      {/* Service Coverage Localities Card */}
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <h2 className="text-xs font-bold text-ink">Active Service Coverage</h2>
          </div>
          <Link
            to={ROUTES.captainProfile}
            className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
          >
            {serviceAreas.length > 0 ? 'Edit Localities' : 'Select Areas'}
          </Link>
        </div>

        {serviceAreas.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center justify-between">
            <span className="text-[11px]">No delivery areas configured. Set localities to get offers.</span>
            <Link
              to={ROUTES.captainProfile}
              className="rounded-xl bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs shrink-0 ml-2"
            >
              Configure
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {serviceAreas.map((sa) => (
              <span
                key={sa.localityId || sa.id}
                className="inline-flex items-center gap-1 rounded-xl bg-brand-50 border border-brand-100 px-2.5 py-0.5 text-[11px] font-semibold text-brand-900"
              >
                <MapPin className="h-2.5 w-2.5 text-brand-600 shrink-0" />
                {sa.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Available Delivery Offers Section */}
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-bold text-ink">Incoming Delivery Offers</h2>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
            {availableOffers.length} {availableOffers.length === 1 ? 'Available' : 'Available'}
          </span>
        </div>

        {offerError && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{offerError}</span>
          </div>
        )}

        {availableOffers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-canvas p-4 text-center text-xs text-mute">
            {isOnline
              ? 'No open delivery offers in your areas right now. New missions will appear here automatically.'
              : 'Switch duty status to ONLINE to receive incoming delivery dispatch offers.'}
          </div>
        ) : (
          <div className="space-y-3">
            {availableOffers.map((offer) => {
              const offerId = offer.orderId || offer.id
              const isClaiming = acceptingId === offerId
              return (
                <div
                  key={offerId}
                  className="rounded-2xl border border-brand-200/80 bg-brand-50/30 p-4 shadow-sm hover:border-brand-300 transition"
                >
                  <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                    <span className="font-mono text-xs font-black text-brand-900">
                      ORDER #{String(offerId).slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-ink">
                      {formatCurrency(offer.totalAmount || 0)}
                    </span>
                  </div>

                  {/* Route & Locality Summary */}
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="grid h-4 w-4 place-items-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-700 shrink-0">
                        P
                      </div>
                      <p className="truncate text-ink font-semibold">
                        {offer.shopName}
                        {offer.pickupLocality ? ` (${offer.pickupLocality})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="grid h-4 w-4 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700 shrink-0">
                        D
                      </div>
                      <p className="truncate text-ink font-semibold">
                        Drop: {offer.deliveryLocality || 'Customer Destination'}
                        {offer.distanceText ? ` • ${offer.distanceText}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-mute border-t border-brand-100 pt-2">
                    <span>{offer.itemsCount || 1} items</span>
                    <span className="font-semibold text-brand-700 capitalize">
                      {offer.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    full
                    disabled={isClaiming || !isOnline}
                    onClick={() => handleAcceptOffer(offerId)}
                    className="mt-3 bg-gradient-to-r from-brand-600 to-pink-600 py-2.5 text-xs font-bold shadow-md"
                  >
                    {isClaiming ? 'Claiming Mission…' : 'Accept Delivery Mission'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Delivery Mission Card */}
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-brand-600" />
            <h2 className="text-sm font-bold text-ink">Active Delivery Mission</h2>
          </div>
          {currentDelivery && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
              {currentDelivery.orderStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-mute">
            Checking active missions…
          </div>
        ) : currentDelivery ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="flex items-center justify-between border-b border-brand-100 pb-2.5">
                <span className="text-xs font-bold text-brand-900">
                  Order #{String(currentDelivery.orderId || currentDelivery.id).slice(-6).toUpperCase()}
                </span>
                <span className="text-xs font-extrabold text-ink">
                  {formatCurrency(currentDelivery.totalAmount)}
                </span>
              </div>

              {/* Pickup & Drop Points */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-purple-100 text-[9px] font-bold text-purple-700">
                    P
                  </div>
                  <div>
                    <p className="font-bold text-ink">{currentDelivery.shopName}</p>
                    <p className="text-[11px] text-mute">{currentDelivery.shopAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                    D
                  </div>
                  <div>
                    <p className="font-bold text-ink">{currentDelivery.customerName}</p>
                    <p className="text-[11px] text-mute">{currentDelivery.deliveryAddress}</p>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-mute border-t border-brand-100 pt-2">
                <span>{currentDelivery.items?.length || 1} items to deliver</span>
                <span className="font-semibold text-brand-700 capitalize">
                  Payment: {currentDelivery.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              full
              className="bg-gradient-to-r from-brand-600 to-pink-600 py-3"
              onClick={() => navigate(ROUTES.captainDelivery(currentDelivery.orderId || currentDelivery.id))}
            >
              Open Delivery Mission
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <Bike className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-ink">No Active Delivery</p>
            <p className="mt-1 max-w-xs text-[11px] text-mute">
              {isOnline
                ? 'Stay online. When a customer order is ready for pickup, your mission details will appear here.'
                : 'Turn your status to ONLINE to start receiving delivery assignments.'}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh Status
            </button>
          </div>
        )}
      </div>

      {/* Quick Partner Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={ROUTES.captainHistory}
          className="rounded-3xl bg-white p-4 shadow-card hover:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between text-mute">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{historyCount}</p>
          <p className="text-[10px] text-mute mt-1">Deliveries logged</p>
        </Link>

        <Link
          to={ROUTES.captainEarnings}
          className="rounded-3xl bg-white p-4 shadow-card hover:bg-slate-50 transition"
        >
          <div className="flex items-center justify-between text-mute">
            <span className="text-xs font-medium">Earnings</span>
            <TrendingUp className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">
            {formatCurrency(historyCount * 45)}
          </p>
          <p className="text-[10px] text-brand-600 font-semibold mt-1">View Payouts →</p>
        </Link>
      </div>

      {/* Vehicle Overview card */}
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-brand-600" />
            <div>
              <p className="font-bold text-ink">
                {captain?.vehicle?.model || 'Partner Vehicle'} ({captain?.vehicle?.type || 'Bike'})
              </p>
              <p className="text-[10px] text-mute font-mono">{captain?.vehicle?.number || 'MH02AB1234'}</p>
            </div>
          </div>
          <Link
            to={ROUTES.captainProfile}
            className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
          >
            Manage Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
