import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MapPin, Navigation, Check, Search, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { locationApi } from '../services/api'
import { getErrorMessage } from '../services/apiClient'
import {
  getPosition,
  geoErrorMessage,
  isValidCoordinate,
  HYDERABAD_LOCALITIES,
  getNearestLocality,
  getNearestLocalityLabel,
} from '../utils/geo'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'

const LocationContext = createContext(null)

const STORAGE_KEY = 'nearbuy_customer_location'
const DELIVERY_ADDRESS_KEY = 'nearbuy:lastDeliveryAddress'

export function LocationProvider({ children }) {
  const { customer, updateCustomer } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Initial location resolution:
  // Priority: Customer saved location from backend profile -> LocalStorage cached location
  const [localLoc, setLocalLoc] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (cached && isValidCoordinate(cached.latitude, cached.longitude)) {
        const nearest = getNearestLocality(cached.latitude, cached.longitude)
        const savedAddr = localStorage.getItem(DELIVERY_ADDRESS_KEY)
        return {
          latitude: Number(cached.latitude),
          longitude: Number(cached.longitude),
          label: cached.label || nearest?.label || 'Hyderabad',
          address: cached.address || savedAddr || nearest?.address || `${cached.label || 'Murad Nagar'}, Hyderabad`,
          locality: cached.locality || nearest?.label || 'Hyderabad',
          pincode: cached.pincode || nearest?.pincode || '',
          accuracy: cached.accuracy || null,
          updatedAt: cached.updatedAt || null,
        }
      }
    } catch {
      // ignore
    }
    return null
  })

  // Synchronize when customer profile updates
  useEffect(() => {
    const saved = customer?.location
    if (isValidCoordinate(saved?.latitude, saved?.longitude)) {
      const nearest = getNearestLocality(saved.latitude, saved.longitude)
      const label = nearest?.label || 'Saved Location'
      const address = customer.address || nearest?.address || `${label}, Hyderabad`
      setLocalLoc({
        latitude: Number(saved.latitude),
        longitude: Number(saved.longitude),
        label,
        address,
        locality: label,
        pincode: nearest?.pincode || '',
        updatedAt: customer.locationUpdatedAt || null,
      })
    }
  }, [customer?.location?.latitude, customer?.location?.longitude, customer?.locationUpdatedAt, customer?.address])

  const location = useMemo(() => {
    if (!localLoc || !isValidCoordinate(localLoc.latitude, localLoc.longitude)) {
      return null
    }
    return localLoc
  }, [localLoc])

  // Save location to state, localStorage, and backend (if logged in)
  const commitLocation = useCallback(
    async (lat, lng, label, address, pincode, accuracy = null) => {
      const nearest = getNearestLocality(lat, lng)
      const resolvedLabel = label || nearest?.label || 'Current Location'
      const resolvedAddress = address || nearest?.address || `${resolvedLabel}, Hyderabad`
      const resolvedPincode = pincode || nearest?.pincode || ''
      const now = new Date().toISOString()
      const newLoc = {
        latitude: Number(lat),
        longitude: Number(lng),
        label: resolvedLabel,
        address: resolvedAddress,
        pincode: resolvedPincode,
        accuracy: accuracy ? Math.round(accuracy) : null,
        updatedAt: now,
      }

      setLocalLoc(newLoc)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoc))
        localStorage.setItem(DELIVERY_ADDRESS_KEY, resolvedAddress)
      } catch {
        // ignore storage error
      }

      // If customer is authenticated, sync to profile
      if (customer) {
        try {
          await locationApi.update(lat, lng, resolvedAddress)
          updateCustomer({
            location: { latitude: Number(lat), longitude: Number(lng) },
            address: resolvedAddress,
            locationUpdatedAt: now,
          })
        } catch {
          // background sync fails silently; local state remains active
        }
      }

      setOpen(false)
      toast.success(`Location set: ${resolvedLabel}`)
    },
    [customer, toast, updateCustomer]
  )

  // Browser Geolocation Detection with Reverse Geocoding
  const detectAndSave = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const pos = await getPosition()
      const { latitude, longitude, accuracy } = pos.coords
      if (!isValidCoordinate(latitude, longitude)) {
        throw new Error('Received an invalid coordinate pair from device GPS.')
      }

      let resolvedLabel = null
      let resolvedAddress = null
      let resolvedPincode = null

      // Attempt reverse geocoding via backend Maps service
      try {
        const geoData = await locationApi.reverseGeocode(latitude, longitude)
        if (geoData) {
          resolvedLabel = geoData.label || geoData.locality
          resolvedAddress = geoData.address || geoData.formattedAddress
          resolvedPincode = geoData.pincode
        }
      } catch (geoErr) {
        console.warn('Backend reverse geocode fallback:', geoErr)
      }

      // Fallback to closest curated Hyderabad locality if reverse geocode is empty
      if (!resolvedAddress) {
        const nearest = getNearestLocality(latitude, longitude)
        resolvedLabel = nearest ? nearest.label : 'Current Location'
        resolvedAddress = nearest ? nearest.address : `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        resolvedPincode = nearest ? nearest.pincode : ''
      }

      await commitLocation(latitude, longitude, resolvedLabel, resolvedAddress, resolvedPincode, accuracy)
    } catch (e) {
      setError(e?.response ? getErrorMessage(e) : geoErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [commitLocation])

  // Manual fallback selection
  const selectManualLocation = useCallback(
    async (locality) => {
      setError('')
      await commitLocation(
        locality.latitude,
        locality.longitude,
        locality.label,
        locality.address,
        locality.pincode,
        null
      )
    },
    [commitLocation]
  )

  // Filter localities by search query
  const filteredLocalities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return HYDERABAD_LOCALITIES
    return HYDERABAD_LOCALITIES.filter(
      (loc) =>
        loc.label.toLowerCase().includes(q) ||
        loc.tag?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q) ||
        loc.pincode?.includes(q)
    )
  }, [searchQuery])

  // Auto-detect if browser permission was already granted and no location cached
  useEffect(() => {
    if (localLoc) return
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted') {
            detectAndSave()
          }
        })
        .catch(() => {})
    }
  }, [localLoc, detectAndSave])

  const value = useMemo(
    () => ({
      location,
      openSheet: () => {
        setError('')
        setSearchQuery('')
        setOpen(true)
      },
      setManualLocation: selectManualLocation,
      detectLocation: detectAndSave,
      commitLocation,
    }),
    [location, selectManualLocation, detectAndSave, commitLocation]
  )

  return (
    <LocationContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={location ? 'Change your location' : 'Set your location'}
        footer={
          <Button full variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-mute leading-relaxed">
                NearBuy uses your location to discover and calculate distances to nearby kirana shops around Murad Nagar and Hyderabad.
              </p>
              {location?.address && (
                <p className="mt-1 text-[11px] font-semibold text-brand-700 bg-brand-50/60 px-2 py-0.5 rounded-md inline-block">
                  Current: {location.address}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1"
            >
              <p className="font-semibold">{error}</p>
              <p className="text-[11px] text-red-600">
                You can select any neighborhood from the list below to continue.
              </p>
            </div>
          )}

          {/* Primary Action: Use GPS / Browser Geolocation */}
          <Button
            full
            loading={busy}
            onClick={detectAndSave}
            className="flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold text-xs py-2.5 shadow-sm active:bg-brand-700"
          >
            <Navigation className="h-4 w-4" />
            {busy ? 'Detecting accurate GPS location...' : 'Use my current GPS location'}
          </Button>

          {/* Search Localities */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-mute" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locality or pincode (e.g. Erragadda, Murad Nagar)..."
              className="w-full bg-canvas/70 border border-line rounded-xl pl-9 pr-8 py-2 text-xs text-ink placeholder:text-mute/70 outline-none focus:border-brand-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-mute hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Fallback Section: Neighborhood selection */}
          <div className="pt-1">
            <div className="relative flex items-center justify-center mb-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <span className="relative bg-white px-2 text-[10px] font-bold uppercase tracking-wider text-mute">
                Select Hyderabad Locality
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredLocalities.length === 0 ? (
                <div className="py-6 text-center text-xs text-mute">
                  No localities matching &quot;{searchQuery}&quot;. Try searching another area.
                </div>
              ) : (
                filteredLocalities.map((loc) => {
                  const isSelected =
                    location &&
                    ((Math.abs(location.latitude - loc.latitude) < 0.001 &&
                      Math.abs(location.longitude - loc.longitude) < 0.001) ||
                      (location.label && location.label.toLowerCase().includes(loc.label.toLowerCase().split(',')[0])))

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => selectManualLocation(loc)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/70 text-brand-900 font-semibold shadow-xs'
                          : 'border-line bg-canvas/40 hover:bg-canvas text-ink'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-bold">{loc.label}</p>
                          {loc.pincode && (
                            <span className="text-[10px] bg-canvas border border-line text-mute px-1.5 py-0.2 rounded font-mono">
                              {loc.pincode}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-mute">{loc.tag || loc.address}</p>
                      </div>
                      {isSelected ? (
                        <div className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-mute/80 shrink-0">Select</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </Modal>
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)

