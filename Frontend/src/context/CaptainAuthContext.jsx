import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { captainApi } from '../services/api'
import { setAuthToken } from '../services/apiClient'

const CaptainAuthContext = createContext(null)

export function CaptainAuthProvider({ children }) {
  const [captain, setCaptain] = useState(null)
  const [status, setStatus] = useState('loading')

  const refresh = useCallback(async () => {
    try {
      const c = await captainApi.profile()
      if (c && (c._id || c.email)) {
        setCaptain(c)
        setStatus('authed')
        return c
      } else {
        setCaptain(null)
        setStatus('guest')
        return null
      }
    } catch {
      setCaptain(null)
      setStatus('guest')
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onExpired = (e) => {
      if (e?.detail?.role && e.detail.role !== 'captain') return
      setCaptain(null)
      setStatus('guest')
      setAuthToken(null, 'captain')
    }
    window.addEventListener('nearbuy:unauthorized', onExpired)
    return () => window.removeEventListener('nearbuy:unauthorized', onExpired)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const res = await captainApi.login({ email, password })
      if (res?.token) setAuthToken(res.token, 'captain')
      const c = await refresh()
      if (!c) throw new Error('Captain session could not be started.')
      return c
    },
    [refresh],
  )

  const register = useCallback(
    async (payload) => {
      await captainApi.register(payload)
      return login(payload.email, payload.password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await captainApi.logout()
    } catch {
      // Best-effort server cleanup
    }
    setAuthToken(null, 'captain')
    setCaptain(null)
    setStatus('guest')
  }, [])

  const updateAvailability = useCallback(async (availabilityStatus) => {
    const res = await captainApi.updateAvailability(availabilityStatus)
    setCaptain((c) => (c ? { ...c, availabilityStatus: res.availabilityStatus || availabilityStatus } : c))
    return res
  }, [])

  const updateLocation = useCallback(async (latitude, longitude) => {
    const res = await captainApi.updateLocation(latitude, longitude)
    setCaptain((c) =>
      c
        ? {
            ...c,
            location: res.location || { latitude, longitude },
            locationUpdatedAt: res.locationUpdatedAt || new Date().toISOString(),
          }
        : c,
    )
    return res
  }, [])

  const updateProfile = useCallback(async (body) => {
    const res = await captainApi.updateProfile(body)
    if (res?.captain) {
      setCaptain(res.captain)
    }
    return res
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await captainApi.changePassword({ currentPassword, newPassword })
    return res
  }, [])

  const updateServiceAreas = useCallback(async (serviceAreas) => {
    const res = await captainApi.updateServiceAreas(serviceAreas)
    setCaptain((c) => (c ? { ...c, serviceAreas: res.serviceAreas || serviceAreas } : c))
    return res
  }, [])

  const value = useMemo(
    () => ({
      captain,
      status,
      login,
      register,
      logout,
      refresh,
      updateAvailability,
      updateLocation,
      updateProfile,
      updateServiceAreas,
      changePassword,
    }),
    [
      captain,
      status,
      login,
      register,
      logout,
      refresh,
      updateAvailability,
      updateLocation,
      updateProfile,
      updateServiceAreas,
      changePassword,
    ],
  )

  return <CaptainAuthContext.Provider value={value}>{children}</CaptainAuthContext.Provider>
}

export const useCaptainAuth = () => useContext(CaptainAuthContext)
