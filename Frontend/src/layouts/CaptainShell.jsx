import { NavLink, Outlet } from 'react-router-dom'
import { Home, PackageCheck, Wallet, UserCircle, Bike, Settings, LogOut } from 'lucide-react'
import { ROUTES } from '../config/routes'
import { useCaptainAuth } from '../context/CaptainAuthContext'

const MOBILE_TABS = [
  { to: ROUTES.captainHome, label: 'Home', icon: Home },
  { to: ROUTES.captainHistory, label: 'My Orders', icon: PackageCheck },
  { to: ROUTES.captainEarnings, label: 'Earnings', icon: Wallet },
  { to: ROUTES.captainProfile, label: 'Profile', icon: UserCircle },
]

const DESKTOP_NAV = [
  { to: ROUTES.captainHome, label: 'Home', icon: Home },
  { to: ROUTES.captainHistory, label: 'Orders', icon: PackageCheck },
  { to: ROUTES.captainEarnings, label: 'Earnings', icon: Wallet },
  { to: ROUTES.captainHistory, label: 'History', icon: PackageCheck },
  { to: ROUTES.captainProfile, label: 'Profile', icon: UserCircle },
  { to: ROUTES.captainProfile, label: 'Settings', icon: Settings },
]

export default function CaptainShell() {
  const { logout } = useCaptainAuth()

  return (
    <div className="min-h-screen bg-[#100A14] text-white flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (>= lg) matching near-buy-6.png */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#593650] bg-[#170F1B] p-5 h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] shadow-md shadow-pink-500/25">
              <Bike className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">NearBuy</span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#EC55C8]">Delivery Captain</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5" aria-label="Captain desktop navigation">
            {DESKTOP_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                end={to === ROUTES.captainHome}
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
          </nav>
        </div>

        <div className="border-t border-[#593650]/60 pt-4">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-danger hover:bg-danger/10 transition"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen bg-[#100A14] flex flex-col">
        <div className="mx-auto w-full max-w-md lg:max-w-6xl flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation (< lg) matching near-buy-5.png */}
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md border-t border-[#593650] bg-[#170F1B]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          aria-label="Captain mobile navigation"
        >
          {MOBILE_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.captainHome}
              className={({ isActive }) =>
                `flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all duration-150 ${
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
