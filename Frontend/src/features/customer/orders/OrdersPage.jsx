import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ReceiptText } from 'lucide-react'
import { useAsync } from '../../../hooks/useAsync'
import { orderApi } from '../../../services/api'
import { ROUTES } from '../../../config/routes'
import { formatCurrency, formatDateTime } from '../../../utils/format'
import { TERMINAL } from '../../../utils/orderMeta'
import PageHeader from '../../../components/shared/PageHeader'
import { OrderStatusBadge } from '../../../components/shared/StatusBadge'
import EmptyState from '../../../components/ui/EmptyState'
import ErrorState from '../../../components/ui/ErrorState'
import Skeleton from '../../../components/ui/Skeleton'
import Button from '../../../components/ui/Button'
import ProductImage from '../../../components/shared/ProductImage'

export default function OrdersPage() {
  const [tab, setTab] = useState('active')
  const { data, loading, error, reload } = useAsync(() => orderApi.list(), [])
  const orders = [...(data || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const shown = orders.filter((o) => (tab === 'active') === !TERMINAL.includes(o.status))

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-12">
      <PageHeader title="Your orders" back={false} />
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 rounded-full bg-[#170F1B] border border-[#593650] p-1 shadow-card" role="tablist">
          {[['active', 'Active'], ['past', 'Past']].map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-10 rounded-full text-xs font-bold transition-all duration-150 ${
                tab === k
                  ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/25'
                  : 'text-[#94849A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3 pb-6">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </>
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load your orders" />
          ) : shown.length ? (
            shown.map((o) => {
              const orderItems = Array.isArray(o?.items) ? o.items : []
              const firstItem = orderItems[0]
              return (
                <Link
                  key={o?.id || o?._id}
                  to={ROUTES.order(o?.id || o?._id)}
                  className="block rounded-2xl border border-[#593650] bg-[#211522] p-4 shadow-card transition duration-150 hover:border-[#EC55C8]/60 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white text-sm">{o?.shopName || 'Shop'}</p>
                      <p className="text-xs text-[#94849A]">{formatDateTime(o?.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={o?.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm pt-2 border-t border-[#593650]/60">
                    <div className="flex min-w-0 items-center gap-2">
                      {firstItem && (
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-[#170F1B] border border-[#593650] p-0.5 flex items-center justify-center">
                          <ProductImage
                            src={firstItem.image}
                            alt={firstItem.name || ''}
                            category={firstItem.category || ''}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                      <span className="truncate text-xs text-[#94849A]">
                        {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} · {o?.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center font-bold text-white gap-1">
                      {formatCurrency(o?.totalAmount || 0)}
                      <ChevronRight className="h-4 w-4 text-[#94849A]" />
                    </span>
                  </div>
                </Link>
              )
            })
          ) : (
            <EmptyState
              icon={ReceiptText}
              title={tab === 'active' ? 'No active orders' : 'No past orders'}
              text={tab === 'active' ? 'Orders you place will show up here.' : 'Completed and cancelled orders will appear here.'}
              action={
                tab === 'active' && (
                  <Link to={ROUTES.home}>
                    <Button>Start shopping</Button>
                  </Link>
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
