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

  const handleSelectOfferAndShop = async (offer) => {
    if (!offer) return
    const shopId = offer.shop?.id || offer.shopId || offer.shop?._id
    if (!shopId) return

    setSubmitting(true)
    const productPayload = {
      id: offer.id,
      _id: offer.id,
      productId: offer.id,
      name: offer.name,
      price: offer.price,
      image: offer.image || product?.image,
      category: offer.category || product?.category,
      brand: offer.brand || product?.brand,
      unit: offer.unit,
      packSize: offer.packSize,
      shopId: shopId,
      shopName: offer.shop?.name || offer.shopName,
    }

    try {
      // 1. Add the chosen product offer from this shop into the cart
      await addItem(productPayload, 1)
      showToast(`Added ${offer.name} to cart`)
    } catch (err) {
      console.warn('Could not add to cart before navigating:', err)
    } finally {
      setSubmitting(false)
      setSelectedOffer(null)
    }

    // 2. Navigate into that shop's catalogue with state so customer can continue shopping with item in cart
    navigate(ROUTES.shop(shopId), {
      state: {
        shop: offer.shop,
        addedItem: productPayload,
      },
    })
  }

  const handleConfirmShopAndCatalogue = async () => {
    if (!selectedOffer) return
    await handleSelectOfferAndShop(selectedOffer)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#100A14] text-white">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#593650] bg-[#100A14] px-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="ml-3 h-5 w-32" />
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="pt-4 space-y-3">
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
      <div className="min-h-screen bg-[#100A14] text-white">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#593650] bg-[#100A14] px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="ml-3 text-base font-bold text-white">Product Details</h1>
        </header>
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} title="Could not load product comparison" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#100A14] text-white">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#593650] bg-[#100A14] px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="ml-3 text-base font-bold text-white">Product</h1>
        </header>
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          text="This item is no longer available across local stores."
          action={
            <Link
              to={ROUTES.home}
              className="rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/25"
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
    <div className="min-h-screen bg-[#100A14] text-white pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#593650] bg-[#100A14]/95 px-4 backdrop-blur pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-[#EC55C8] truncate max-w-[180px]">
          {product.brand || 'NearBuy'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCart}
            aria-label={`Cart, ${itemCount} items`}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1 text-[10px] font-bold text-white shadow">
                {itemCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsFavorite((f) => !f)}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
            aria-label="Save to favorites"
          >
            <Heart
              className={`h-4 w-4 transition ${
                isFavorite ? 'fill-[#EC55C8] text-[#EC55C8] scale-110' : 'text-[#94849A]'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white transition active:scale-95"
            aria-label="Share product"
          >
            <Share2 className="h-4 w-4 text-[#94849A]" />
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 pt-3">
        {/* Product Image Frame with Dot Pagination Indicator */}
        <section className="relative overflow-hidden rounded-3xl border border-[#593650] bg-[#211522] p-6 shadow-card flex flex-col items-center justify-center">
          <div className="aspect-square w-full max-w-[240px] flex items-center justify-center">
            <ProductImage
              src={product.image}
              alt={product.name}
              category={product.category}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Carousel dots */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-5 rounded-full bg-[#EC55C8] transition-all" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#593650]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#593650]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#593650]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#593650]" />
          </div>
        </section>

        {/* Product Title and Overview */}
        <section className="rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            {product.name}
          </h1>

          {product.description && (
            <p className="text-xs text-[#94849A] font-medium leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Category Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-[#2B1B2D] px-2.5 py-1 text-[11px] font-bold text-[#C4B4C9] border border-[#593650]"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-lg bg-[#EC55C8]/15 px-2.5 py-1 text-[11px] font-bold text-[#F58AD8] border border-[#EC55C8]/30">
              {displayUnit}
            </span>
          </div>

          {/* Available in X nearby shops count banner */}
          <div className="pt-2">
            <div className="flex items-center gap-2 rounded-xl bg-[#2B1B2D] px-3 py-2 text-xs font-bold text-[#F58AD8] border border-[#593650]">
              <Store className="h-4 w-4 text-[#EC55C8] shrink-0" />
              <span>
                Available in {sortedOffers.length}{' '}
                {sortedOffers.length === 1 ? 'nearby shop' : 'nearby shops'}
              </span>
            </div>
          </div>
        </section>

        {/* Multi-Shop Price Comparison Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-white">
              Compare Prices from Nearby Shops
            </h2>

            {/* Sort selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl border border-[#593650] bg-[#211522] pl-2.5 pr-7 py-1.5 text-xs font-bold text-white shadow-sm focus:outline-none focus:border-[#EC55C8] cursor-pointer"
              >
                <option value="price">Sort by Price</option>
                <option value="distance">Sort by Distance</option>
                <option value="price_desc">Highest Price</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94849A]" />
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
                        ? 'border-2 border-[#20C878] bg-[#20C878]/10 shadow-sm'
                        : 'border border-[#593650] bg-[#211522] shadow-card hover:border-[#EC55C8]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Shop Storefront Avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] font-bold text-base shadow-sm">
                          <Store className="h-6 w-6" />
                        </div>

                        {/* Shop Info */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold text-white leading-tight">
                            {shopName}
                          </h3>

                          {/* Star rating */}
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                            <span className="flex items-center gap-0.5 font-bold text-[#F5A623]">
                              <Star className="h-3 w-3 fill-[#F5A623] text-[#F5A623]" /> 4.5 (210+)
                            </span>
                          </div>

                          {/* Distance and Address */}
                          <p className="mt-0.5 truncate text-[11px] font-medium text-[#94849A]">
                            📍 {distanceStr ? `${distanceStr} · ` : ''}
                            {shopAddress}
                          </p>
                        </div>
                      </div>

                      {/* Right: Price, Pack, Lowest Badge and Choose Button */}
                      <div className="flex flex-col items-end shrink-0 pl-1">
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black text-white">
                            {formatCurrency(offer.price)}
                          </span>
                          <span className="block text-[10px] font-semibold text-[#94849A]">
                            {offer.packSize || normalizeUnitLabel(offer.unit) || offer.unit || '1 pack'}
                          </span>
                          {isLowest && (
                            <span className="mt-0.5 inline-block rounded-md bg-[#20C878]/20 border border-[#20C878]/40 px-1.5 py-0.5 text-[9px] font-extrabold text-[#20C878]">
                              Lowest Price
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectOfferAndShop(offer)}
                          disabled={offer.isAvailable === false}
                          className="mt-2 rounded-xl bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-pink-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
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
            <div className="rounded-2xl border border-dashed border-[#593650] bg-[#211522] p-5 text-center">
              <Store className="mx-auto h-8 w-8 text-[#94849A]" />
              <p className="mt-2 text-xs font-bold text-white">No other shops sell this item currently</p>
              <p className="mt-0.5 text-[11px] text-[#94849A]">
                Check back soon as more local stores update their catalogue.
              </p>
            </div>
          )}

          {/* Advisory Notice Banner */}
          <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3.5 text-xs text-[#C4B4C9] flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[#EC55C8] shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Prices may vary by shop. Select a shop to view full catalogue and add more items from
              the same shop.
            </p>
          </div>
        </section>
      </main>

      {/* Select Shop & Continue (Confirmation / Selection Panel) */}
      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="selected-offer-title"
        >
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-2xl animate-slide-up space-y-4 text-white">
            {/* Modal Title and Close */}
            <div className="flex items-center justify-between border-b border-[#593650] pb-3">
              <h2 id="selected-offer-title" className="text-base font-extrabold text-white">
                Selected Offer
              </h2>
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#170F1B] text-[#94849A] hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Shop Info Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#593650] bg-[#170F1B] p-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] font-bold border border-[#593650]">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-extrabold text-white">
                  {selectedOffer.shop?.name || selectedOffer.shopName || 'Selected Kirana Store'}
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="flex items-center gap-0.5 font-bold text-[#F5A623]">
                    <Star className="h-3 w-3 fill-[#F5A623] text-[#F5A623]" /> 4.5 (210+)
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#94849A]">
                  📍{' '}
                  {formatDistance(selectedOffer.distanceKm ?? selectedOffer.shop?.distanceKm)
                    ? `${formatDistance(selectedOffer.distanceKm ?? selectedOffer.shop?.distanceKm)} · `
                    : ''}
                  {selectedOffer.shop?.address || 'Murad Nagar, Hyderabad'}
                </p>
              </div>
            </div>

            {/* Selected Product Summary Row */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-[#211522] p-1 flex items-center justify-center border border-[#593650]">
                  <ProductImage
                    src={selectedOffer.image || product.image}
                    alt={selectedOffer.name}
                    category={selectedOffer.category || product.category}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{selectedOffer.name}</p>
                  <p className="text-[10px] font-semibold text-[#94849A]">
                    {selectedOffer.packSize || normalizeUnitLabel(selectedOffer.unit) || selectedOffer.unit || '1 pack'}
                  </p>
                </div>
              </div>

              <span className="text-base font-black text-white shrink-0">
                {formatCurrency(selectedOffer.price)}
              </span>
            </div>

            {/* Checklist Box */}
            <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 space-y-2.5">
              <p className="text-xs font-extrabold text-white">Continue to this shop?</p>
              <div className="space-y-1.5 text-xs text-[#C4B4C9] font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20C878] shrink-0" />
                  <span>You can add more items from this shop</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20C878] shrink-0" />
                  <span>Your cart will be for this shop only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#20C878] shrink-0" />
                  <span>You can compare other shops anytime</span>
                </div>
              </div>
            </div>

            {/* Actions: Cancel & View Shop Catalogue */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedOffer(null)}
                className="flex-1 rounded-2xl text-xs py-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={submitting}
                onClick={handleConfirmShopAndCatalogue}
                className="flex-[2] rounded-2xl text-xs py-3"
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
