import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, ReceiptText, User, ShoppingBag, ShoppingCart, HelpCircle, Settings, Store } from 'lucide-react'
import PhoneFrame from './PhoneFrame'
import CartBar from '../components/shared/CartBar'
import { useCart } from '../context/CartContext'
import { ROUTES } from '../config/routes'

const MOBILE_TABS = [
  { to: ROUTES.home, label: 'Home', icon: Home },
  { to: ROUTES.orders, label: 'Orders', icon: ReceiptText },
  { to: ROUTES.profile, label: 'Profile', icon: User },
]

const DESKTOP_NAV = [
  { to: ROUTES.home, label: 'Home', icon: Home },
  { to: ROUTES.home, label: 'Shop', icon: Store },
  { to: ROUTES.orders, label: 'Orders', icon: ReceiptText },
  { to: ROUTES.profile, label: 'Profile', icon: User },
]

export default function TabsLayout() {
  const { itemCount, openCart } = useCart()
  const hasCart = itemCount > 0
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#100A14] text-white flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (>= lg) matching near-buy-2.png */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#593650] bg-[#170F1B] p-5 h-screen sticky top-0">
        <div className="space-y-6">
          {/* NearBuy Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] shadow-md shadow-pink-500/25">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">NearBuy</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Desktop Main Navigation">
            {DESKTOP_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                end={to === ROUTES.home}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#EC55C8]/20 to-[#B65DDA]/20 text-white border border-[#EC55C8]/40 shadow-sm'
                      : 'text-[#94849A] hover:bg-[#211522] hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}

            {/* Desktop Cart Button */}
            <button
              type="button"
              onClick={openCart}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold text-[#94849A] hover:bg-[#211522] hover:text-white transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 shrink-0" />
                <span>Cart</span>
              </div>
              {itemCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-1.5 text-xs font-bold text-white shadow">
                  {itemCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Bottom Secondary Links */}
        <div className="border-t border-[#593650]/60 pt-4 space-y-1">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#94849A] hover:bg-[#211522] hover:text-white transition"
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span>Support</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#94849A] hover:bg-[#211522] hover:text-white transition"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen bg-[#100A14] flex flex-col">
        {/* On mobile (< lg): Phone frame container */}
        <div className={`mx-auto w-full max-w-md lg:max-w-5xl flex-1 ${hasCart ? 'pb-[calc(8.75rem+env(safe-area-inset-bottom))] lg:pb-8' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8'}`}>
          <Outlet />
        </div>

        {/* Mobile Sticky Cart Bar */}
        {hasCart && (
          <div className="lg:hidden">
            <CartBar />
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (< lg) matching near-buy-1.png */}
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md border-t border-[#593650] bg-[#170F1B]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          aria-label="Mobile Main Navigation"
        >
          {MOBILE_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.home}
              className={({ isActive }) =>
                `flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-bold transition-all duration-150 ${
                  isActive ? 'text-[#EC55C8]' : 'text-[#94849A] hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
