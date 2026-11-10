import { useEffect, useMemo, useState } from 'react'
import { useLocation as useRouterLocation, useParams } from 'react-router-dom'
import { MapPin, PackageSearch, Store, Star, Heart, ShoppingBag } from 'lucide-react'
import { useAsync } from '../../../hooks/useAsync'
import { useLocation } from '../../../context/LocationContext'
import { useCart } from '../../../context/CartContext'
import { productApi, shopApi } from '../../../services/api'
import { haversineDistanceKm, isValidCoordinate, formatDistance } from '../../../utils/geo'
import PageHeader from '../../../components/shared/PageHeader'
import SearchBar from '../../../components/shared/SearchBar'
import CategoryChips from '../../../components/shared/CategoryChips'
import ProductCard from '../../../components/shared/ProductCard'
import { ProductGridSkeleton } from '../../../components/ui/Skeleton'
import EmptyState from '../../../components/ui/EmptyState'
import ErrorState from '../../../components/ui/ErrorState'

export default function ShopPage() {
  const { shopId } = useParams()
  const { state } = useRouterLocation()
  const { location } = useLocation()
  const { itemCount, openCart } = useCart()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [fetchedShop, setFetchedShop] = useState(null)
  const { data: products, loading, error, reload } = useAsync(() => productApi.byShop(shopId), [shopId])

  useEffect(() => {
    if (!state?.shop && shopId) {
      shopApi.getById(shopId).then(setFetchedShop).catch(() => {})
    }
  }, [shopId, state?.shop])

  // Save shop ID into known shops list for home discovery
  useEffect(() => {
    if (shopId) {
      try {
        const cached = JSON.parse(localStorage.getItem('nearbuy_known_shops') || '[]')
        if (!cached.includes(shopId)) {
          cached.push(shopId)
          localStorage.setItem('nearbuy_known_shops', JSON.stringify(cached))
        }
      } catch {
        // ignore
      }
    }
  }, [shopId])

  const shop = useMemo(() => {
    const fromNav = state?.shop || fetchedShop
    const shopLoc = fromNav?.location || products?.[0]?.shopLocation
    let computedDistance = fromNav?.distanceKm ?? null

    if (
      computedDistance === null &&
      isValidCoordinate(location?.latitude, location?.longitude) &&
      isValidCoordinate(shopLoc?.latitude, shopLoc?.longitude)
    ) {
      computedDistance = haversineDistanceKm(
        location.latitude,
        location.longitude,
        shopLoc.latitude,
        shopLoc.longitude
      )
    }

    return {
      name: fromNav?.name || products?.[0]?.shopName || 'Local Kirana Store',
      address: fromNav?.address || products?.[0]?.shopAddress || 'Murad Nagar, Hyderabad',
      distanceKm: computedDistance,
    }
  }, [state?.shop, fetchedShop, products, location])

  const categories = useMemo(
    () => Array.from(new Set((products || []).map((p) => p.category).filter(Boolean))),
    [products],
  )

  const q = query.trim().toLowerCase()
  const visible = (products || []).filter(
    (p) =>
      (!category || category === 'All' || p.category === category) &&
      (!q ||
        [p.name, p.brand, p.category, p.unit, p.packSize, p.variant].some((f) =>
          f?.toLowerCase().includes(q),
        )),
  )

  return (
    <div className="pb-24">
      <PageHeader
        title={shop.name}
        right={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${itemCount} items`}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white shadow">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsFavorite((f) => !f)}
              className="grid h-10 w-10 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
              aria-label="Save shop to favorites"
            >
              <Heart
                className={`h-5 w-5 ${isFavorite ? 'fill-accent-500 text-accent-500' : 'text-mute'}`}
              />
            </button>
          </div>
        }
      />


      <div className="px-4 pb-6 pt-3">
        {/* Shop Card matching Storyboard Screen 4 */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 text-accent-500 font-bold text-xl">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-ink">{shop.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> 4.5 (210+)
              </span>
              <span className="text-mute font-medium">
                {formatDistance(shop.distanceKm, 'Distance unavailable')}
              </span>
            </div>
            {shop.address && <p className="mt-1 truncate text-xs text-mute">{shop.address}</p>}
          </div>
        </div>

        <SearchBar
          className="mt-4"
          value={query}
          onChange={setQuery}
          placeholder="Search products in this shop..."
        />

        {categories.length > 1 && (
          <div className="mt-3">
            <CategoryChips categories={categories} value={category} onChange={setCategory} />
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <ProductGridSkeleton />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load products" />
          ) : visible.length ? (
            <div className="grid grid-cols-2 gap-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title={q || category ? 'No matching products' : 'No products available yet'}
              text={
                q || category
                  ? 'Try a different search term or category.'
                  : 'This shop has not added products to their inventory yet.'
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

