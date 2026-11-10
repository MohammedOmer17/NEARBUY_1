import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { notificationApi } from '../services/api'
import { createSocket } from '../services/socket'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { customer } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(async () => {
    try {
      const count = await notificationApi.unreadCount()
      setUnread(count)
    } catch {
      /* badge is non-critical */
    }
  }, [])

  useEffect(() => {
    if (!customer) {
      setUnread(0)
      return
    }
    refreshUnread()

    const socket = createSocket('customer')
    socket.on('notification', () => {
      refreshUnread()
    })
    socket.on('order_status_updated', () => {
      refreshUnread()
    })

    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnread()
    }, 45000)

    return () => {
      socket.disconnect()
      clearInterval(t)
    }
  }, [customer?._id, customer?.id, refreshUnread])

  const value = useMemo(() => ({ unread, setUnread, refreshUnread }), [unread, refreshUnread])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export const useNotifications = () => useContext(NotificationContext)
