import { Link, Outlet } from 'react-router-dom'
import { ShoppingBag, Store, Bike } from 'lucide-react'
import { ROUTES } from '../config/routes'
import PhoneFrame from './PhoneFrame'

export default function AuthLayout() {
  return (
    <PhoneFrame className="flex min-h-dvh flex-col bg-gradient-to-b from-[#2A0F5C] via-[#3B0764] to-[#4A0E4E]">
      <div className="px-6 pb-8 pt-[calc(3rem+env(safe-area-inset-top))] text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 shadow-lg shadow-pink-500/30">
          <ShoppingBag className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">NearBuy</h1>
        <p className="mt-1 text-sm font-semibold text-pink-300">Local shopping, made easy.</p>
        <p className="mt-2 text-xs text-purple-200/80">
          Shop from your neighbourhood kirana stores.
        </p>
      </div>

      <main className="flex-1 rounded-t-[32px] bg-white px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-7 shadow-2xl">
        <Outlet />

        <div className="mt-8 border-t border-line pt-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
            Or continue as
          </p>
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <Link
              to={ROUTES.ownerLogin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-canvas p-3 text-xs font-bold text-ink transition hover:border-pink-300 hover:bg-pink-50/40"
            >
              <Store className="h-4 w-4 text-pink-600" />
              <span>Shop Owner</span>
            </Link>
            <Link
              to={ROUTES.captainLogin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-canvas p-3 text-xs font-bold text-ink transition hover:border-pink-300 hover:bg-pink-50/40"
            >
              <Bike className="h-4 w-4 text-purple-600" />
              <span>Delivery Partner</span>
            </Link>
          </div>
        </div>
      </main>
    </PhoneFrame>
  )
}
