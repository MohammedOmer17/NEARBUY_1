import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronDown, MapPin, ShoppingBag, SearchX, Store, Zap, Tag } from 'lucide-react'
import { useLocation } from '../../../context/LocationContext'
import { useCart } from '../../../context/CartContext'
import { useNotifications } from '../../../context/NotificationContext'
import { orderApi, productApi, shopApi } from '../../../services/api'
import { groupProductsByIdentity } from '../../../services/normalizers'
import { haversineDistanceKm, isValidCoordinate } from '../../../utils/geo'
import { ROUTES } from '../../../config/routes'
import { formatDateTime } from '../../../utils/format'
import SearchBar from '../../../components/shared/SearchBar'
import CategoryChips from '../../../components/shared/CategoryChips'
import ShopCard from '../../../components/shared/ShopCard'
import ProductCard from '../../../components/shared/ProductCard'
import { ProductGridSkeleton } from '../../../components/ui/Skeleton'
import Skeleton from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import Button from '../../../components/ui/Button'

const matches = (q, ...fields) => fields.some((f) => f?.toLowerCase().includes(q))

// Helper to read/write sessionStorage safely
const readStorage = (key) => {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeStorage = (key, val) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(val))
  } catch {
    // ignore
  }
}

// In-memory cache to make tab switching (Home <-> Orders <-> Profile) instantaneous
let homeDataCache = {
  key: null,
  timestamp: 0,
  shopsList: readStorage('nb_cached_shops') || [],
  allProducts: readStorage('nb_cached_products') || [],
}

export default function HomePage() {
  const { location, openSheet } = useLocation()
  const { itemCount, openCart } = useCart()
  const { unread } = useNotifications()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  
  const cacheKey = `${location?.latitude || ''}:${location?.longitude || ''}`
  const hasWarmData = homeDataCache.shopsList.length > 0
  const isCacheFresh = homeDataCache.key === cacheKey && (Date.now() - homeDataCache.timestamp < 120000)

  const [loading, setLoading] = useState(!hasWarmData)
  const [shopsList, setShopsList] = useState(homeDataCache.shopsList)
  const [allProducts, setAllProducts] = useState(homeDataCache.allProducts)

  // Load nearby shops based on customer location (or all active shops if location unset)
  useEffect(() => {
    let alive = true
    async function loadData() {
      if (!hasWarmData) {
        setLoading(true)
      }
      try {
        let fetchedShops = []
        const hasCustomerLocation = isValidCoordinate(location?.latitude, location?.longitude)

        // 1. Fetch nearby shops ranked by distance if customer location is set
        if (hasCustomerLocation) {
          try {
            fetchedShops = await shopApi.nearby(location.latitude, location.longitude)
          } catch (err) {
            console.error('Failed to fetch nearby shops:', err)
          }
        }

        // 2. Fallback to active shops listing if nearby returned empty or location not yet set
        if (!fetchedShops.length) {
          try {
            fetchedShops = await shopApi.list()
            if (hasCustomerLocation) {
              fetchedShops = fetchedShops
                .map((s) => {
                  const dist =
                    s.distanceKm != null
                      ? s.distanceKm
                      : isValidCoordinate(s.location?.latitude, s.location?.longitude)
                        ? haversineDistanceKm(
                            location.latitude,
                            location.longitude,
                            s.location.latitude,
                            s.location.longitude
                          )
                        : null
                  return { ...s, distanceKm: dist }
                })
                .sort((a, b) => {
                  if (a.distanceKm == null && b.distanceKm == null) return 0
                  if (a.distanceKm == null) return 1
                  if (b.distanceKm == null) return -1
                  return a.distanceKm - b.distanceKm
                })
            }
          } catch (err) {
            console.error('Failed to list shops:', err)
          }
        }

        // Cache known shop IDs for seamless cross-page navigation
        const ids = fetchedShops.map((s) => s.id).filter(Boolean)
        if (ids.length) {
          writeStorage('nb_cached_shop_ids', ids)
          writeStorage('nb_cached_shops', fetchedShops)
        }

        if (alive && fetchedShops.length) {
          setShopsList(fetchedShops)
        }

        // 3. Fetch products across top nearby shops in parallel for multi-shop comparison
        let prods = []
        try {
          const productPromises = fetchedShops.slice(0, 5).map(async (shop) => {
            try {
              return await productApi.byShop(shop.id)
            } catch (shopErr) {
              console.warn(`Failed to fetch products for shop ${shop.id}:`, shopErr)
              return []
            }
          })
          const results = await Promise.all(productPromises)
          prods = results.flat()
        } catch (err) {
          console.error('Failed to load products for home comparison:', err)
        }

        if (alive) {
          setShopsList(fetchedShops)
          if (prods.length) {
            setAllProducts(prods)
            writeStorage('nb_cached_products', prods)
          }
          // Update memory cache
          homeDataCache = {
            key: cacheKey,
            timestamp: Date.now(),
            shopsList: fetchedShops,
            allProducts: prods.length ? prods : allProducts,
          }
        }
      } catch (err) {
        console.error('Home load error:', err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    // If cache is fresh, skip re-fetching
    if (!isCacheFresh) {
      loadData()
    }
    return () => {
      alive = false
    }
  }, [location?.latitude, location?.longitude, isCacheFresh, cacheKey])

  // Group cross-shop products by canonical/normalized identity
  const canonicalProducts = useMemo(() => {
    return groupProductsByIdentity(allProducts)
  }, [allProducts])

  // Extract distinct category tabs
  const categories = useMemo(() => {
    const s = new Set()
    for (const p of canonicalProducts) {
      if (p.category) s.add(p.category)
    }
    return ['All', ...Array.from(s)]
  }, [canonicalProducts])

  // Filter canonical products based on active category & query
  const visibleProducts = useMemo(() => {
    let list = canonicalProducts
    if (category) {
      list = list.filter((p) => p.category?.toLowerCase() === category.toLowerCase())
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => matches(q, p.name, p.category, p.brand))
    }
    return list
  }, [canonicalProducts, category, query])

  // Filter nearby shops if search query is provided
  const visibleShops = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return shopsList
    return shopsList.filter((s) => matches(q, s.name, s.address))
  }, [shopsList, query])

  const noResults = Boolean(query) && !visibleProducts.length && !visibleShops.length

  return (
    <div className="min-h-full bg-[#100A14] text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#593650] bg-[#100A14]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={openSheet}
            aria-label="Change delivery location"
            className="flex-1 text-left transition active:opacity-75"
          >
            <span className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#EC55C8]">
              <MapPin className="h-3.5 w-3.5 text-[#EC55C8]" /> Deliver to
            </span>
            <span className="flex items-center gap-1 text-sm sm:text-base font-extrabold tracking-tight truncate max-w-[240px] text-white">
              {location ? (location.label || 'Hyderabad') : 'Set your location'}
              <ChevronDown className="h-4 w-4 shrink-0 text-[#C4B4C9]" />
            </span>
            {location?.updatedAt && (
              <span className="block text-[10px] text-[#94849A]">
                Updated {formatDateTime(location.updatedAt)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${itemCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white hover:border-[#EC55C8] transition active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1 text-[11px] font-bold text-white shadow">
                  {itemCount}
                </span>
              )}
            </button>
            <Link
              to={ROUTES.notifications}
              aria-label={`Notifications, ${unread} unread`}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white hover:border-[#EC55C8] transition active:scale-95"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1 text-[11px] font-bold text-white shadow">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </div>
        </div>

        <SearchBar
          className="mt-3.5"
          value={query}
          onChange={setQuery}
          placeholder="Search for products or shops..."
        />
      </header>

      <div className="space-y-6 px-4 pb-8 pt-4">
        {/* Promotional Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[#593650] bg-gradient-to-r from-[#2B1B2D] via-[#481c4c] to-[#2B1B2D] p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EC55C8]/20 border border-[#EC55C8]/40 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#F58AD8] backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                Zapping Delivery in 14 mins
              </span>
              <h2 className="text-lg font-black tracking-tight pt-1 text-white">Get ₹100 OFF</h2>
              <p className="text-xs text-[#C4B4C9]">on your first order with NearBuy</p>
              <div className="pt-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white border border-white/15">
                  <Tag className="h-3 w-3 text-[#EC55C8]" /> USE CODE: ZAP100
                </span>
              </div>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#EC55C8]/15 border border-[#EC55C8]/30 shadow-inner text-3xl font-extrabold text-white">
              🛍️
            </div>
          </div>
        </div>

        {/* Location setup prompt if not yet set */}
        {!location && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650]">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="flex-1 text-xs font-semibold text-white">
              Set your location to see kirana shops near you.
            </p>
            <Button size="sm" onClick={openSheet} className="text-xs">
              Set Location
            </Button>
          </div>
        )}

        {noResults ? (
          <EmptyState
            icon={SearchX}
            title="No matches found"
            text={`Nothing matched "${query}". Try searching a different keyword.`}
            action={
              <Button variant="soft" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <>
            {/* Nearby Shops Section */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Nearby Shops</h2>
                {visibleShops.length > 0 && (
                  <span className="text-xs font-bold text-[#EC55C8] cursor-pointer hover:underline">See All &gt;</span>
                )}
              </div>

              {loading ? (
                <div className="flex gap-3 overflow-hidden">
                  <Skeleton className="h-44 w-52 shrink-0 rounded-2xl" />
                  <Skeleton className="h-44 w-52 shrink-0 rounded-2xl" />
                </div>
              ) : visibleShops.length ? (
                <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
                  {visibleShops.map((s) => (
                    <ShopCard key={s.id} shop={s} className="w-52 shrink-0 snap-start" />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#593650] bg-[#211522] p-5 text-center">
                  <Store className="mx-auto h-8 w-8 text-[#94849A]" />
                  <p className="mt-2 text-xs font-semibold text-white">No registered shops found yet</p>
                  <p className="mt-1 text-[11px] text-[#94849A]">
                    Register a shop with the Shop Owner app to begin listing products in this area.
                  </p>
                  <Link
                    to={ROUTES.ownerRegister}
                    className="mt-3 inline-block rounded-full bg-[#2B1B2D] border border-[#593650] px-4 py-1.5 text-xs font-bold text-[#F58AD8] hover:bg-[#38233b]"
                  >
                    Open Shop Owner App
                  </Link>
                </div>
              )}
            </section>

            {/* Popular Products Near You Section */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Popular Products Near You</h2>
                {visibleProducts.length > 0 && (
                  <span className="text-xs font-bold text-[#EC55C8] cursor-pointer hover:underline">See All &gt;</span>
                )}
              </div>

              {categories.length > 1 && (
                <CategoryChips categories={categories} value={category} onChange={setCategory} />
              )}

              <div className="mt-3.5">
                {loading ? (
                  <ProductGridSkeleton count={6} />
                ) : visibleProducts.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {visibleProducts.map((p) => (
                      <ProductCard key={p.key || p.id} product={p} showCompare={true} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No products available"
                    text="Products will appear here once local shops add items to their catalogue."
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
