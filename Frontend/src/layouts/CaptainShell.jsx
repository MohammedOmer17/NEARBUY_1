import { NavLink, Outlet } from 'react-router-dom'
import { Home, PackageCheck, Wallet, UserCircle } from 'lucide-react'
import PhoneFrame from './PhoneFrame'
import { ROUTES } from '../config/routes'

const CAPTAIN_TABS = [
  { to: ROUTES.captainHome, label: 'Home', icon: Home },
  { to: ROUTES.captainHistory, label: 'My Orders', icon: PackageCheck },
  { to: ROUTES.captainEarnings, label: 'Earnings', icon: Wallet },
  { to: ROUTES.captainProfile, label: 'Profile', icon: UserCircle },
]

export default function CaptainShell() {
  return (
    <PhoneFrame className="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <Outlet />
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Captain navigation"
      >
        {CAPTAIN_TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                isActive ? 'text-accent-500' : 'text-mute'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </PhoneFrame>
  )
}
