import { Link, Outlet } from 'react-router-dom'
import { ShoppingBag, Store, Bike } from 'lucide-react'
import { ROUTES } from '../config/routes'

export default function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#100A14] bg-radial from-[#2B1B2D]/60 via-[#170F1B] to-[#100A14] p-4 text-white">
      <div className="w-full max-w-md flex flex-col">
        {/* Brand Header */}
        <div className="px-6 pb-6 pt-6 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] shadow-lg shadow-pink-500/30">
            <ShoppingBag className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">NearBuy</h1>
          <p className="mt-1 text-sm font-bold text-[#F58AD8]">Local shopping, made easy.</p>
          <p className="mt-1 text-xs text-[#94849A]">
            Manage your shop and grow your business.
          </p>
        </div>

        {/* Card Body */}
        <main className="rounded-[28px] border border-[#593650] bg-[#211522] px-6 py-7 shadow-2xl">
          <Outlet />

          <div className="mt-7 border-t border-[#593650] pt-5">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#94849A]">
              Or continue as
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <Link
                to={ROUTES.ownerLogin}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8] hover:bg-[#2B1B2D]"
              >
                <Store className="h-4 w-4 text-[#EC55C8]" />
                <span>Shop Owner</span>
              </Link>
              <Link
                to={ROUTES.captainLogin}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8] hover:bg-[#2B1B2D]"
              >
                <Bike className="h-4 w-4 text-[#B65DDA]" />
                <span>Delivery Partner</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
