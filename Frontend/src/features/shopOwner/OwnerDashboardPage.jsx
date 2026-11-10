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
    <div className="space-y-4 p-4 pb-12">
      {/* Top Header matching Storyboard Screen 4 */}
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#3B0764] to-[#4A0E4E] p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/15 p-1 border border-white/20 grid place-items-center text-pink-300 font-bold">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight">
              {shop.shopName || 'Ravi Kirana Store'}
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
              </span>
              <span className="text-[11px] text-pink-200/80 truncate">
                {shop.address || 'Erragadda'}
              </span>
            </div>
          </div>
        </div>

        <Link
          to={ROUTES.ownerNotifications}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
          aria-label="Shop notifications"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Today's Sales Card matching Storyboard Screen 4 */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-center justify-between text-xs font-semibold text-mute">
          <span>Today's Sales</span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
            <TrendingUp className="h-3 w-3" /> +12%
          </span>
        </div>
        <p className="mt-1 text-2xl font-black text-ink">
          {formatCurrency(summary.totalSales ?? 1842)}
        </p>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">New Orders</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-pink-50 text-accent-500">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-ink">{newOrdersCount}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mute">Total Products</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <Package2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-ink">{state.productsCount || 48}</p>
        </div>
      </div>

      {/* Quick Action Shortcuts matching Storyboard Screen 4 */}
      <div className="grid grid-cols-4 gap-2">
        <Link
          to={ROUTES.ownerOrders}
          className="flex flex-col items-center rounded-2xl border border-line bg-white p-3 text-center shadow-card hover:border-pink-200 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-accent-500 mb-1.5">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-ink">Orders</span>
        </Link>

        <Link
          to={ROUTES.ownerProducts}
          className="flex flex-col items-center rounded-2xl border border-line bg-white p-3 text-center shadow-card hover:border-purple-200 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700 mb-1.5">
            <Package2 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-ink">Products</span>
        </Link>

        <Link
          to={ROUTES.ownerSales}
          className="flex flex-col items-center rounded-2xl border border-line bg-white p-3 text-center shadow-card hover:border-blue-200 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 mb-1.5">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-ink">Analytics</span>
        </Link>

        <Link
          to={ROUTES.ownerProfile}
          className="flex flex-col items-center rounded-2xl border border-line bg-white p-3 text-center shadow-card hover:border-emerald-200 transition active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 mb-1.5">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-ink">Shop Info</span>
        </Link>
      </div>

      {/* Recent Orders List matching Storyboard Screen 4 */}
      <section className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-sm font-bold text-ink">Recent Orders</h2>
          <Link
            to={ROUTES.ownerOrders}
            className="text-xs font-bold text-accent-500 hover:underline flex items-center gap-0.5"
          >
            See All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {state.orders.length > 0 ? (
          <div className="divide-y divide-line">
            {state.orders.map((o) => (
              <div key={o._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">#{o._id.slice(-8).toUpperCase()}</span>
                    <OrderStatusBadge status={o.orderStatus} />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-mute">
                    {o.customer?.name || 'Customer'} · {o.items?.length || 1} items
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-ink">{formatCurrency(o.totalAmount)}</p>
                  <p className="text-[10px] text-mute">{formatDateTime(o.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-xs text-mute">
            No orders received yet. Active customer orders will appear here.
          </p>
        )}
      </section>
    </div>
  )
}
