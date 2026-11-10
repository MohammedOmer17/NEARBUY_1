import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bike, Lock, Mail, ArrowRight, ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { useCaptainAuth } from '../../context/CaptainAuthContext'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function CaptainLoginPage() {
  const navigate = useNavigate()
  const { login } = useCaptainAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate(ROUTES.captainHome)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Captain login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* Brand Header */}
      <div className="bg-gradient-to-br from-brand-600 via-pink-600 to-purple-900 px-6 pt-12 pb-10 text-white">
        <div className="mx-auto max-w-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Bike className="h-4 w-4" /> NearBuy Captain Partner
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Partner Login</h1>
          <p className="mt-1 text-sm text-brand-100">
            Sign in to start receiving delivery missions and track your earnings.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="-mt-4 flex-1 rounded-t-3xl bg-white px-6 pt-8 pb-10 shadow-card">
        <div className="mx-auto max-w-sm">
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="captain@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="h-4 w-4 text-mute" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="h-4 w-4 text-mute" />}
            />

            <Button
              type="submit"
              variant="primary"
              full
              disabled={loading}
              className="mt-2 bg-gradient-to-r from-brand-600 to-pink-600 py-3.5"
            >
              {loading ? 'Signing in…' : 'Enter Partner Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Registration Link */}
          <div className="mt-6 text-center text-xs text-mute">
            Want to deliver with NearBuy?{' '}
            <Link
              to={ROUTES.captainRegister}
              className="font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Register as Captain
            </Link>
          </div>

          {/* Verification Guarantee */}
          <div className="mt-8 rounded-2xl bg-canvas p-4 text-xs text-mute">
            <div className="flex items-center gap-2 font-bold text-ink mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Verified Delivery Partner
            </div>
            Flexible hours, instant payouts per delivery, and live route navigation.
          </div>

          {/* Role Switching */}
          <div className="mt-6 border-t border-line pt-6 text-center">
            <p className="text-xs text-mute mb-2">Looking for customer or shop owner?</p>
            <div className="flex justify-center gap-4 text-xs font-bold text-brand-600">
              <Link to={ROUTES.login} className="hover:underline flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" /> Customer App
              </Link>
              <span className="text-slate-300">•</span>
              <Link to={ROUTES.ownerLogin} className="hover:underline flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" /> Shop Owner App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
