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
  const { itemCount, openCart, addItem, quantityOf } = useCart()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [fetchedShop, setFetchedShop] = useState(null)
  const { data: products, loading, error, reload } = useAsync(() => productApi.byShop(shopId), [shopId])

  // If navigated here with a selected item, ensure it's in the cart
  useEffect(() => {
    const itemToAdd = state?.addedItem || state?.addItem
    if (itemToAdd && (itemToAdd.id || itemToAdd._id || itemToAdd.productId)) {
      const pid = itemToAdd.id || itemToAdd._id || itemToAdd.productId
      if (quantityOf(pid) === 0) {
        addItem(itemToAdd, 1).catch(() => {})
      }
    }
  }, [state?.addedItem, state?.addItem]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Deduplicate products strictly so multiple cards of the same item never appear
  const uniqueProducts = useMemo(() => {
    const map = new Map()
    for (const p of products || []) {
      const key =
        p.canonicalProductId ||
        `${(p.name || '').trim().toLowerCase()}|${(p.brand || '').trim().toLowerCase()}|${(
          p.packSize ||
          p.unit ||
          ''
        )
          .trim()
          .toLowerCase()}`
      if (!map.has(key)) {
        map.set(key, p)
      }
    }
    return Array.from(map.values())
  }, [products])

  const shop = useMemo(() => {
    const fromNav = state?.shop || fetchedShop
    const shopLoc = fromNav?.location || uniqueProducts?.[0]?.shopLocation
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
      name: fromNav?.name || uniqueProducts?.[0]?.shopName || 'Local Kirana Store',
      address: fromNav?.address || uniqueProducts?.[0]?.shopAddress || 'Murad Nagar, Hyderabad',
      distanceKm: computedDistance,
    }
  }, [state?.shop, fetchedShop, uniqueProducts, location])

  const categories = useMemo(
    () => Array.from(new Set((uniqueProducts || []).map((p) => p.category).filter(Boolean))),
    [uniqueProducts],
  )

  const q = query.trim().toLowerCase()
  const visible = (uniqueProducts || []).filter(
    (p) =>
      (!category || category === 'All' || p.category === category) &&
      (!q ||
        [p.name, p.brand, p.category, p.unit, p.packSize, p.variant].some((f) =>
          f?.toLowerCase().includes(q),
        )),
  )

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-24">
      <PageHeader
        title={shop.name}
        right={
          <div className="flex items-center gap-1.5">
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
            <button
              type="button"
              onClick={() => setIsFavorite((f) => !f)}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white hover:border-[#EC55C8] transition active:scale-95"
              aria-label="Save shop to favorites"
            >
              <Heart
                className={`h-5 w-5 transition ${isFavorite ? 'fill-[#EC55C8] text-[#EC55C8]' : 'text-[#94849A]'}`}
              />
            </button>
          </div>
        }
      />

      <div className="px-4 pb-6 pt-3 space-y-4">
        {/* Shop Card */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] font-bold text-xl">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-white">{shop.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-bold text-[#F5A623] bg-[#F5A623]/15 border border-[#F5A623]/30 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3 fill-[#F5A623] text-[#F5A623]" /> 4.5 (210+)
              </span>
              <span className="text-[#94849A] font-medium">
                {formatDistance(shop.distanceKm, 'Distance unavailable')}
              </span>
            </div>
            {shop.address && <p className="mt-1 truncate text-xs text-[#94849A]">{shop.address}</p>}
          </div>
        </div>

        <SearchBar
          className="mt-4"
          value={query}
          onChange={setQuery}
          placeholder="Search in this shop..."
        />

        {categories.length > 1 && (
          <div className="mt-3">
            <CategoryChips categories={categories} value={category} onChange={setCategory} />
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load products" />
          ) : visible.length ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
