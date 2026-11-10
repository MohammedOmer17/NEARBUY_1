import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { shopOwnerApi } from '../services/api'
import { setAuthToken } from '../services/apiClient'

const OwnerAuthContext = createContext(null)

export function OwnerAuthProvider({ children }) {
  const [owner, setOwner] = useState(null)
  const [shop, setShop] = useState(null)
  const [status, setStatus] = useState('loading')

  const refresh = useCallback(async () => {
    try {
      const me = await shopOwnerApi.me()
      const nextOwner = me?.shopOwner ?? me?.owner ?? null
      const nextShop = me?.shop ?? null
      setOwner(nextOwner)
      setShop(nextShop)
      setStatus(nextOwner ? 'authed' : 'guest')
      return { owner: nextOwner, shop: nextShop }
    } catch {
      setOwner(null)
      setShop(null)
      setStatus('guest')
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onExpired = (e) => {
      if (e?.detail?.role && e.detail.role !== 'owner') return
      setOwner(null)
      setShop(null)
      setStatus('guest')
      setAuthToken(null, 'owner')
    }
    window.addEventListener('nearbuy:unauthorized', onExpired)
    return () => window.removeEventListener('nearbuy:unauthorized', onExpired)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await shopOwnerApi.login({ email, password })
      if (res?.token) setAuthToken(res.token, 'owner')
      const data = await refresh()
      if (!data?.owner) throw new Error('Shop owner session could not be started.')
      return data
    },
    [refresh],
  )

  const register = useCallback(
    async (payload) => {
      await shopOwnerApi.register(payload)
      return login(payload.email, payload.password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await shopOwnerApi.logout()
    } catch {
      // Best-effort server cleanup
    }
    setAuthToken(null, 'owner')
    setOwner(null)
    setShop(null)
    setStatus('guest')
  }, [])

  const updateShop = useCallback((patch) => setShop((s) => (s ? { ...s, ...patch } : s)), [])

  const value = useMemo(
    () => ({ owner, shop, status, login, register, logout, refresh, updateShop }),
    [owner, shop, status, login, register, logout, refresh, updateShop],
  )

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>
}

export const useOwnerAuth = () => useContext(OwnerAuthContext)
