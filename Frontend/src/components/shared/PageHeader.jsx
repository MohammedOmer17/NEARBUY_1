import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ShoppingBag } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { useCaptainAuth } from '../../context/CaptainAuthContext'

export default function PageHeader({
  title,
  back = true,
  fallback = '/customer/home',
  right,
  showCart = true,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const ownerAuth = useOwnerAuth()
  const captainAuth = useCaptainAuth()

  const cartCtx = useCart()
  const itemCount = cartCtx?.itemCount || 0
  const openCart = cartCtx?.openCart

  const isOwnerRoute =
    location.pathname.startsWith('/owner') ||
    location.pathname.startsWith('/shop-owner')
  const isCaptainRoute = location.pathname.startsWith('/captain')
  const isOwnerOrCaptain =
    isOwnerRoute ||
    isCaptainRoute ||
    Boolean(ownerAuth?.owner) ||
    Boolean(captainAuth?.captain)

  const isCustomer =
    !isOwnerOrCaptain &&
    auth?.status === 'authed' &&
    Boolean(auth?.customer)

  const resolvedFallback =
    fallback !== '/customer/home'
      ? fallback
      : isOwnerRoute
        ? '/owner/dashboard'
        : isCaptainRoute
          ? '/captain/home'
          : '/customer/home'

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate(resolvedFallback))

  const shouldRenderCart = Boolean(showCart && isCustomer && openCart)

  const defaultRight =
    shouldRenderCart ? (
      <button
        type="button"
        onClick={openCart}
        aria-label={`Cart, ${itemCount} items`}
        className="relative grid h-10 w-10 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white hover:border-[#EC55C8] transition active:scale-95 shadow-sm"
      >
        <ShoppingBag className="h-5 w-5 text-white" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1 text-[11px] font-bold text-white shadow">
            {itemCount}
          </span>
        )}
      </button>
    ) : null

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#593650] bg-[#100A14]/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur text-white">
      {back && (
        <button
          onClick={goBack}
          aria-label="Go back"
          className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10 active:scale-95 transition"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}
      <h1 className={`min-w-0 flex-1 truncate text-lg font-black text-white ${back ? '' : 'pl-2'}`}>{title}</h1>
      {right !== undefined ? right : defaultRight}
    </header>
  )
}
