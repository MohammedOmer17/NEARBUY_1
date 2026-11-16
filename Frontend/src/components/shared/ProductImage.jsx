import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { assetUrl } from '../../utils/format'

const placeholderColors = [
  ['Rice, Grains', 'bg-amber-50 text-amber-300'],
  ['Atta, Flours', 'bg-yellow-50 text-yellow-400'],
  ['Dals & Pulses', 'bg-orange-50 text-orange-300'],
  ['Edible Oils', 'bg-emerald-50 text-emerald-300'],
  ['Spices', 'bg-red-50 text-red-300'],
  ['Dairy', 'bg-blue-50 text-blue-300'],
  ['Sugar, Salt', 'bg-slate-50 text-slate-300'],
  ['Snacks', 'bg-orange-50 text-orange-300'],
  ['Beverages', 'bg-cyan-50 text-cyan-300'],
  ['Breakfast', 'bg-lime-50 text-lime-300'],
  ['Personal Care', 'bg-pink-50 text-pink-300'],
  ['Household', 'bg-teal-50 text-teal-300'],
]

export default function ProductImage({ src, alt = '', category = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  const [placeholderFailed, setPlaceholderFailed] = useState(false)
  const categoryLabel = String(category || '')
  useEffect(() => {
    setFailed(false)
    setPlaceholderFailed(false)
  }, [src])

  if (!src || failed) {
    const colors = placeholderColors.find(([label]) => categoryLabel.includes(label))?.[1] || 'bg-brand-50 text-brand-200'
    return (
      <div className={`grid place-items-center ${colors} ${className}`} aria-label={`${categoryLabel || 'Product'} image unavailable`}>
        {placeholderFailed ? (
          <Package className="h-1/3 w-1/3" aria-hidden />
        ) : (
          <img
            src={assetUrl('/images/product-placeholder.svg')}
            alt=""
            aria-hidden="true"
            className="h-3/5 w-3/5 object-contain opacity-60"
            onError={() => setPlaceholderFailed(true)}
          />
        )}
      </div>
    )
  }
  return <img src={assetUrl(src)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-contain ${className}`} />
}
