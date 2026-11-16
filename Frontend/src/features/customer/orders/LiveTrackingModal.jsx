import { useEffect, useState } from 'react'
import { Phone, MessageSquare, MapPin, Bike, Navigation, Clock, ShieldCheck, X } from 'lucide-react'
import { createSocket } from '../../../services/socket'
import { mapsApi } from '../../../services/api'
import { formatDistance, formatDuration } from '../../../utils/geo'
import Button from '../../../components/ui/Button'
import DeliveryMap from '../../../components/shared/DeliveryMap'

export default function LiveTrackingModal({ order, open, onClose }) {
  const [coords, setCoords] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketError, setSocketError] = useState(null)
  const [currentStatus, setCurrentStatus] = useState(order?.status || 'ready')

  const loadRoute = () => {
    if (!order?.id) return
    mapsApi
      .deliveryRoute(order.id)
      .then((res) => {
        const d = res?.data || res
        if (d) {
          setRouteData(d)
          if (d.orderStatus) {
            setCurrentStatus(d.orderStatus)
          }
          if (d.captain?.latitude && d.captain?.longitude) {
            setCoords({
              latitude: d.captain.latitude,
              longitude: d.captain.longitude,
            })
            if (d.captain.locationUpdatedAt) {
              setUpdatedAt(d.captain.locationUpdatedAt)
            }
          }
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!open || !order?.id) return

    setCurrentStatus(order.status || 'ready')
    loadRoute()

    const socket = createSocket('customer')

    socket.on('connect', () => {
      setSocketConnected(true)
      setSocketError(null)
      socket.emit('join_order_tracking', { orderId: order.id })
    })

    socket.on('captain_location_initial', (payload) => {
      if (payload?.captain) {
        setCoords(payload.captain)
        setUpdatedAt(payload.updatedAt)
      }
    })

    socket.on('captain_location_updated', (payload) => {
      if (payload?.captain) {
        setCoords(payload.captain)
        setUpdatedAt(payload.updatedAt)
      }
    })

    socket.on('order_status_updated', (payload) => {
      if (payload?.orderStatus) {
        setCurrentStatus(payload.orderStatus)
      }
      loadRoute()
    })

    socket.on('tracking_error', (err) => {
      setSocketError(err?.message || 'Live tracking not active yet')
    })

    socket.on('connect_error', () => {
      setSocketConnected(false)
      setSocketError('Unable to connect to live tracking service')
    })

    return () => {
      socket.emit('leave_order_tracking', { orderId: order.id })
      socket.disconnect()
    }
  }, [open, order?.id])

  if (!open) return null

  const status = currentStatus || order.status || 'ready'
  const isOutForDelivery = status === 'out_for_delivery'
  const isPickedUp = status === 'picked_up'
  const isDelivered = status === 'completed'

  const captainName = routeData?.captain?.name || order.captainName || 'NearBuy Delivery Partner'
  const captainPhone = routeData?.captain?.phone || order.captainPhone || null
  const vehicleText = routeData?.captain?.vehicle?.model
    ? `${routeData.captain.vehicle.model} (${routeData.captain.vehicle.number || 'Bike'})`
    : order.captainVehicle || 'Verified Captain'

  const distanceText = !routeData?.isOutOfRange ? formatDistance(routeData?.distance || routeData?.route?.distance) : ''
  const durationText = !routeData?.isOutOfRange ? formatDuration(routeData?.duration || routeData?.route?.duration) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#593650] bg-[#211522] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#593650] bg-[#170F1B]/95 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketConnected ? 'bg-[#20C878]' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${socketConnected ? 'bg-[#20C878]' : 'bg-amber-500'}`}></span>
            </span>
            <h2 className="text-base font-extrabold text-white">Live Delivery Tracking</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[#94849A] hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Captain Contact Card matching Storyboard Screen 13 */}
          <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#EC55C8]/20 border-2 border-[#EC55C8] overflow-hidden grid place-items-center text-[#EC55C8] font-bold text-lg">
                <Bike className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">{captainName}</h3>
                <p className="text-xs text-[#94849A] font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#20C878]" /> {vehicleText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {captainPhone ? (
                <a
                  href={`tel:${captainPhone}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-emerald-950/60 text-[#20C878] border border-[#20C878]/40 shadow-sm active:scale-95 transition"
                  aria-label="Call delivery partner"
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => alert(`Direct delivery message: Order #${String(order.id).slice(-6)} is on the way!`)}
                className="grid h-10 w-10 place-items-center rounded-full bg-purple-950/60 text-[#B65DDA] border border-[#B65DDA]/40 shadow-sm active:scale-95 transition"
                aria-label="Message partner"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Real Interactive Delivery Map */}
          <DeliveryMap
            captain={
              coords
                ? { ...coords, name: captainName, phone: captainPhone, vehicle: routeData?.captain?.vehicle }
                : (routeData?.captain?.latitude ? { latitude: routeData.captain.latitude, longitude: routeData.captain.longitude, name: captainName } : null)
            }
            shop={
              routeData?.shop?.location
                ? { ...routeData.shop.location, name: routeData.shop.name, address: routeData.shop.address }
                : routeData?.shop
                ? { name: routeData.shop.name || order.shopName, address: routeData.shop.address || order.shopAddress, latitude: routeData.shop.latitude, longitude: routeData.shop.longitude }
                : { name: order.shopName, address: order.shopAddress }
            }
            customer={
              routeData?.deliveryLocation
                ? { ...routeData.deliveryLocation, name: order.customerName, address: order.deliveryAddress }
                : { name: order.customerName, address: order.deliveryAddress }
            }
            route={routeData?.route}
            activeLeg={routeData?.activeLeg || (isOutForDelivery || isPickedUp ? 'shop_to_customer' : 'captain_to_shop')}
            orderStatus={status}
            distance={routeData?.distance}
            duration={routeData?.duration}
            isOutOfRange={routeData?.isOutOfRange}
            googleMapsUrl={routeData?.googleMapsUrl}
            gpsActive={socketConnected && !!coords}
            gpsError={socketError}
            height="h-64 sm:h-72"
            title={
              isOutForDelivery
                ? 'Out for Delivery • Route to Your Home'
                : isPickedUp
                ? 'Order Picked Up • On the Way'
                : 'Captain on Route to Merchant Store'
            }
          />

          {/* Delivery Milestone Stepper matching Storyboard Screen 13 */}
          <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 shadow-card">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94849A] mb-3">Delivery Status</h4>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="space-y-1">
                <div className={`h-2 rounded-full ${status === 'ready' || isPickedUp || isOutForDelivery || isDelivered ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA]' : 'bg-[#593650]'}`} />
                <span className="text-[10px] font-bold text-white">Heading to Shop</span>
              </div>
              <div className="space-y-1">
                <div className={`h-2 rounded-full ${isPickedUp || isOutForDelivery || isDelivered ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA]' : 'bg-[#593650]'}`} />
                <span className="text-[10px] font-bold text-white">Picked Up</span>
              </div>
              <div className="space-y-1">
                <div className={`h-2 rounded-full ${isOutForDelivery || isDelivered ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA]' : 'bg-[#593650]'}`} />
                <span className="text-[10px] font-bold text-white">On the Way</span>
              </div>
              <div className="space-y-1">
                <div className={`h-2 rounded-full ${isDelivered ? 'bg-[#20C878]' : 'bg-[#593650]'}`} />
                <span className="text-[10px] font-bold text-white">Delivered</span>
              </div>
            </div>

            {coords ? (
              <div className="mt-4 pt-3 border-t border-[#593650]/60 text-[11px] text-[#94849A] flex items-center justify-between">
                <span>GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span>
                {updatedAt && <span>Updated {new Date(updatedAt).toLocaleTimeString()}</span>}
              </div>
            ) : !socketError ? (
              <div className="mt-4 pt-3 border-t border-[#593650]/60 text-[11px] text-[#94849A] text-center">
                Live GPS coordinates will stream automatically as Captain moves.
              </div>
            ) : null}

            {socketError && (
              <p className="mt-3 rounded-xl bg-amber-950/60 border border-amber-800/80 p-2 text-center text-xs text-amber-300 font-medium">
                {socketError}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[#593650] bg-[#170F1B]">
          <Button full variant="outline" onClick={onClose} className="font-bold text-xs">
            Close Tracking
          </Button>
        </div>
      </div>
    </div>
  )
}
