import { useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Share2,
  Heart,
  Store,
  Star,
  CheckCircle2,
  X,
  ChevronDown,
  Info,
  PackageSearch,
  ShoppingBag,
} from 'lucide-react'
import { useAsync } from '../../../hooks/useAsync'
import { productApi } from '../../../services/api'
import { useCart } from '../../../context/CartContext'
import { useLocation } from '../../../context/LocationContext'
import { useToast } from '../../../context/ToastContext'
import { ROUTES } from '../../../config/routes'
import { formatCurrency, normalizeUnitLabel } from '../../../utils/format'
import { formatDistance } from '../../../utils/geo'
import ProductImage from '../../../components/shared/ProductImage'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'
import ErrorState from '../../../components/ui/ErrorState'
import EmptyState from '../../../components/ui/EmptyState'

export default function ProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { location } = useLocation()
  const { addItem, itemCount, openCart } = useCart()

  const { showToast } = useToast()

  const [sortBy, setSortBy] = useState('price') // 'price' | 'distance' | 'price_desc'
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch product and all its multi-shop comparison offers
  const {
    data,
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      productApi.offers(productId, {
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    [productId, location?.latitude, location?.longitude],
  )

  const product = data?.product
  const rawOffers = data?.offers || []

  // Ensure offers are sorted according to the current client-side or server-side sort
  const sortedOffers = useMemo(() => {
    const list = [...rawOffers]
    if (sortBy === 'distance') {
      return list.sort((a, b) => {
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm || a.price - b.price
      })
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.price - a.price)
    }
    // Default lowest price first
    return list.sort((a, b) => {
      const pDiff = a.price - b.price
      if (pDiff !== 0) return pDiff
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
      return 0
    })
  }, [rawOffers, sortBy])

  // Find lowest price among available offers
  const lowestAvailablePrice = useMemo(() => {
    const available = sortedOffers.filter((o) => o.isAvailable !== false && o.price > 0)
    if (!available.length) return null
    return Math.min(...available.map((o) => o.price))
  }, [sortedOffers])

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product?.name || 'NearBuy Product',
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
      showToast('Link copied to clipboard')
    }
  }

  const handleChooseOffer = (offer) => {
    setSelectedOffer(offer)
  }

  const handleConfirmShopAndCatalogue = async () => {
    if (!selectedOffer) return
    setSubmitting(true)
    try {
      // Add selected product from this specific shop into the cart
      const added = await addItem(selectedOffer, 1)
      if (added === false) {
        // User cancelled in conflict modal
        setSubmitting(false)
        return
      }

      showToast(`Added ${selectedOffer.name} to cart from ${selectedOffer.shop?.name || 'shop'}`)

      // Navigate to the chosen shop's catalogue
      const targetShopId = selectedOffer.shop?.id || selectedOffer.shopId
      setSelectedOffer(null)
      navigate(ROUTES.shop(targetShopId), {
        state: {
          shop: selectedOffer.shop,
        },
      })
    } catch (err) {
      showToast(err.message || 'Could not choose shop', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas pb-16">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/80 px-4 backdrop-blur">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </header>
        <div className="space-y-4 p-4">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-white px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="ml-3 text-base font-bold text-ink">Product Details</h1>
        </header>
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} title="Could not load product comparison" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-white px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="ml-3 text-base font-bold text-ink">Product</h1>
        </header>
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          text="This item is no longer available across local stores."
          action={
            <Link
              to={ROUTES.home}
              className="rounded-full bg-accent-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/20"
            >
              Browse Products
            </Link>
          }
        />
      </div>
    )
  }

  const tags = [product.category, product.brand].filter(Boolean)
  const displayUnit = normalizeUnitLabel(product.unit) || product.unit || 'Standard Pack'

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Top Header matching Reference Storyboard Screen 2 */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/60 bg-white/90 px-4 backdrop-blur pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-mute truncate max-w-[180px]">
          {product.brand || 'NearBuy'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCart}
            aria-label={`Cart, ${itemCount} items`}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white shadow">
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsFavorite((f) => !f)}
            className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
            aria-label="Save to favorites"
          >
            <Heart
              className={`h-4 w-4 transition ${
                isFavorite ? 'fill-accent-500 text-accent-500 scale-110' : 'text-mute'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="grid h-9 w-9 place-items-center rounded-full bg-canvas text-ink transition active:scale-95"
            aria-label="Share product"
          >
            <Share2 className="h-4 w-4 text-mute" />
          </button>
        </div>
      </header>


      <main className="space-y-4 px-4 pt-3">
        {/* Product Image Frame with Dot Pagination Indicator */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card flex flex-col items-center justify-center">
          <div className="aspect-square w-full max-w-[240px] flex items-center justify-center">
            <ProductImage
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Carousel dots matching reference image */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-5 rounded-full bg-accent-500 transition-all" />
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
          </div>
        </section>

        {/* Product Title and Overview */}
        <section className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight leading-tight">
            {product.name}
          </h1>

          {product.description && (
            <p className="text-xs text-mute font-medium leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Category Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink/75 border border-line"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-lg bg-pink-50 px-2.5 py-1 text-[11px] font-bold text-accent-600 border border-pink-100">
              {displayUnit}
            </span>
          </div>

          {/* Available in X nearby shops count banner */}
          <div className="pt-2">
            <div className="flex items-center gap-2 rounded-xl bg-purple-50/70 px-3 py-2 text-xs font-bold text-purple-900 border border-purple-100/70">
              <Store className="h-4 w-4 text-purple-700 shrink-0" />
              <span>
                Available in {sortedOffers.length}{' '}
                {sortedOffers.length === 1 ? 'nearby shop' : 'nearby shops'}
              </span>
            </div>
          </div>
        </section>

        {/* Multi-Shop Price Comparison Section matching Screen 2 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-ink">
              Compare Prices from Nearby Shops
            </h2>

            {/* Sort selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-line bg-white pl-2.5 pr-7 py-1.5 text-xs font-bold text-ink shadow-sm focus:outline-none focus:ring-1 focus:ring-accent-500 cursor-pointer"
              >
                <option value="price">Sort by Price</option>
                <option value="distance">Sort by Distance</option>
                <option value="price_desc">Highest Price</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute" />
            </div>
          </div>

          {/* Offer Rows */}
          {sortedOffers.length > 0 ? (
            <div className="space-y-2.5">
              {sortedOffers.map((offer) => {
                const isLowest =
                  lowestAvailablePrice !== null &&
                  offer.price === lowestAvailablePrice &&
                  offer.isAvailable !== false
                const shopName = offer.shop?.name || offer.shopName || 'Local Kirana Store'
                const shopAddress = offer.shop?.address || 'Murad Nagar, Hyderabad'
                const distanceStr = formatDistance(offer.distanceKm ?? offer.shop?.distanceKm)

                return (
                  <div
                    key={offer.id}
                    className={`relative overflow-hidden rounded-2xl p-3.5 transition-all ${
                      isLowest
                        ? 'border-2 border-emerald-400 bg-emerald-50/20 shadow-sm'
                        : 'border border-line bg-white shadow-card hover:border-line-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Shop Storefront Avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-pink-100 to-purple-100 text-accent-500 border border-line font-bold text-base shadow-sm">
                          <Store className="h-6 w-6" />
                        </div>

                        {/* Shop Info */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold text-ink leading-tight">
                            {shopName}
                          </h3>

                          {/* Star rating */}
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                            <span className="flex items-center gap-0.5 font-bold text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.5 (210+)
                            </span>
                          </div>

                          {/* Distance and Address */}
                          <p className="mt-0.5 truncate text-[11px] font-medium text-mute">
                            📍 {distanceStr ? `${distanceStr} · ` : ''}
                            {shopAddress}
                          </p>
                        </div>
                      </div>

                      {/* Right: Price, Pack, Lowest Badge and Choose Button */}
                      <div className="flex flex-col items-end shrink-0 pl-1">
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black text-ink">
                            {formatCurrency(offer.price)}
                          </span>
                          <span className="block text-[10px] font-semibold text-mute">
                            {offer.packSize || normalizeUnitLabel(offer.unit) || offer.unit || '1 pack'}
                          </span>
                          {isLowest && (
                            <span className="mt-0.5 inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                              Lowest Price
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleChooseOffer(offer)}
                          disabled={offer.isAvailable === false}
                          className="mt-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-pink-500/20 transition hover:opacity-95 active:scale-95 disabled:opacity-40"
                        >
                          Choose
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white p-5 text-center">
              <Store className="mx-auto h-8 w-8 text-mute/50" />
              <p className="mt-2 text-xs font-bold text-ink">No other shops sell this item currently</p>
              <p className="mt-0.5 text-[11px] text-mute">
                Check back soon as more local stores update their catalogue.
              </p>
            </div>
          )}

          {/* Advisory Notice Banner matching reference image bottom */}
          <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Prices may vary by shop. Select a shop to view full catalogue and add more items from
              the same shop.
            </p>
          </div>
        </section>
      </main>

      {/* Screen 3: Select Shop & Continue (Confirmation / Selection Panel) */}
      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="selected-offer-title"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-line bg-white p-5 shadow-2xl animate-slide-up space-y-4">
            {/* Modal Title and Close */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 id="selected-offer-title" className="text-base font-extrabold text-ink">
                Selected Offer
              </h2>
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-mute hover:text-ink transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Shop Info Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas/60 p-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-pink-100 to-purple-100 text-accent-500 font-bold border border-line">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-extrabold text-ink">
                  {selectedOffer.shop?.name || selectedOffer.shopName || 'Selected Kirana Store'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="flex items-center gap-0.5 font-bold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.5 (210+)
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-mute">
                  📍{' '}
                  {formatDistance(selectedOffer.distanceKm ?? selectedOffer.shop?.distanceKm)
                    ? `${formatDistance(selectedOffer.distanceKm ?? selectedOffer.shop?.distanceKm)} · `
                    : ''}
                  {selectedOffer.shop?.address || 'Murad Nagar, Hyderabad'}
                </p>
              </div>
            </div>

            {/* Selected Product Summary Row */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-canvas p-1 flex items-center justify-center border border-line">
                  <ProductImage
                    src={selectedOffer.image || product.image}
                    alt={selectedOffer.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">{selectedOffer.name}</p>
                  <p className="text-[10px] font-semibold text-mute">
                    {selectedOffer.packSize || normalizeUnitLabel(selectedOffer.unit) || selectedOffer.unit || '1 pack'}
                  </p>
                </div>
              </div>

              <span className="text-base font-black text-ink shrink-0">
                {formatCurrency(selectedOffer.price)}
              </span>
            </div>

            {/* Checklist Box matching Screen 3 */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 space-y-2.5">
              <p className="text-xs font-extrabold text-ink">Continue to this shop?</p>
              <div className="space-y-1.5 text-xs text-ink/80 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>You can add more items from this shop</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Your cart will be for this shop only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>You can compare other shops anytime</span>
                </div>
              </div>
            </div>

            {/* Actions: Cancel & View Shop Catalogue */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedOffer(null)}
                className="flex-1 rounded-2xl border border-pink-200 text-ink font-bold text-xs py-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={submitting}
                onClick={handleConfirmShopAndCatalogue}
                className="flex-[2] rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs py-3 shadow-md shadow-pink-500/25"
              >
                View Shop Catalogue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
