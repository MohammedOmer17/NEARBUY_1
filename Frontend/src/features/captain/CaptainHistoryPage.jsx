import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PackageCheck,
  Calendar,
  Store,
  MapPin,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { captainApi } from '../../services/api'
import { ROUTES } from '../../config/routes'
import { formatCurrency, formatDateTime } from '../../utils/format'
import PageHeader from '../../components/shared/PageHeader'

export default function CaptainHistoryPage() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

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

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === 'completed') return d.orderStatus === 'completed'
    if (filter === 'active') return ['ready', 'picked_up', 'out_for_delivery'].includes(d.orderStatus)
    return true
  })

  return (
    <div className="pb-24 text-white">
      <PageHeader title="Delivery History" back={false} />

      <div className="space-y-4 p-4">
        {/* Filter Pills */}
        <div className="flex rounded-2xl border border-[#593650] bg-[#170F1B] p-1">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'completed', label: 'Completed' },
            { id: 'active', label: 'Active / Transit' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                filter === id
                  ? 'bg-[#211522] text-[#EC55C8] border border-[#EC55C8]/40 shadow-sm'
                  : 'text-[#94849A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#94849A]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#EC55C8] border-t-transparent mb-2" />
            <p className="text-xs">Loading delivery history…</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#593650] bg-[#211522] p-8 text-center shadow-card">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#170F1B] border border-[#593650] text-[#94849A] mb-2">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Deliveries Found</h3>
            <p className="mt-1 text-xs text-[#94849A] max-w-xs">
              {filter === 'completed'
                ? 'You have not completed any deliveries yet. Accept missions on the home tab to earn.'
                : 'No delivery logs match your selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeliveries.map((delivery) => {
              const id = delivery.orderId || delivery.id
              const isCompleted = delivery.orderStatus === 'completed'
              const payout = 45 // Standard per delivery partner compensation

              return (
                <div
                  key={id}
                  className="rounded-3xl border border-[#593650] bg-[#211522] p-4 shadow-card transition hover:border-[#EC55C8]/50"
                >
                  <div className="flex items-center justify-between border-b border-[#593650]/50 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-black text-[#EC55C8]">
                        #{String(id).slice(-6).toUpperCase()}
                      </span>
                      <p className="text-[10px] text-[#94849A]">
                        {delivery.createdAt ? formatDateTime(delivery.createdAt) : 'Recent mission'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          isCompleted
                            ? 'bg-emerald-950/60 border-[#20C878]/30 text-[#20C878]'
                            : 'bg-pink-950/60 border-[#EC55C8]/30 text-[#EC55C8]'
                        }`}
                      >
                        {delivery.orderStatus.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[10px] font-bold text-[#20C878] mt-0.5">
                        Earned: {formatCurrency(payout)}
                      </p>
                    </div>
                  </div>

                  {/* Route points */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Store className="h-3.5 w-3.5 shrink-0 text-[#B65DDA] mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">{delivery.shopName || 'Shop'}</p>
                        <p className="text-[10px] text-[#94849A] truncate max-w-[240px]">
                          {delivery.shopAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#EC55C8] mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">{delivery.customerName || 'Customer'}</p>
                        <p className="text-[10px] text-[#94849A] truncate max-w-[240px]">
                          {delivery.deliveryAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-3 flex items-center justify-between border-t border-[#593650]/50 pt-2.5 text-xs">
                    <span className="text-[11px] text-[#94849A]">
                      Order Value: <strong className="text-white">{formatCurrency(delivery.totalAmount)}</strong>
                    </span>

                    <Link
                      to={ROUTES.captainDelivery(id)}
                      className="flex items-center gap-1 text-xs font-bold text-[#EC55C8] hover:text-[#F58AD8] transition-colors"
                    >
                      <span>Mission Info</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
