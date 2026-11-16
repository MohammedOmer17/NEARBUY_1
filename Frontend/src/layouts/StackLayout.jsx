import { Outlet, useLocation } from 'react-router-dom'
import CartBar from '../components/shared/CartBar'
import { useCart } from '../context/CartContext'

export default function StackLayout() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()

  // Keep cart visible while browsing products, product details, and shop catalogue
  const isBrowsePage =
    pathname.startsWith('/customer/shops/') ||
    pathname.startsWith('/customer/products/') ||
    pathname.startsWith('/customer/notifications')

  const showCartBar = isBrowsePage && itemCount > 0

  return (
    <div className="min-h-screen bg-[#100A14] text-white flex flex-col items-center">
      <div className={`relative w-full max-w-md lg:max-w-4xl min-h-screen bg-[#100A14] ${showCartBar ? 'pb-24' : ''}`}>
        <Outlet />
        {showCartBar && <CartBar bottom={0} />}
      </div>
    </div>
  )
}
