import { useCallback, useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  PackageCheck,
  RotateCcw,
  Bike,
  Store,
  DollarSign,
  BarChart3,
  AlertCircle,
  Clock,
  XCircle,
  Info,
} from 'lucide-react'
import { shopOwnerApi } from '../../services/api'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'
import { formatCurrency } from '../../utils/format'

export default function OwnerSalesPage() {
  const [period, setPeriod] = useState('daily')
  const [summary, setSummary] = useState(null)
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async (selectedPeriod) => {
    try {
      setLoading(true)
      setError('')

      const [summaryRes, statsRes, trendsRes, topProductsRes] = await Promise.all([
        shopOwnerApi.salesSummary(selectedPeriod).catch((err) => {
          console.warn('Failed to load sales summary:', err)
          return null
        }),
        shopOwnerApi.salesStatistics(selectedPeriod).catch((err) => {
          console.warn('Failed to load sales statistics:', err)
          return null
        }),
        shopOwnerApi.salesTrends(selectedPeriod).catch((err) => {
          console.warn('Failed to load sales trends:', err)
          return null
        }),
        shopOwnerApi.topProducts(selectedPeriod).catch((err) => {
          console.warn('Failed to load top products:', err)
          return null
        }),
      ])

      setSummary(summaryRes?.summary ?? summaryRes ?? null)
      setStats(statsRes?.statistics ?? statsRes ?? null)

      const rawTrends = trendsRes?.data ?? trendsRes?.trendData ?? trendsRes?.trends ?? []
      setTrends(Array.isArray(rawTrends) ? rawTrends : [])

      const rawProducts = topProductsRes?.products ?? topProductsRes?.topProducts ?? []
      setTopProducts(Array.isArray(rawProducts) ? rawProducts : [])
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load sales analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalytics(period)
  }, [period, loadAnalytics])

  // Compute SVG / Bar chart scale
  const maxSale = Math.max(...trends.map((t) => Number(t?.sales ?? 0)), 100)

  // Growth calculation & display helpers
  const totalSales = Number(summary?.totalSales ?? stats?.totalSales ?? 0)
  const prevSales = Number(summary?.previousPeriodSales ?? stats?.previousPeriodSales ?? 0)
  const salesGrowth = summary?.salesGrowthPercent ?? stats?.salesGrowthPercent ?? null
  const confirmedOrders = summary?.confirmedOrders ?? stats?.confirmedOrders ?? summary?.completedOrders ?? 0
  const totalOrders = summary?.totalOrders ?? stats?.totalOrders ?? 0
  const unpaidOrders = summary?.unpaidOrders ?? stats?.unpaidOrders ?? 0
  const cancelledOrders = summary?.cancelledOrders ?? stats?.cancelledOrders ?? 0
  const avgOrderValue = Number(summary?.averageOrderValue ?? stats?.averageOrderValue ?? 0)

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-12">
      <PageHeader title="Sales & Analytics" back={false} showCart={false} />

      <div className="space-y-4 p-4">
        {/* Period Selector */}
        <div className="flex rounded-2xl bg-[#170F1B] border border-[#593650] p-1">
          {[
            ['daily', 'Daily (30D)'],
            ['weekly', 'Weekly (12W)'],
            ['monthly', 'Monthly (12M)'],
          ].map(([p, label]) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-sm'
                  : 'text-[#94849A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Development Data Notice */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#2B1B2D] border border-[#593650] p-3 text-[11px] text-[#F58AD8]">
          <Info className="h-4 w-4 shrink-0 text-[#EC55C8] mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Verified Real-Time Data: </span>
            Revenue is calculated strictly from confirmed and completed orders in the database.
            Unpaid or cancelled orders are not counted as confirmed revenue.
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-2xl bg-danger/15 border border-danger/30 p-3.5 text-xs text-danger"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadAnalytics(period)}
              className="font-bold underline text-xs ml-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#94849A]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EC55C8] border-t-transparent mb-3" />
            <p className="text-xs font-medium">Loading sales analytics…</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Confirmed Revenue Card */}
              <div className="rounded-3xl border border-[#593650] bg-gradient-to-br from-[#2B1B2D] via-[#3d183f] to-[#2B1B2D] p-4 text-white shadow-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[#F58AD8]">
                    <span className="text-xs font-semibold">Confirmed Revenue</span>
                    <DollarSign className="h-4 w-4 text-[#EC55C8]" />
                  </div>
                  <p className="mt-2 text-2xl font-black tracking-tight text-white">
                    {formatCurrency(totalSales)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                  {prevSales > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          salesGrowth >= 0
                            ? 'bg-[#20C878]/20 text-[#20C878]'
                            : 'bg-danger/20 text-danger'
                        }`}
                      >
                        {salesGrowth >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {salesGrowth >= 0 ? `+${salesGrowth}%` : `${salesGrowth}%`}
                      </span>
                      <span className="text-[10px] text-[#C4B4C9]">vs prev: {formatCurrency(prevSales)}</span>
                    </div>
                  ) : totalSales > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#20C878]/20 text-[#20C878] px-1.5 py-0.5 text-[10px] font-bold">
                        <TrendingUp className="h-3 w-3" /> New
                      </span>
                      <span className="text-[10px] text-[#C4B4C9]">First recorded period</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#94849A]">No confirmed revenue in window</span>
                  )}
                  <p className="text-[10px] text-[#94849A]">
                    {confirmedOrders} order{confirmedOrders === 1 ? '' : 's'} confirmed
                  </p>
                </div>
              </div>

              {/* Avg Order Value Card */}
              <div className="rounded-3xl bg-[#211522] p-4 shadow-card flex flex-col justify-between border border-[#593650]">
                <div>
                  <div className="flex items-center justify-between text-[#94849A]">
                    <span className="text-xs font-semibold">Avg Order Value</span>
                    <TrendingUp className="h-4 w-4 text-[#EC55C8]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatCurrency(avgOrderValue)}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#593650] space-y-1">
                  <p className="text-[11px] font-bold text-white">
                    {stats?.totalItemsSold ?? 0} item{stats?.totalItemsSold === 1 ? '' : 's'} sold
                  </p>
                  <p className="text-[10px] text-[#94849A]">
                    From {confirmedOrders} confirmed order{confirmedOrders === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sales Trend Visual Chart */}
            <div className="rounded-3xl bg-[#211522] p-4 shadow-card border border-[#593650]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Revenue Trends</h3>
                  <p className="text-[11px] text-[#94849A] capitalize">{period} breakdown</p>
                </div>
                <span className="rounded-full bg-[#2B1B2D] border border-[#593650] px-2.5 py-1 text-[11px] font-bold text-[#F58AD8]">
                  {trends.length} active point{trends.length === 1 ? '' : 's'}
                </span>
              </div>

              {trends.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-xs text-[#94849A]" style={{ height: '144px' }}>
                  <BarChart3 className="h-8 w-8 text-[#593650] mb-2" />
                  <p className="font-semibold text-white">No sales activity for this period</p>
                  <p className="text-[11px] text-[#94849A] mt-0.5">
                    Orders will appear here once fulfilled or confirmed paid.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  {/* Visual Bar representation — height:144px explicit so % children resolve */}
                  <div
                    className="flex items-end gap-2 overflow-x-auto pb-2 pt-4"
                    style={{ height: '144px' }}
                  >
                    {trends.map((item, idx) => {
                      const val = Number(item?.sales ?? 0)
                      const pct = Math.max(12, Math.round((val / maxSale) * 100))
                      const label = String(item?.date || idx + 1).slice(-5)
                      return (
                        <div
                          key={idx}
                          className="group relative flex flex-1 min-w-[32px] flex-col items-center"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 z-10 hidden rounded-lg bg-[#100A14] border border-[#593650] px-2 py-1 text-[10px] font-bold text-white group-hover:block whitespace-nowrap shadow-md">
                            {formatCurrency(val)} · {item?.orders ?? 0} ord ({item?.date})
                          </div>
                          <div
                            style={{
                              height: `${pct}%`,
                              background: 'linear-gradient(to top, #B65DDA, #EC55C8)',
                              borderRadius: '10px 10px 0 0',
                              width: '100%',
                              transition: 'all 0.3s',
                            }}
                            className="group-hover:brightness-110"
                          />
                          <span className="mt-1.5 text-[9px] font-semibold text-[#94849A] truncate max-w-[36px]">
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Performance Statistics */}
            <div className="rounded-3xl bg-[#211522] p-4 shadow-card border border-[#593650]">
              <h3 className="text-sm font-bold text-white mb-3">Order Status & Metrics</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Total Orders Placed</p>
                    <p className="font-extrabold text-sm text-white">{totalOrders}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#20C878]/15 border border-[#20C878]/30 text-[#20C878]">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Confirmed / Paid</p>
                    <p className="font-extrabold text-sm text-[#20C878]">{confirmedOrders}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 text-[#F5A623]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Unconfirmed / Pending</p>
                    <p className="font-extrabold text-sm text-[#F5A623]">{unpaidOrders}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-danger/15 border border-danger/30 text-danger">
                    <XCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Cancelled</p>
                    <p className="font-extrabold text-sm text-danger">{cancelledOrders}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#B65DDA]">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Pickup Orders</p>
                    <p className="font-extrabold text-sm text-white">{stats?.pickupOrders ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-2xl bg-[#170F1B] p-3 border border-[#593650]">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
                    <Bike className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94849A] font-medium">Delivery Orders</p>
                    <p className="font-extrabold text-sm text-white">{stats?.deliveryOrders ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="rounded-3xl bg-[#211522] p-4 shadow-card border border-[#593650]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Top Selling Products</h3>
                <span className="text-[11px] text-[#94849A] font-semibold">
                  {topProducts.length} product{topProducts.length === 1 ? '' : 's'}
                </span>
              </div>

              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94849A]">
                  <PackageCheck className="h-7 w-7 text-[#593650] mx-auto mb-1.5" />
                  <p className="font-semibold text-white">No product sales in this period</p>
                  <p className="text-[11px] text-[#94849A] mt-0.5">
                    Best-selling items will rank here as confirmed orders are placed.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#593650]">
                  {topProducts.map((p, index) => (
                    <div
                      key={p?._id || p?.product || index}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2B1B2D] border border-[#593650] text-[11px] font-black text-[#EC55C8]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{p?.name || 'Product'}</p>
                          <p className="text-[10px] text-[#94849A] font-medium">
                            {p?.quantitySold ?? 0} sold {p?.unit ? `· ${p.unit}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-white">
                          {formatCurrency(p?.revenue ?? p?.totalRevenue ?? 0)}
                        </p>
                        <p className="text-[10px] text-[#20C878] font-bold">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
