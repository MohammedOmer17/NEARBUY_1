import { useEffect, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building,
  AlertCircle,
} from 'lucide-react'
import { captainApi } from '../../services/api'
import { formatCurrency, formatDate } from '../../utils/format'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'

export default function CaptainEarningsPage() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    captainApi
      .deliveryHistory()
      .then((res) => {
        if (!alive) return
        setDeliveries(Array.isArray(res) ? res : [])
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setDeliveries([])
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const completedDeliveries = deliveries.filter((d) => d.orderStatus === 'completed')

  // Calculate earnings
  const PAY_PER_DELIVERY = 45
  const totalEarnings = completedDeliveries.length * PAY_PER_DELIVERY
  const incentiveBonus = Math.floor(completedDeliveries.length / 5) * 50
  const grandTotal = totalEarnings + incentiveBonus

  // Cash in hand collected from COD orders
  const codCashInHand = completedDeliveries
    .filter((d) => d.paymentMethod === 'cod')
    .reduce((sum, d) => sum + Number(d.totalAmount || 0), 0)

  return (
    <div className="pb-24 text-white">
      <PageHeader title="Earnings & Wallet" back={false} />

      <div className="space-y-4 p-4">
        {/* Main Earnings Card */}
        <div className="rounded-3xl border border-[#593650] bg-gradient-to-br from-[#211522] via-[#2B1B2D] to-[#170F1B] p-5 text-white shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between text-[#C4B4C9]">
            <span className="text-xs font-semibold">Total Partner Earnings</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-[#20C878]/30 px-2 py-0.5 text-[10px] font-bold text-[#20C878]">
                <TrendingUp className="h-3 w-3" /> +12%
              </span>
              <Wallet className="h-5 w-5 text-[#EC55C8]" />
            </div>
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{formatCurrency(grandTotal)}</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#593650] bg-[#170F1B]/80 p-3 text-xs backdrop-blur">
            <div>
              <p className="text-[#94849A]">Completed Orders</p>
              <p className="font-bold text-white text-sm">{completedDeliveries.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[#94849A]">Avg. per Order</p>
              <p className="font-bold text-[#20C878] text-sm">
                {completedDeliveries.length > 0 ? formatCurrency(Math.round(grandTotal / completedDeliveries.length)) : '₹45'}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings Trend Graphic */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Earnings Trend</span>
            <span className="text-[10px] text-[#94849A]">This Week</span>
          </div>

          {/* Stylized Weekly Bars — explicit pixel height so % children resolve */}
          <div
            className="flex items-end justify-between gap-2 px-2 border-b border-[#593650]/40"
            style={{ height: '112px', paddingTop: '16px', paddingBottom: '4px' }}
          >
            {[
              { day: 'Mon', pct: 40, val: '₹180' },
              { day: 'Tue', pct: 65, val: '₹320' },
              { day: 'Wed', pct: 50, val: '₹225' },
              { day: 'Thu', pct: 80, val: '₹410' },
              { day: 'Fri', pct: 95, val: '₹495' },
              { day: 'Sat', pct: 70, val: '₹360' },
              { day: 'Sun', pct: 85, val: '₹430' },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[9px] font-bold text-[#C4B4C9] opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.val}
                </span>
                <div
                  style={{
                    height: `${bar.pct}%`,
                    background: 'linear-gradient(to top, #B65DDA, #EC55C8)',
                    borderRadius: '6px 6px 0 0',
                    width: '100%',
                    transition: 'filter 0.2s',
                  }}
                  className="group-hover:brightness-125"
                />
                <span className="text-[10px] text-[#94849A]">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
            <div className="flex items-center justify-between text-[#94849A]">
              <span className="text-xs font-medium">Base Delivery Pay</span>
              <DollarSign className="h-4 w-4 text-[#EC55C8]" />
            </div>
            <p className="mt-2 text-xl font-black text-white">{formatCurrency(totalEarnings)}</p>
            <p className="text-[10px] text-[#94849A] mt-1">₹45 / delivery</p>
          </div>

          <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
            <div className="flex items-center justify-between text-[#94849A]">
              <span className="text-xs font-medium">Cash in Hand</span>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-xl font-black text-white">{formatCurrency(codCashInHand)}</p>
            <p className="text-[10px] text-[#94849A] mt-1">Collected from COD</p>
          </div>
        </div>

        {/* Weekly Settlement Info */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2 font-bold text-white text-xs">
            <Building className="h-4 w-4 text-[#EC55C8]" />
            <span>Bank Settlement Schedule</span>
          </div>
          <p className="text-xs text-[#94849A] leading-relaxed">
            NearBuy Captain earnings are automatically settled to your verified UPI/bank account
            every Wednesday. Cash-in-hand collected is reconciled during settlement.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs">
            <span className="text-[#94849A]">Next Payout Cycle:</span>
            <span className="font-bold text-white">Upcoming Wednesday</span>
          </div>
        </div>

        {/* Recent Delivery Earnings Log */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card">
          <h3 className="text-xs font-bold text-white mb-3">Recent Transactions</h3>

          {loading ? (
            <div className="py-6 text-center text-xs text-[#94849A]">Calculating earnings…</div>
          ) : completedDeliveries.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#94849A]">
              No completed missions logged yet. Deliver orders to generate earnings.
            </div>
          ) : (
            <div className="divide-y divide-[#593650]/50 text-xs">
              {completedDeliveries.map((delivery, idx) => (
                <div
                  key={delivery.orderId || delivery.id || idx}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-white">
                      Order #{String(delivery.orderId || delivery.id).slice(-6).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-[#94849A]">{delivery.shopName || 'Shop'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#20C878]">+{formatCurrency(PAY_PER_DELIVERY)}</p>
                    <p className="text-[9px] text-[#94849A] capitalize">
                      {delivery.paymentMethod === 'cod' ? 'COD Collected' : 'Online Paid'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
