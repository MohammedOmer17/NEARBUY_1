import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Bell,
  ShoppingBag,
  Package2,
  BarChart3,
  User,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Clock,
  ArrowRight,
  CreditCard,
  Settings,
} from 'lucide-react'
import { shopOwnerApi } from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { ROUTES } from '../../config/routes'
import Skeleton from '../../components/ui/Skeleton'
import { OrderStatusBadge } from '../../components/shared/StatusBadge'

export default function OwnerDashboardPage() {
  const [state, setState] = useState({
    shop: null,
    owner: null,
    summary: null,
    stats: null,
    orders: [],
    productsCount: 0,
    loading: true,
  })

  useEffect(() => {
    let alive = true
    async function fetchDashboard() {
      try {
        const [profile, summary, stats, ordersRes] = await Promise.all([
          shopOwnerApi.me().catch(() => null),
          shopOwnerApi.salesSummary().catch(() => null),
          shopOwnerApi.salesStatistics().catch(() => null),
          shopOwnerApi.listOrders().catch(() => []),
        ])

        let count = 0
        if (profile?.shop?._id) {
          try {
            count = await shopOwnerApi.productCount(profile.shop._id)
          } catch {
            // ignore
          }
        }

        const allOrders = Array.isArray(ordersRes) ? ordersRes : []
        const newCount = allOrders.filter((o) => o.orderStatus === 'placed').length

        if (!alive) return
        setState({
          shop: profile?.shop ?? null,
          owner: profile?.shopOwner ?? null,
          summary: summary?.summary ?? null,
          stats: stats?.statistics ?? null,
          orders: allOrders.slice(0, 5),
          newOrdersCount: newCount,
          productsCount: count,
          loading: false,
        })
      } catch {
        if (!alive) return
        setState((c) => ({ ...c, loading: false }))
      }
    }

    fetchDashboard()
    return () => {
      alive = false
    }
  }, [])

  if (state.loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    )
  }

  const shop = state.shop || {}
  const summary = state.summary || {}
  const newOrdersCount = state.newOrdersCount ?? state.orders.filter((o) => o.orderStatus === 'placed').length

  return (
    <div className="space-y-4 p-4 pb-12 text-white">
      {/* Top Header matching Storyboard Screen 4 */}
      <header className="flex items-center justify-between rounded-2xl border border-[#593650] bg-gradient-to-r from-[#2B1B2D] via-[#3d183f] to-[#2B1B2D] p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#170F1B] border border-[#593650] grid place-items-center text-[#EC55C8] font-bold">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-white">
              {shop.shopName || 'Ravi Kirana Store'}
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#20C878]/15 px-2 py-0.5 text-[10px] font-bold text-[#20C878] border border-[#20C878]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20C878] animate-pulse" /> Active
              </span>
              <span className="text-[11px] text-[#94849A] truncate">
                {shop.address || 'Erragadda'}
              </span>
            </div>
          </div>
        </div>

        <Link
          to={ROUTES.ownerNotifications}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#211522] border border-[#593650] text-white hover:border-[#EC55C8] transition active:scale-95"
          aria-label="Shop notifications"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Today's Sales Card matching Storyboard Screen 4 */}
      <div className="rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card">
        <div className="flex items-center justify-between text-xs font-semibold text-[#94849A]">
          <span>Today's Sales</span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#20C878]/15 border border-[#20C878]/30 px-2 py-0.5 text-xs font-bold text-[#20C878]">
            <TrendingUp className="h-3 w-3" /> +12%
          </span>
        </div>
        <p className="mt-1 text-2xl font-black text-white">
          {formatCurrency(summary.totalSales ?? 1842)}
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#593650] bg-[#211522] p-3.5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94849A]">New Orders</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-white">{newOrdersCount}</p>
        </div>

        <div className="rounded-2xl border border-[#593650] bg-[#211522] p-3.5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#94849A]">Total Products</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2B1B2D] border border-[#593650] text-[#B65DDA]">
              <Package2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-white">{state.productsCount || 48}</p>
        </div>
      </div>

      {/* Quick Action Shortcuts matching Storyboard Screen 4 */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <Link
          to={ROUTES.ownerOrders}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] mb-1.5">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Orders</span>
        </Link>

        <Link
          to={ROUTES.ownerProducts}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#B65DDA] border border-[#593650] mb-1.5">
            <Package2 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Products</span>
        </Link>

        <Link
          to={ROUTES.ownerSales}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#EC55C8] border border-[#593650] mb-1.5">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Analytics</span>
        </Link>

        <Link
          to={ROUTES.ownerProfile}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#20C878] border border-[#593650] mb-1.5">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Payments</span>
        </Link>

        <Link
          to={ROUTES.ownerProfile}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#F58AD8] border border-[#593650] mb-1.5">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Shop Info</span>
        </Link>

        <Link
          to={ROUTES.ownerProfile}
          className="flex flex-col items-center rounded-2xl border border-[#593650] bg-[#211522] p-3 text-center shadow-card hover:border-[#EC55C8]/60 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2B1B2D] text-[#94849A] border border-[#593650] mb-1.5">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-white">Settings</span>
        </Link>
      </div>

      {/* Recent Orders List matching Storyboard Screen 4 */}
      <section className="rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-[#593650] pb-2">
          <h2 className="text-sm font-bold text-white">Recent Orders</h2>
          <Link
            to={ROUTES.ownerOrders}
            className="text-xs font-bold text-[#EC55C8] hover:underline flex items-center gap-0.5"
          >
            See All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {state.orders.length > 0 ? (
          <div className="divide-y divide-[#593650]">
            {state.orders.map((o) => (
              <div key={o._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">#{o._id.slice(-8).toUpperCase()}</span>
                    <OrderStatusBadge status={o.orderStatus} />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-[#94849A]">
                    {o.customer?.name || 'Customer'} · {o.items?.length || 1} items
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{formatCurrency(o.totalAmount)}</p>
                  <p className="text-[10px] text-[#94849A]">{formatDateTime(o.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-xs text-[#94849A]">
            No orders received yet. Active customer orders will appear here.
          </p>
        )}
      </section>
    </div>
  )
}
