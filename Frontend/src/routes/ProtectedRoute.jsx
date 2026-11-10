import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOwnerAuth } from '../context/OwnerAuthContext'
import { useCaptainAuth } from '../context/CaptainAuthContext'
import { ROUTES } from '../config/routes'

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand-900 via-purple-950 to-brand-700 text-white">
      <div className="flex flex-col items-center gap-2">
        <span className="animate-pulse text-4xl font-extrabold tracking-tight">NearBuy</span>
        <span className="text-xs uppercase tracking-widest text-brand-200">Local shopping, made easy</span>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'guest') return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function GuestRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authed') return <Navigate to={ROUTES.home} replace />
  return <Outlet />
}

export function OwnerProtectedRoute() {
  const { status } = useOwnerAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'guest') return <Navigate to={ROUTES.ownerLogin} replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function OwnerGuestRoute() {
  const { status } = useOwnerAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authed') return <Navigate to={ROUTES.ownerDashboard} replace />
  return <Outlet />
}

export function CaptainProtectedRoute() {
  const { status } = useCaptainAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'guest') return <Navigate to={ROUTES.captainLogin} replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function CaptainGuestRoute() {
  const { status } = useCaptainAuth()
  if (status === 'loading') return <Splash />
  if (status === 'authed') return <Navigate to={ROUTES.captainHome} replace />
  return <Outlet />
}
