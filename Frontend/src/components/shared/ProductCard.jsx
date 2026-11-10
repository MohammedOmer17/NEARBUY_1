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
    <article className="group flex min-w-0 flex-col justify-between rounded-2xl border border-line/70 bg-white p-3 shadow-card transition hover:shadow-md">
      <Link to={ROUTES.product(product.id)} className="block min-w-0">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-canvas flex items-center justify-center p-2 group-hover:scale-[1.02] transition">
          <ProductImage src={product.image} alt={product.name} className="h-full w-full object-contain" />
        </div>
        <div className="mt-2.5 min-w-0">
          <h3 className="line-clamp-2 min-h-9 text-xs sm:text-sm font-bold text-ink leading-snug">
            {product.name}
          </h3>
          {pack && (
            <p className="mt-0.5 text-[11px] font-semibold text-mute truncate">{pack}</p>
          )}
          {product.brand && (
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-500 truncate">
              {product.brand}
            </p>
          )}
          {!showCompare && (
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-black text-ink">
                {hasValidPrice ? (
                  formatCurrency(product.price)
                ) : (
                  <span className="text-[11px] font-medium text-mute">Price unavailable</span>
                )}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-center justify-between gap-1.5 pt-1 border-t border-line/50">
        <div className="min-w-0">
          {showCompare ? (
            product.offerCount > 1 ? (
              <span className="inline-block text-[11px] font-bold text-accent-600">
                {product.offerCount} shops available
              </span>
            ) : (
              <span className="inline-block text-[11px] font-medium text-mute">
                Available in 1 shop
              </span>
            )
          ) : (
            <span
              className={`inline-block text-[11px] font-semibold ${
                product.available !== false ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
              {product.available !== false ? 'In Stock' : 'Out of Stock'}
            </span>
          )}
        </div>

        {showCompare ? (
          <Link
            to={ROUTES.product(product.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pink-50 text-accent-500 border border-pink-200 transition hover:bg-accent-500 hover:text-white active:scale-95 shadow-sm"
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


