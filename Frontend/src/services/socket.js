import { io } from 'socket.io-client'
import { SOCKET_URL } from '../config/env'
import { getAuthToken } from './apiClient'

// Shared socket pool to avoid connection multiplication and listener churn
const sharedSockets = new Map()
const subscriberCounts = new Map()
const teardownTimers = new Map()

export function getSocket(role) {
  let resolvedRole = role
  if (!resolvedRole && typeof window !== 'undefined') {
    const p = window.location.pathname
    if (p.startsWith('/captain')) resolvedRole = 'captain'
    else if (p.startsWith('/shop-owner') || p.startsWith('/owner')) resolvedRole = 'owner'
    else resolvedRole = 'customer'
  }

  const token = getAuthToken(resolvedRole)
  const poolKey = `${resolvedRole}`
  const targetUrl = SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)

  let socket = sharedSockets.get(poolKey)

  // Clear any scheduled disconnection
  if (teardownTimers.has(poolKey)) {
    clearTimeout(teardownTimers.get(poolKey))
    teardownTimers.delete(poolKey)
  }

  if (!socket || socket.disconnected) {
    socket = io(targetUrl, {
      auth: { token, role: resolvedRole },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    sharedSockets.set(poolKey, socket)
  }

  const currentCount = subscriberCounts.get(poolKey) || 0
  subscriberCounts.set(poolKey, currentCount + 1)

  // Return a proxy that tracks registered listeners for clean unsubscription
  const activeListeners = new Set()

  return {
    raw: socket,
    get id() { return socket.id },
    get connected() { return socket.connected },
    on(event, callback) {
      activeListeners.add({ event, callback })
      socket.on(event, callback)
      return this
    },
    off(event, callback) {
      socket.off(event, callback)
      return this
    },
    emit(event, ...args) {
      socket.emit(event, ...args)
      return this
    },
    disconnect() {
      // Clean up this caller's listeners without killing connection for other active components
      for (const { event, callback } of activeListeners) {
        socket.off(event, callback)
      }
      activeListeners.clear()

      const remaining = Math.max(0, (subscriberCounts.get(poolKey) || 1) - 1)
      subscriberCounts.set(poolKey, remaining)

      if (remaining === 0) {
        // Grace period before tearing down socket connection
        const timer = setTimeout(() => {
          if ((subscriberCounts.get(poolKey) || 0) === 0) {
            socket.disconnect()
            sharedSockets.delete(poolKey)
          }
          teardownTimers.delete(poolKey)
        }, 3000)
        teardownTimers.set(poolKey, timer)
      }
    },
  }
}

// Backward-compatible export
export function createSocket(role) {
  return getSocket(role)
}
