import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Store, MapPin } from 'lucide-react'
import { ROUTES } from '../../config/routes'
import { assetUrl } from '../../utils/format'
import { formatDistance } from '../../utils/geo'

const ShopCard = memo(function ShopCard({ shop, className = '' }) {
  const distanceText = formatDistance(shop.distanceKm)

  return (
    <Link to={ROUTES.shop(shop.id)} state={{ shop }} className={`block overflow-hidden rounded-2xl border border-[#593650] bg-[#211522] shadow-card transition-all duration-200 hover:border-[#EC55C8]/70 hover:shadow-lg hover:shadow-pink-500/10 active:scale-[0.99] ${className}`}>
      <div className="grid h-24 place-items-center bg-gradient-to-br from-[#2B1B2D] to-[#170F1B] text-[#EC55C8]">
        {shop.image ? <img src={assetUrl(shop.image)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <Store className="h-9 w-9" aria-hidden />}
      </div>
      <div className="p-3">
        <h3 className="truncate text-[15px] font-bold text-white">{shop.name}</h3>
        {shop.address && <p className="mt-0.5 line-clamp-1 text-xs text-[#94849A]">{shop.address}</p>}
        {distanceText ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#2B1B2D] border border-[#593650] px-2.5 py-0.5 text-xs font-semibold text-[#F58AD8]">
            <MapPin className="h-3 w-3" aria-hidden />{distanceText}
          </p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#170F1B] border border-[#593650]/60 px-2.5 py-0.5 text-[11px] font-medium text-[#94849A]">
            <MapPin className="h-3 w-3" aria-hidden />Distance unavailable
          </p>
        )}
      </div>
    </Link>
  )
})

export default ShopCard
