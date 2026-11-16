import { useEffect, useState } from 'react'
import { Bell, Trash2, ShoppingBag, CreditCard, CheckCircle, Info } from 'lucide-react'
import { useAsync } from '../../../hooks/useAsync'
import { useNotifications } from '../../../context/NotificationContext'
import { useToast } from '../../../context/ToastContext'
import { notificationApi } from '../../../services/api'
import { getErrorMessage } from '../../../services/apiClient'
import { formatDateTime } from '../../../utils/format'
import PageHeader from '../../../components/shared/PageHeader'
import EmptyState from '../../../components/ui/EmptyState'
import ErrorState from '../../../components/ui/ErrorState'
import Skeleton from '../../../components/ui/Skeleton'

export default function NotificationsPage() {
  const { showToast } = useToast()
  const { setUnread, refreshUnread } = useNotifications()
  const { data, loading, error, reload } = useAsync(() => notificationApi.list(), [])
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'orders' | 'system'

  useEffect(() => {
    if (data) setItems(data)
  }, [data])

  const unreadCount = items.filter((n) => !n.isRead).length
  useEffect(() => {
    if (data) setUnread(data.filter((n) => !n.isRead).length)
  }, [data, setUnread])

  const open = async (n) => {
    if (n.isRead) return
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
    try {
      await notificationApi.markRead(n.id)
    } catch (e) {
      showToast(getErrorMessage(e), 'error')
      reload({ silent: true })
    }
    refreshUnread()
  }

  const readAll = async () => {
    setItems((l) => l.map((x) => ({ ...x, isRead: true })))
    try {
      await notificationApi.markAllRead()
      setUnread(0)
      showToast('All notifications marked as read')
    } catch (e) {
      showToast(getErrorMessage(e), 'error')
      reload({ silent: true })
    }
  }

  const remove = async (n) => {
    const prev = items
    setItems((l) => l.filter((x) => x.id !== n.id))
    try {
      await notificationApi.remove(n.id)
      refreshUnread()
    } catch (e) {
      setItems(prev)
    }
  }

  const getNotificationIcon = (title, msg) => {
    const text = (title + ' ' + msg).toLowerCase()
    if (text.includes('paid') || text.includes('payment')) {
      return <CreditCard className="h-4 w-4 text-[#20C878]" />
    }
    if (text.includes('ready') || text.includes('picked') || text.includes('order')) {
      return <ShoppingBag className="h-4 w-4 text-[#EC55C8]" />
    }
    return <Info className="h-4 w-4 text-[#B65DDA]" />
  }

  const filteredItems = items.filter((n) => {
    if (activeTab === 'all') return true
    const text = (n.title + ' ' + n.message).toLowerCase()
    if (activeTab === 'orders') return text.includes('order') || text.includes('item')
    if (activeTab === 'system') return !text.includes('order')
    return true
  })

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-12">
      <PageHeader
        title="Notifications"
        right={
          unreadCount > 0 && (
            <button
              onClick={readAll}
              className="mr-1 rounded-full px-3 py-1.5 text-xs font-bold text-[#EC55C8] hover:underline transition"
            >
              Mark all read
            </button>
          )
        }
      />

      <div className="px-4 pt-3 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            ['all', 'All'],
            ['orders', 'Orders'],
            ['system', 'System'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
                activeTab === k
                  ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-md shadow-pink-500/20'
                  : 'bg-[#211522] border border-[#593650] text-[#94849A] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </>
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load notifications" />
          ) : filteredItems.length ? (
            filteredItems.map((n) => (
              <div
                key={n.id}
                onClick={() => open(n)}
                className={`relative flex items-start gap-3 rounded-2xl border p-3.5 transition cursor-pointer ${
                  n.isRead
                    ? 'border-[#593650]/60 bg-[#170F1B] opacity-80'
                    : 'border-[#EC55C8]/50 bg-[#211522] shadow-sm shadow-pink-500/10'
                }`}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650]">
                  {getNotificationIcon(n.title, n.message)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-xs font-bold text-white">{n.title}</h3>
                    <span className="text-[10px] text-[#94849A] shrink-0">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#C4B4C9] leading-relaxed">{n.message}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(n)
                  }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#94849A] hover:text-danger hover:bg-danger/10 transition"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              text="Updates about your orders and delivery statuses will appear here."
            />
          )}
        </div>
      </div>
    </div>
  )
}
