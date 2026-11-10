import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Navigation,
  ExternalLink,
  LocateFixed,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  MapPin,
  Bike,
  Store,
} from 'lucide-react'
import { formatDistance, formatDuration, isValidCoordinate } from '../../utils/geo'

// Helper to construct custom Leaflet DivIcons
function createMarkerIcon({ type, label, pulsing = false }) {
  let bgClass = 'bg-brand-600 text-white shadow-brand-500/30'
  let iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'

  if (type === 'captain') {
    bgClass = 'bg-pink-600 text-white shadow-pink-500/40'
    iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.5 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm13 0a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM9 13.5l3-6h4.5M16 11l2-3.5h3"/></svg>'
  } else if (type === 'shop') {
    bgClass = 'bg-purple-700 text-white shadow-purple-500/40'
    iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18l-2 9H5L3 3zm2 9v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>'
  } else if (type === 'customer') {
    bgClass = 'bg-emerald-600 text-white shadow-emerald-500/40'
    iconSvg = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'
  }

  const pulseRing = pulsing
    ? `<span class="absolute -inset-1 rounded-full animate-ping opacity-75 ${
        type === 'captain' ? 'bg-pink-400' : 'bg-brand-400'
      }"></span>`
    : ''

  const labelHtml = label
    ? `<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm pointer-events-none">${label}</div>`
    : ''

  return L.divIcon({
    className: 'nearbuy-custom-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${pulseRing}
        <div class="relative grid h-8 w-8 place-items-center rounded-full shadow-lg ${bgClass} ring-2 ring-white">
          ${iconSvg}
        </div>
        ${labelHtml}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

export default function DeliveryMap({
  captain = null,
  shop = null,
  customer = null,
  route = null,
  activeLeg = 'captain_to_shop', // 'captain_to_shop' | 'shop_to_customer'
  orderStatus = 'ready',
  distance = null,
  duration = null,
  isOutOfRange = false,
  googleMapsUrl = null,
  gpsActive = false,
  gpsError = null,
  height = 'h-64 sm:h-72',
  className = '',
  title = '',
  showGoogleNavButton = true,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  // Extract safe coordinates
  const captainLat = captain?.latitude ?? captain?.location?.latitude
  const captainLng = captain?.longitude ?? captain?.location?.longitude
  const hasCaptain = isValidCoordinate(captainLat, captainLng)

  const shopLat = shop?.latitude ?? shop?.location?.latitude
  const shopLng = shop?.longitude ?? shop?.location?.longitude
  const hasShop = isValidCoordinate(shopLat, shopLng)

  const customerLat = customer?.latitude ?? customer?.location?.latitude
  const customerLng = customer?.longitude ?? customer?.location?.longitude
  const hasCustomer = isValidCoordinate(customerLat, customerLng)

  // Compute active navigation destination and origin for Google Maps
  const navUrl = useMemo(() => {
    if (googleMapsUrl) return googleMapsUrl

    let originStr = ''
    let destStr = ''

    if (activeLeg === 'captain_to_shop') {
      if (hasCaptain) originStr = `${captainLat},${captainLng}`
      if (hasShop) {
        destStr = `${shopLat},${shopLng}`
      } else if (shop?.address) {
        destStr = encodeURIComponent(shop.address)
      }
    } else {
      // shop_to_customer
      if (hasCaptain) {
        originStr = `${captainLat},${captainLng}`
      } else if (hasShop) {
        originStr = `${shopLat},${shopLng}`
      }
      if (hasCustomer) {
        destStr = `${customerLat},${customerLng}`
      } else if (customer?.address) {
        destStr = encodeURIComponent(customer.address)
      }
    }

    if (destStr) {
      if (originStr) {
        return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`
      }
      return `https://www.google.com/maps/search/?api=1&query=${destStr}`
    }
    return null
  }, [
    googleMapsUrl,
    activeLeg,
    captainLat,
    captainLng,
    hasCaptain,
    shopLat,
    shopLng,
    hasShop,
    shop?.address,
    customerLat,
    customerLng,
    hasCustomer,
    customer?.address,
  ])

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    // Default center to Hyderabad (Murad Nagar hub)
    const initialCenter = [17.3824, 78.4418]
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    // OpenStreetMap high quality cartographic tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    // Attribution in compact subtle corner
    L.control
      .attribution({ position: 'bottomright', prefix: false })
      .addAttribution('<span class="text-[9px] text-slate-400">© OpenStreetMap</span>')
      .addTo(map)

    // Layers for markers and polylines
    const markersLayer = L.layerGroup().addTo(map)
    const routeLayer = L.layerGroup().addTo(map)

    mapInstanceRef.current = map
    markersLayerRef.current = markersLayer
    routeLayerRef.current = routeLayer

    setMapReady(true)

    // Handle container resize automatically
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapInstanceRef.current = null
      markersLayerRef.current = null
      routeLayerRef.current = null
      setMapReady(false)
    }
  }, [])

  // Update Markers and Route on data changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersLayer = markersLayerRef.current
    const routeLayer = routeLayerRef.current
    if (!map || !markersLayer || !routeLayer) return

    markersLayer.clearLayers()
    routeLayer.clearLayers()

    const bounds = []

    // 1. Captain Marker
    if (hasCaptain) {
      const captainLatLng = [captainLat, captainLng]
      bounds.push(captainLatLng)
      const captainMarker = L.marker(captainLatLng, {
        icon: createMarkerIcon({
          type: 'captain',
          label: captain?.name ? `Captain: ${captain.name.split(' ')[0]}` : 'Captain',
          pulsing: gpsActive || orderStatus === 'out_for_delivery',
        }),
        zIndexOffset: 1000,
      })

      const popupHtml = `
        <div class="text-xs p-1">
          <p class="font-extrabold text-slate-900">${captain?.name || 'Delivery Captain'}</p>
          <p class="text-[10px] text-slate-500">${captain?.vehicle?.model || 'Delivery Bike'} ${captain?.vehicle?.number || ''}</p>
          ${captainLat ? `<p class="text-[9px] text-slate-400 mt-0.5">GPS: ${captainLat.toFixed(4)}, ${captainLng.toFixed(4)}</p>` : ''}
        </div>
      `
      captainMarker.bindPopup(popupHtml)
      captainMarker.addTo(markersLayer)
    }

    // 2. Shop Marker
    if (hasShop) {
      const shopLatLng = [shopLat, shopLng]
      bounds.push(shopLatLng)
      const shopMarker = L.marker(shopLatLng, {
        icon: createMarkerIcon({
          type: 'shop',
          label: shop?.name || 'Shop',
        }),
        zIndexOffset: 800,
      })
      const shopPopup = `
        <div class="text-xs p-1">
          <p class="font-extrabold text-purple-950">${shop?.name || 'Merchant Shop'}</p>
          <p class="text-[10px] text-slate-600">${shop?.address || 'Pickup Point'}</p>
        </div>
      `
      shopMarker.bindPopup(shopPopup)
      shopMarker.addTo(markersLayer)
    }

    // 3. Customer Destination Marker
    if (hasCustomer) {
      const custLatLng = [customerLat, customerLng]
      bounds.push(custLatLng)
      const custMarker = L.marker(custLatLng, {
        icon: createMarkerIcon({
          type: 'customer',
          label: customer?.name ? `Drop: ${customer.name.split(' ')[0]}` : 'Customer Drop',
        }),
        zIndexOffset: 900,
      })
      const custPopup = `
        <div class="text-xs p-1">
          <p class="font-extrabold text-emerald-950">${customer?.name || 'Customer'}</p>
          <p class="text-[10px] text-slate-600">${customer?.address || 'Delivery Address'}</p>
        </div>
      `
      custMarker.bindPopup(custPopup)
      custMarker.addTo(markersLayer)
    }

    // 4. Real Route Polyline
    let routeCoords = []
    if (route?.coordinates && Array.isArray(route.coordinates) && route.coordinates.length > 0) {
      routeCoords = route.coordinates
    } else if (route?.route?.coordinates && Array.isArray(route.route.coordinates)) {
      routeCoords = route.route.coordinates
    }

    // If explicit coordinates exist from OSRM or Google Maps
    if (routeCoords.length > 0) {
      const polylineLatLngs = routeCoords.map((pt) => [pt[0], pt[1]])
      polylineLatLngs.forEach((pt) => bounds.push(pt))

      // Outer glow/shadow stroke
      L.polyline(polylineLatLngs, {
        color: activeLeg === 'captain_to_shop' ? '#F43F5E' : '#0284C7',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer)

      // Main inner route line
      L.polyline(polylineLatLngs, {
        color: activeLeg === 'captain_to_shop' ? '#E11D48' : '#0369A1',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer)
    } else {
      // Direct connector if points exist for current leg
      let startPt = null
      let endPt = null
      if (activeLeg === 'captain_to_shop' && hasCaptain && hasShop) {
        startPt = [captainLat, captainLng]
        endPt = [shopLat, shopLng]
      } else if (hasShop && hasCustomer) {
        startPt = hasCaptain ? [captainLat, captainLng] : [shopLat, shopLng]
        endPt = [customerLat, customerLng]
      }

      if (startPt && endPt) {
        L.polyline([startPt, endPt], {
          color: activeLeg === 'captain_to_shop' ? '#E11D48' : '#0284C7',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.8,
        }).addTo(routeLayer)
      }
    }

    // Fit bounds smoothly with padding
    if (bounds.length > 1) {
      try {
        map.fitBounds(L.latLngBounds(bounds), {
          padding: [36, 36],
          maxZoom: 16,
          animate: true,
        })
      } catch (e) {
        // ignore bounds fit error
      }
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15)
    }
  }, [
    mapReady,
    captainLat,
    captainLng,
    hasCaptain,
    shopLat,
    shopLng,
    hasShop,
    customerLat,
    customerLng,
    hasCustomer,
    route,
    activeLeg,
    orderStatus,
    gpsActive,
  ])

  // Map control functions
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn()
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut()
  const handleRecenter = () => {
    const map = mapInstanceRef.current
    if (!map) return

    const bounds = []
    if (hasCaptain) bounds.push([captainLat, captainLng])
    if (hasShop) bounds.push([shopLat, shopLng])
    if (hasCustomer) bounds.push([customerLat, customerLng])

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 16 })
    } else if (hasCaptain) {
      map.setView([captainLat, captainLng], 16)
    } else if (hasShop) {
      map.setView([shopLat, shopLng], 16)
    }
  }

  // Distance & Duration labels
  const formattedDist = !isOutOfRange ? formatDistance(distance) : ''
  const formattedDur = !isOutOfRange ? formatDuration(duration) : ''

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 shadow-xl ${className}`}>
      {/* Header bar / Title */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 text-white backdrop-blur z-20 relative">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-pink-500/20 text-pink-400">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-black tracking-tight text-white block">
              {title || (activeLeg === 'captain_to_shop' ? 'Route to Merchant Store' : 'Route to Customer Drop')}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">
              {activeLeg === 'captain_to_shop'
                ? `Pickup: ${shop?.name || 'Merchant Shop'}`
                : `Destination: ${customer?.name || 'Customer'}`}
            </span>
          </div>
        </div>

        {/* Live Route Distance & Duration Pill */}
        {(formattedDist || formattedDur) && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-800/90 px-2.5 py-1 text-[11px] font-bold text-white border border-slate-700 shadow-sm">
            <Clock className="h-3 w-3 text-pink-400" />
            <span>
              {formattedDur ? `${formattedDur}` : ''}
              {formattedDur && formattedDist ? ' • ' : ''}
              {formattedDist ? `${formattedDist}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className={`relative w-full ${height} z-10 bg-slate-950`}>
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Floating Map Zoom & Recenter Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-slate-800 hover:bg-white active:scale-95 shadow transition"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-slate-800 hover:bg-white active:scale-95 shadow transition"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            className="grid h-8 w-8 place-items-center rounded-xl bg-white/95 text-brand-600 hover:bg-white active:scale-95 shadow transition"
            aria-label="Fit route"
            title="Recenter Map"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>

        {/* Live GPS Broadcast Indicator Overlay */}
        <div className="absolute top-3 left-3 z-[400] max-w-[210px] sm:max-w-xs">
          {gpsActive ? (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-slate-700 backdrop-blur shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live GPS Broadcast</span>
            </div>
          ) : gpsError ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-amber-950/90 px-2.5 py-1 text-[10px] font-medium text-amber-300 border border-amber-800/80 backdrop-blur shadow-sm">
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="truncate">{gpsError}</span>
            </div>
          ) : null}
        </div>

        {/* Legend Overlay at Bottom Left */}
        <div className="absolute bottom-3 left-3 z-[400] hidden sm:flex items-center gap-2 rounded-xl bg-slate-900/85 px-2.5 py-1 text-[10px] font-semibold text-slate-300 border border-slate-800 backdrop-blur pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-pink-500 inline-block" /> Captain
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-600 inline-block" /> Shop
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Customer
          </span>
        </div>
      </div>

      {/* Action Footer: Prominent "Navigate in Google Maps" Button */}
      {showGoogleNavButton && navUrl && (
        <div className="border-t border-slate-800 bg-slate-900 px-4 py-2.5 flex items-center justify-between text-xs z-20 relative">
          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-pink-400" />
            <span>
              {activeLeg === 'captain_to_shop'
                ? `Destination: ${shop?.name || 'Merchant Shop'}`
                : `Destination: ${customer?.address || customer?.name || 'Customer'}`}
            </span>
          </div>

          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-pink-500 hover:to-brand-500 active:scale-95 transition"
          >
            <span>Navigate in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  )
}
