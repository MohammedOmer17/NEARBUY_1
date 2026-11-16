import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ROUTES } from '../../config/routes'
import { formatCurrency, normalizeUnitLabel } from '../../utils/format'
import ProductImage from './ProductImage'
import AddControl from './AddControl'

const ProductCard = memo(function ProductCard({ product, showCompare = false }) {
  if (!product) return null
  const pack = product.packSize || normalizeUnitLabel(product.unit) || product.unit
  const hasValidPrice =
    product.price !== undefined &&
    product.price !== null &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) > 0

  return (
    <article className="group flex min-w-0 flex-col justify-between rounded-2xl border border-[#593650] bg-[#211522] p-3 shadow-card transition-all duration-200 hover:border-[#EC55C8]/70 hover:shadow-lg hover:shadow-pink-500/10">
      <Link to={ROUTES.product(product.id)} className="block min-w-0">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#170F1B] flex items-center justify-center p-2.5 transition-transform duration-200 group-hover:scale-[1.03]">
          <ProductImage src={product.image} alt={product.name} category={product.category} className="h-full w-full object-contain" />
        </div>
        <div className="mt-3 min-w-0">
          <h3 className="line-clamp-2 min-h-9 text-xs sm:text-sm font-bold text-white leading-snug">
            {product.name}
          </h3>
          {pack && (
            <p className="mt-1 text-[11px] font-medium text-[#94849A] truncate">{pack}</p>
          )}
          {product.brand && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EC55C8] truncate">
              {product.brand}
            </p>
          )}
          {!showCompare && (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-black text-white">
                {hasValidPrice ? (
                  formatCurrency(product.price)
                ) : (
                  <span className="text-[11px] font-medium text-[#94849A]">Price unavailable</span>
                )}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3.5 flex items-center justify-between gap-1.5 pt-2 border-t border-[#593650]/60">
        <div className="min-w-0">
          {showCompare ? (
            product.offerCount > 1 ? (
              <span className="inline-block text-[11px] font-bold text-[#F58AD8]">
                {product.offerCount} shops available
              </span>
            ) : (
              <span className="inline-block text-[11px] font-medium text-[#94849A]">
                Available in 1 shop
              </span>
            )
          ) : (
            <span
              className={`inline-block text-[11px] font-semibold ${
                product.available !== false ? 'text-[#20C878]' : 'text-[#F05A79]'
              }`}
            >
              {product.available !== false ? 'In Stock' : 'Out of Stock'}
            </span>
          )}
        </div>

        {showCompare ? (
          <Link
            to={ROUTES.product(product.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] transition hover:bg-gradient-to-r hover:from-[#EC55C8] hover:to-[#B65DDA] hover:text-white active:scale-95 shadow-sm"
            aria-label={`View details and compare offers for ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </Link>
        ) : (
          <AddControl product={product} />
        )}
      </div>
    </article>
  )
})

export default ProductCard
