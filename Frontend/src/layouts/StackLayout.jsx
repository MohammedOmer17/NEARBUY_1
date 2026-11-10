import { Outlet, useLocation } from 'react-router-dom'
import PhoneFrame from './PhoneFrame'
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
    <PhoneFrame className={showCartBar ? 'pb-24' : ''}>
      <Outlet />
      {showCartBar && <CartBar bottom={0} />}
    </PhoneFrame>
  )
}

