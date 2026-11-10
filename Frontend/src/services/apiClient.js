import axios from 'axios'
import { API_BASE_URL } from '../config/env'

let activeTokens = {
  customer: typeof window !== 'undefined' ? (localStorage.getItem('nearbuy_customer_token') || localStorage.getItem('nearbuy_token')) : null,
  owner: typeof window !== 'undefined' ? localStorage.getItem('nearbuy_owner_token') : null,
  captain: typeof window !== 'undefined' ? localStorage.getItem('nearbuy_captain_token') : null,
}

export function setAuthToken(token, role = 'customer') {
  if (role === 'owner') activeTokens.owner = token
  else if (role === 'captain') activeTokens.captain = token
  else activeTokens.customer = token

  if (typeof window !== 'undefined') {
    const key = role === 'owner' ? 'nearbuy_owner_token' : role === 'captain' ? 'nearbuy_captain_token' : 'nearbuy_customer_token'
    if (token) {
      localStorage.setItem(key, token)
      if (role === 'customer') {
        localStorage.setItem('nearbuy_token', token)
      }
    } else {
      localStorage.removeItem(key)
      if (role === 'customer') {
        localStorage.removeItem('nearbuy_token')
      }
    }
  }
}

export function getAuthToken(role) {
  if (typeof window !== 'undefined') {
    let resolvedRole = role
    if (!resolvedRole) {
      const p = window.location.pathname
      if (p.startsWith('/captain')) resolvedRole = 'captain'
      else if (p.startsWith('/shop-owner') || p.startsWith('/owner')) resolvedRole = 'owner'
      else resolvedRole = 'customer'
    }

    if (resolvedRole === 'owner') {
      activeTokens.owner = localStorage.getItem('nearbuy_owner_token')
      return activeTokens.owner
    }
    if (resolvedRole === 'captain') {
      activeTokens.captain = localStorage.getItem('nearbuy_captain_token')
      return activeTokens.captain
    }
    if (resolvedRole === 'customer') {
      activeTokens.customer = localStorage.getItem('nearbuy_customer_token') || localStorage.getItem('nearbuy_token')
      return activeTokens.customer
    }
  }
  return role ? activeTokens[role] : (activeTokens.customer || activeTokens.owner || activeTokens.captain)
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
})

apiClient.interceptors.request.use((config) => {
  const url = config.url || ''
  let role = config.role
  if (!role) {
    if (
      url.startsWith('/shop-owner') ||
      url.startsWith('/shop/') ||
      url.startsWith('/sales') ||
      url.startsWith('/maps/shop-') ||
      (url.startsWith('/shop-products') && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase()))
    ) {
      role = 'owner'
    } else if (url.startsWith('/captain') || url.startsWith('/maps/captain-')) {
      role = 'captain'
    } else if (
      url.startsWith('/User') ||
      url.startsWith('/cart') ||
      url.startsWith('/orders') ||
      url.startsWith('/notifications')
    ) {
      role = 'customer'
    }
  }

  const token = getAuthToken(role)
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (role) {
    config.headers['x-role'] = role
    if (role === 'owner' && token) config.headers['x-owner-token'] = token
    if (role === 'captain' && token) config.headers['x-captain-token'] = token
    if (role === 'customer' && token) config.headers['x-customer-token'] = token
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.skipAuthEvent) {
      const url = err.config?.url || ''
      let role = err.config?.role
      if (!role) {
        if (
          url.startsWith('/shop-owner') ||
          url.startsWith('/shop/') ||
          url.startsWith('/sales') ||
          url.startsWith('/maps/shop-')
        ) {
          role = 'owner'
        } else if (url.startsWith('/captain') || url.startsWith('/maps/captain-')) {
          role = 'captain'
        } else {
          role = 'customer'
        }
      }
      window.dispatchEvent(new CustomEvent('nearbuy:unauthorized', { detail: { role, url } }))
    }
    return Promise.reject(err)
  },
)

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response) {
    const d = err.response.data
    return d?.message || d?.error || d?.errors?.[0]?.msg || fallback
  }
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
    return 'Cannot reach NearBuy. Check your connection and try again.'
  }
  return err?.message || fallback
}
