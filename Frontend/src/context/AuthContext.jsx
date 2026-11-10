import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/api'
import { setAuthToken } from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authed | guest

  const restore = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname
      const hasCustToken = !!(localStorage.getItem('nearbuy_customer_token') || localStorage.getItem('nearbuy_token'))
      if (!hasCustToken && (p.startsWith('/captain') || p.startsWith('/shop-owner') || p.startsWith('/owner'))) {
        setStatus('guest')
        return null
      }
    }
    try {
      const c = await authApi.profile()
      if (c?.email || c?._id) {
        setCustomer(c)
        setStatus('authed')
        return c
      } else {
        setStatus('guest')
        return null
      }
    } catch {
      setStatus('guest')
      return null
    }
  }, [])

  useEffect(() => {
    restore()
  }, [restore])

  useEffect(() => {
    const onExpired = (e) => {
      if (e?.detail?.role && e.detail.role !== 'customer') return
      setCustomer(null)
      setStatus('guest')
      setAuthToken(null, 'customer')
    }
    window.addEventListener('nearbuy:unauthorized', onExpired)
    return () => window.removeEventListener('nearbuy:unauthorized', onExpired)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    if (res?.token) setAuthToken(res.token, 'customer')
    const c = await authApi.profile()
    if (!c) throw new Error('Signed in, but the session could not start.')
    setCustomer(c)
    setStatus('authed')
    return c
  }, [])

  const register = useCallback(async ({ name, email, phone, password }) => {
    const res = await authApi.register({ name, email, phone, password })
    if (res?.token) setAuthToken(res.token, 'customer')
    return login(email, password)
  }, [login])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // server-side cookie cleanup
    }
    setAuthToken(null, 'customer')
    setCustomer(null)
    setStatus('guest')
  }, [])

  const updateCustomer = useCallback((patch) => setCustomer((c) => (c ? { ...c, ...patch } : c)), [])

  const value = useMemo(
    () => ({ customer, status, login, register, logout, updateCustomer, restore }),
    [customer, status, login, register, logout, updateCustomer, restore],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
