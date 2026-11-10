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
      showToast(getErrorMessage(e), 'error')
    }
  }

  const getNotificationIcon = (title, msg) => {
    const text = (title + ' ' + msg).toLowerCase()
    if (text.includes('paid') || text.includes('payment')) {
      return <CreditCard className="h-4 w-4 text-emerald-600" />
    }
    if (text.includes('ready') || text.includes('picked') || text.includes('order')) {
      return <ShoppingBag className="h-4 w-4 text-accent-500" />
    }
    return <Info className="h-4 w-4 text-purple-600" />
  }

  const filteredItems = items.filter((n) => {
    if (activeTab === 'all') return true
    const text = (n.title + ' ' + n.message).toLowerCase()
    if (activeTab === 'orders') return text.includes('order') || text.includes('item')
    if (activeTab === 'system') return !text.includes('order')
    return true
  })

  return (
    <div className="pb-12">
      <PageHeader
        title="Notifications"
        right={
          unreadCount > 0 && (
            <button
              onClick={readAll}
              className="mr-1 rounded-full px-3 py-1.5 text-xs font-bold text-accent-500 active:bg-pink-50 transition"
            >
              Mark all read
            </button>
          )
        }
      />

      <div className="px-4 pt-3 space-y-3">
        {/* Filter Tabs matching Storyboard Screen 11 */}
        <div className="flex gap-2">
          {[
            ['all', 'All'],
            ['orders', 'Orders'],
            ['system', 'System'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                activeTab === key
                  ? 'bg-accent-500 text-white shadow-xs'
                  : 'bg-white text-mute border border-line hover:bg-canvas'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 pt-1">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </>
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load notifications" />
          ) : filteredItems.length ? (
            filteredItems.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-2xl p-3.5 shadow-card border transition ${
                  n.isRead ? 'bg-white border-line' : 'bg-pink-50/40 border-pink-100'
                }`}
              >
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas border border-line">
                  {getNotificationIcon(n.title, n.message)}
                </div>

                <button
                  onClick={() => open(n)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                  aria-label={`${n.title}${n.isRead ? '' : ', unread'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-ink truncate">{n.title}</span>
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                    )}
                  </div>
                  <span className="mt-0.5 text-xs leading-relaxed text-mute">{n.message}</span>
                  <span className="mt-1 text-[10px] text-mute/80">{formatDateTime(n.createdAt)}</span>
                </button>

                <button
                  onClick={() => remove(n)}
                  aria-label="Delete notification"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:text-danger active:bg-danger-50 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Bell}
              title="You are all caught up"
              text="Order updates and system notifications will appear here."
            />
          )}
        </div>
      </div>
    </div>
  )
}
