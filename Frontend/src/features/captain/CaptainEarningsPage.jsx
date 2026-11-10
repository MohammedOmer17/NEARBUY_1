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
    <div className="pb-20">
      <PageHeader title="Partner Earnings" back={false} />

      <div className="space-y-4 p-4">
        {/* Main Earnings Card */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-pink-600 to-purple-900 p-5 text-white shadow-card">
          <div className="flex items-center justify-between text-brand-100">
            <span className="text-xs font-semibold">Total Payout Balance</span>
            <Wallet className="h-5 w-5" />
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight">{formatCurrency(grandTotal)}</h2>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/10 p-3 text-xs backdrop-blur">
            <div>
              <p className="text-brand-100">Completed Missions</p>
              <p className="font-bold text-white text-sm">{completedDeliveries.length}</p>
            </div>
            <div className="text-right">
              <p className="text-brand-100">Incentive Tier</p>
              <p className="font-bold text-emerald-300">
                {incentiveBonus > 0 ? `+${formatCurrency(incentiveBonus)} Bonus` : 'Level 1 Partner'}
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between text-mute">
              <span className="text-xs font-medium">Base Pay</span>
              <DollarSign className="h-4 w-4 text-brand-600" />
            </div>
            <p className="mt-2 text-xl font-black text-ink">{formatCurrency(totalEarnings)}</p>
            <p className="text-[10px] text-mute mt-1">₹45 / delivery</p>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between text-mute">
              <span className="text-xs font-medium">Cash in Hand</span>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-xl font-black text-ink">{formatCurrency(codCashInHand)}</p>
            <p className="text-[10px] text-mute mt-1">Collected from COD</p>
          </div>
        </div>

        {/* Weekly Settlement Info */}
        <div className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2 font-bold text-ink text-xs">
            <Building className="h-4 w-4 text-brand-600" />
            <span>Bank Settlement Schedule</span>
          </div>
          <p className="text-xs text-mute leading-relaxed">
            NearBuy Captain earnings are automatically settled to your verified UPI/bank account
            every Wednesday. Cash-in-hand collected is reconciled during settlement.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-canvas p-3 text-xs">
            <span className="text-mute">Next Payout Cycle:</span>
            <span className="font-bold text-ink">Upcoming Wednesday</span>
          </div>
        </div>

        {/* Recent Delivery Earnings Log */}
        <div className="rounded-3xl bg-white p-4 shadow-card">
          <h3 className="text-xs font-bold text-ink mb-3">Earnings by Mission</h3>

          {loading ? (
            <div className="py-6 text-center text-xs text-mute">Calculating earnings…</div>
          ) : completedDeliveries.length === 0 ? (
            <div className="py-6 text-center text-xs text-mute">
              No completed missions logged yet. Deliver orders to generate earnings.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {completedDeliveries.map((delivery, idx) => (
                <div
                  key={delivery.orderId || delivery.id || idx}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      Order #{String(delivery.orderId || delivery.id).slice(-6).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-mute">{delivery.shopName || 'Shop'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">+{formatCurrency(PAY_PER_DELIVERY)}</p>
                    <p className="text-[9px] text-mute capitalize">
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
