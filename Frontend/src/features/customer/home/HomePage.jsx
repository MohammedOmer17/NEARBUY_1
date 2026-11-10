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

// In-memory cache to make tab switching (Home <-> Orders <-> Profile) instantaneous
let homeDataCache = {
  key: null,
  timestamp: 0,
  shopsList: [],
  allProducts: [],
}

export default function HomePage() {
  const { location, openSheet } = useLocation()
  const { itemCount, openCart } = useCart()
  const { unread } = useNotifications()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  
  const cacheKey = `${location?.latitude || ''}:${location?.longitude || ''}`
  const isCacheValid = homeDataCache.key === cacheKey && (Date.now() - homeDataCache.timestamp < 60000)

  const [loading, setLoading] = useState(!isCacheValid)
  const [shopsList, setShopsList] = useState(isCacheValid ? homeDataCache.shopsList : [])
  const [allProducts, setAllProducts] = useState(isCacheValid ? homeDataCache.allProducts : [])

  // Load nearby shops based on customer location (or all active shops if location unset)
  useEffect(() => {
    let alive = true
    async function loadData() {
      if (!isCacheValid) {
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
        try {
          const ids = fetchedShops.map((s) => s.id).filter(Boolean)
          if (ids.length) {
            localStorage.setItem('nearbuy_known_shops', JSON.stringify(ids))
          }
        } catch {
          // ignore storage error
        }

        // 3. Fetch product catalogues for discovered shops in parallel
        const cataloguePromises = fetchedShops.slice(0, 8).map(async (shop) => {
          try {
            const products = await productApi.byShop(shop.id)
            return (products || []).map((p) => ({
              ...p,
              shopId: shop.id,
              shopName: shop.name,
            }))
          } catch {
            return []
          }
        })

        const catalogueResults = await Promise.all(cataloguePromises)
        const productsCollected = catalogueResults.flat()

        if (alive) {
          setShopsList(fetchedShops)
          setAllProducts(productsCollected)
          homeDataCache = {
            key: cacheKey,
            timestamp: Date.now(),
            shopsList: fetchedShops,
            allProducts: productsCollected,
          }
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadData()
    return () => {
      alive = false
    }
  }, [location?.latitude, location?.longitude, cacheKey, isCacheValid])

  const dedupedProducts = useMemo(() => groupProductsByIdentity(allProducts), [allProducts])
  const categories = useMemo(
    () => Array.from(new Set(dedupedProducts.map((p) => p.category).filter(Boolean))),
    [dedupedProducts],
  )

  const q = query.trim().toLowerCase()
  const visibleShops = q ? shopsList.filter((s) => matches(q, s.name, s.address)) : shopsList
  const visibleProducts = dedupedProducts.filter(
    (p) =>
      (!category || category === 'All' || p.category === category) &&
      (!q || matches(q, p.name, p.brand, p.category, p.unit, p.packSize, p.variant)),
  )

  const noResults = !loading && q && !visibleShops.length && !visibleProducts.length

  return (
    <div className="pb-12">
      {/* Header matching Storyboard Screen 3 */}
      <header className="rounded-b-[32px] bg-gradient-to-b from-[#2A0F5C] via-[#3B0764] to-[#4A0E4E] px-4 pb-6 pt-[calc(1.2rem+env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={openSheet}
            className="min-w-0 text-left transition active:opacity-80"
            aria-label="Change location"
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-pink-300">
              <MapPin className="h-3.5 w-3.5 text-pink-400" /> Deliver to
            </span>
            <span className="flex items-center gap-1 text-base font-extrabold tracking-tight truncate max-w-[240px]">
              {location ? (location.label || 'Hyderabad') : 'Set your location'}
              <ChevronDown className="h-4 w-4 shrink-0 text-pink-300" />
            </span>
            {location?.updatedAt && (
              <span className="block text-[10px] text-white/60">
                Updated {formatDateTime(location.updatedAt)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${itemCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition active:bg-white/20"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white shadow">
                  {itemCount}
                </span>
              )}
            </button>
            <Link

              to={ROUTES.notifications}
              aria-label={`Notifications, ${unread} unread`}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition active:bg-white/20"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white shadow">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </div>
        </div>

        <SearchBar
          className="mt-4 text-ink"
          value={query}
          onChange={setQuery}
          placeholder="Search for products or shops..."
        />
      </header>

      <div className="space-y-6 px-4 pb-6 pt-4">
        {/* Promotional Banner matching Storyboard Screen 3 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-pink-700 to-rose-600 p-4 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                Zapping Delivery in 14 mins
              </span>
              <h2 className="text-lg font-black tracking-tight pt-1">Get ₹100 OFF</h2>
              <p className="text-xs text-white/80">on your first order with NearBuy</p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white border border-white/20">
                  <Tag className="h-3 w-3" /> USE CODE: ZAP100
                </span>
              </div>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm shadow-inner text-3xl font-extrabold">
              🛍️
            </div>
          </div>
        </div>

        {/* Location setup prompt if not yet set */}
        {!location && (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-accent-500">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="flex-1 text-xs font-semibold text-ink">
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
                <h2 className="text-base font-bold text-ink">Nearby Shops</h2>
                {visibleShops.length > 0 && (
                  <span className="text-xs font-bold text-accent-500 cursor-pointer">See All</span>
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
                <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-center">
                  <Store className="mx-auto h-8 w-8 text-mute/50" />
                  <p className="mt-2 text-xs font-semibold text-ink">No registered shops found yet</p>
                  <p className="mt-1 text-[11px] text-mute">
                    Register a shop with the Shop Owner app to begin listing products in this area.
                  </p>
                  <Link
                    to={ROUTES.ownerRegister}
                    className="mt-3 inline-block rounded-full bg-accent-50 px-4 py-1.5 text-xs font-bold text-accent-500"
                  >
                    Open Shop Owner App
                  </Link>
                </div>
              )}
            </section>

            {/* Popular Products Near You Section */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">Popular Products Near You</h2>
                {visibleProducts.length > 0 && (
                  <span className="text-xs font-bold text-accent-500 cursor-pointer">See All</span>
                )}
              </div>

              {categories.length > 1 && (
                <CategoryChips categories={categories} value={category} onChange={setCategory} />
              )}

              <div className="mt-3">
                {loading ? (
                  <ProductGridSkeleton />
                ) : visibleProducts.length ? (
                  <div className="grid grid-cols-2 gap-3">
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
