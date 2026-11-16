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

    const socket = createSocket('captain')

    socket.on('new_delivery_available', () => {
      captainApi.availableDeliveries().then((offers) => {
        if (Array.isArray(offers)) setAvailableOffers(offers)
      }).catch(() => {})
    })

    socket.on('delivery_claimed', ({ orderId }) => {
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
    <div className="space-y-4 p-4 pb-20 text-white">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-[#593650] bg-gradient-to-br from-[#2B1B2D] via-[#3d183f] to-[#2B1B2D] p-5 text-white shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#170F1B] border border-[#593650] text-lg font-black text-[#EC55C8]">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#C4B4C9]">Welcome Back,</p>
              <h1 className="text-lg font-black tracking-tight text-white">{captain?.name || 'Partner Captain'}</h1>
            </div>
          </div>

          {/* Header Actions: Notifications + Online/Offline Toggle */}
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.captainNotifications}
              className="relative grid h-8 w-8 place-items-center rounded-full bg-[#170F1B] border border-[#593650] text-white hover:border-[#EC55C8] transition"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1 text-[9px] font-black text-white shadow-xs">
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
                  ? 'bg-[#20C878] text-white ring-4 ring-[#20C878]/30'
                  : 'bg-[#2B1B2D] border border-[#593650] text-[#94849A] hover:text-white'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>
          </div>
        </div>

        {/* Status announcement */}
        <div className="mt-4 rounded-2xl bg-[#170F1B] border border-[#593650] p-3 text-xs text-[#C4B4C9]">
          {isOnline ? (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#20C878]" />
              <span className="text-white">You are Online. Delivery missions will appear automatically when assigned.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#94849A]" />
              <span>You are currently Offline. Tap button above to start accepting missions.</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS Location Tracker Card */}
      <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-[#EC55C8]" />
            <h2 className="text-xs font-bold text-white">Captain GPS Location</h2>
          </div>
          <button
            type="button"
            onClick={handlePingLocation}
            disabled={locUpdating}
            className="flex items-center gap-1 text-[11px] font-bold text-[#EC55C8] hover:text-[#F58AD8]"
          >
            <RefreshCw className={`h-3 w-3 ${locUpdating ? 'animate-spin' : ''}`} />
            {locUpdating ? 'Pinging…' : 'Update GPS'}
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-[#170F1B] border border-[#593650] p-3 text-xs">
          <div className="flex items-center gap-2 text-[#94849A]">
            <MapPin className="h-4 w-4 shrink-0 text-[#EC55C8]" />
            <div>
              <p className="font-semibold text-white">
                {captain?.location?.latitude
                  ? `${captain.location.latitude.toFixed(4)}, ${captain.location.longitude.toFixed(4)}`
                  : 'Location not pinged yet'}
              </p>
              <p className="text-[10px] text-[#94849A]">
                Used for customer live route calculation and dispatch
              </p>
            </div>
          </div>
          {locSuccess && (
            <span className="rounded-lg bg-[#20C878]/20 border border-[#20C878]/40 px-2 py-1 text-[10px] font-bold text-[#20C878]">
              {locSuccess}
            </span>
          )}
          {locError && (
            <span className="rounded-lg bg-danger/20 border border-danger/40 px-2 py-1 text-[10px] font-bold text-danger">
              {locError}
            </span>
          )}
        </div>
      </div>

      {/* Service Coverage Localities Card */}
      <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#EC55C8]" />
            <h2 className="text-xs font-bold text-white">Active Service Coverage</h2>
          </div>
          <Link
            to={ROUTES.captainProfile}
            className="text-[11px] font-bold text-[#EC55C8] hover:text-[#F58AD8]"
          >
            {serviceAreas.length > 0 ? 'Edit Localities' : 'Select Areas'}
          </Link>
        </div>

        {serviceAreas.length === 0 ? (
          <div className="mt-2.5 rounded-2xl border border-dashed border-[#593650] bg-[#170F1B] p-3 text-xs text-[#94849A] flex items-center justify-between">
            <span className="text-[11px]">No delivery areas configured. Set localities to get offers.</span>
            <Link
              to={ROUTES.captainProfile}
              className="rounded-xl bg-[#2B1B2D] border border-[#593650] px-2.5 py-1 text-[11px] font-bold text-[#F58AD8] shrink-0 ml-2"
            >
              Configure
            </Link>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {serviceAreas.map((sa) => (
              <span
                key={sa.localityId || sa.id}
                className="inline-flex items-center gap-1 rounded-xl bg-[#2B1B2D] border border-[#593650] px-2.5 py-0.5 text-[11px] font-semibold text-[#F58AD8]"
              >
                <MapPin className="h-2.5 w-2.5 text-[#EC55C8] shrink-0" />
                {sa.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Available Delivery Offers Section */}
      <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#EC55C8]" />
            <h2 className="text-sm font-bold text-white">Incoming Delivery Offers</h2>
          </div>
          <span className="rounded-full bg-[#2B1B2D] border border-[#593650] px-2.5 py-0.5 text-[10px] font-bold text-[#F58AD8]">
            {availableOffers.length} {availableOffers.length === 1 ? 'Available' : 'Available'}
          </span>
        </div>

        {offerError && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-danger/15 border border-danger/30 p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <span>{offerError}</span>
          </div>
        )}

        {availableOffers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#593650] bg-[#170F1B] p-4 text-center text-xs text-[#94849A]">
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
                  className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 shadow-sm hover:border-[#EC55C8]/50 transition"
                >
                  <div className="flex items-center justify-between border-b border-[#593650] pb-2">
                    <span className="font-mono text-xs font-black text-[#EC55C8]">
                      ORDER #{String(offerId).slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-white">
                      {formatCurrency(offer.totalAmount || 0)}
                    </span>
                  </div>

                  {/* Route & Locality Summary */}
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="grid h-4 w-4 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[9px] font-bold text-[#F58AD8] shrink-0">
                        P
                      </div>
                      <p className="truncate text-white font-semibold">
                        {offer.shopName}
                        {offer.pickupLocality ? ` (${offer.pickupLocality})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="grid h-4 w-4 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[9px] font-bold text-[#EC55C8] shrink-0">
                        D
                      </div>
                      <p className="truncate text-white font-semibold">
                        Drop: {offer.deliveryLocality || 'Customer Destination'}
                        {offer.distanceText ? ` • ${offer.distanceText}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#94849A] border-t border-[#593650] pt-2">
                    <span>{offer.itemsCount || 1} items</span>
                    <span className="font-semibold text-[#F58AD8] capitalize">
                      {offer.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                    </span>
                  </div>

                  <Button
                    full
                    disabled={isClaiming || !isOnline}
                    onClick={() => handleAcceptOffer(offerId)}
                    className="mt-3 text-xs font-bold py-2.5"
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
      <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#EC55C8]" />
            <h2 className="text-sm font-bold text-white">Active Delivery Mission</h2>
          </div>
          {currentDelivery && (
            <span className="rounded-full bg-[#2B1B2D] border border-[#593650] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F58AD8]">
              {currentDelivery.orderStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-[#94849A]">
            Checking active missions…
          </div>
        ) : currentDelivery ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4">
              <div className="flex items-center justify-between border-b border-[#593650] pb-2.5">
                <span className="text-xs font-bold text-[#EC55C8]">
                  Order #{String(currentDelivery.orderId || currentDelivery.id).slice(-6).toUpperCase()}
                </span>
                <span className="text-xs font-extrabold text-white">
                  {formatCurrency(currentDelivery.totalAmount)}
                </span>
              </div>

              {/* Pickup & Drop Points */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[9px] font-bold text-[#F58AD8]">
                    P
                  </div>
                  <div>
                    <p className="font-bold text-white">{currentDelivery.shopName}</p>
                    <p className="text-[11px] text-[#94849A]">{currentDelivery.shopAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[9px] font-bold text-[#EC55C8]">
                    D
                  </div>
                  <div>
                    <p className="font-bold text-white">{currentDelivery.customerName}</p>
                    <p className="text-[11px] text-[#94849A]">{currentDelivery.deliveryAddress}</p>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#94849A] border-t border-[#593650] pt-2">
                <span>{currentDelivery.items?.length || 1} items to deliver</span>
                <span className="font-semibold text-[#F58AD8] capitalize">
                  Payment: {currentDelivery.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                </span>
              </div>
            </div>

            <Button
              full
              className="py-3 text-xs"
              onClick={() => navigate(ROUTES.captainDelivery(currentDelivery.orderId || currentDelivery.id))}
            >
              Open Delivery Mission
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#170F1B] border border-[#593650] text-[#94849A] mb-2">
              <Bike className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-white">No Active Delivery</p>
            <p className="mt-1 max-w-xs text-[11px] text-[#94849A]">
              {isOnline
                ? 'Stay online. When a customer order is ready for pickup, your mission details will appear here.'
                : 'Turn your status to ONLINE to start receiving delivery assignments.'}
            </p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 text-xs font-bold text-[#EC55C8] hover:text-[#F58AD8] flex items-center gap-1"
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
          className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card hover:border-[#EC55C8]/50 transition"
        >
          <div className="flex items-center justify-between text-[#94849A]">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-[#20C878]" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{historyCount}</p>
          <p className="text-[10px] text-[#94849A] mt-1">Deliveries logged</p>
        </Link>

        <Link
          to={ROUTES.captainEarnings}
          className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card hover:border-[#EC55C8]/50 transition"
        >
          <div className="flex items-center justify-between text-[#94849A]">
            <span className="text-xs font-medium">Earnings</span>
            <TrendingUp className="h-4 w-4 text-[#EC55C8]" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">
            {formatCurrency(historyCount * 45)}
          </p>
          <p className="text-[10px] text-[#F58AD8] font-semibold mt-1">View Payouts →</p>
        </Link>
      </div>

      {/* Vehicle Overview card */}
      <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Bike className="h-4 w-4 text-[#EC55C8]" />
            <div>
              <p className="font-bold text-white">
                {captain?.vehicle?.model || 'Partner Vehicle'} ({captain?.vehicle?.type || 'Bike'})
              </p>
              <p className="text-[10px] text-[#94849A] font-mono">{captain?.vehicle?.number || 'MH02AB1234'}</p>
            </div>
          </div>
          <Link
            to={ROUTES.captainProfile}
            className="text-[11px] font-bold text-[#EC55C8] hover:text-[#F58AD8]"
          >
            Manage Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
