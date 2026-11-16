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
    <div className="flex min-h-screen flex-col bg-[#100A14] text-white">
      {/* Brand Header */}
      <div className="bg-gradient-to-br from-[#170F1B] via-[#211522] to-[#100A14] border-b border-[#593650] px-6 pt-12 pb-10 text-white">
        <div className="mx-auto max-w-sm text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EC55C8]/15 border border-[#EC55C8]/30 px-3 py-1 text-xs font-semibold text-[#F58AD8] backdrop-blur">
            <Bike className="h-4 w-4 text-[#EC55C8]" /> NearBuy Captain Partner
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
            Delivering local, together.
          </h1>
          <p className="mt-2 text-xs text-[#C4B4C9]">
            Be a delivery partner and earn on your own schedule.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-sm rounded-3xl border border-[#593650] bg-[#211522] p-6 shadow-card">
          <h2 className="text-xl font-black text-white mb-1">Captain Login</h2>
          <p className="text-xs text-[#94849A] mb-5">Enter your details to continue.</p>

          {error && (
            <div className="mb-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-200">
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
              leftIcon={<Mail className="h-4 w-4 text-[#94849A]" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="h-4 w-4 text-[#94849A]" />}
            />

            <div className="flex justify-end">
              <span className="text-xs text-[#EC55C8] hover:text-[#F58AD8] cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              full
              disabled={loading}
              className="mt-2 bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 font-bold shadow-md"
            >
              {loading ? 'Signing in…' : 'Login'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Registration Link */}
          <div className="mt-6 text-center text-xs text-[#94849A]">
            New to NearBuy?{' '}
            <Link
              to={ROUTES.captainRegister}
              className="font-bold text-[#EC55C8] hover:text-[#F58AD8] underline"
            >
              Create account
            </Link>
          </div>

          {/* Role Switching */}
          <div className="mt-6 border-t border-[#593650]/60 pt-4 space-y-2">
            <Link
              to={ROUTES.login}
              className="flex items-center justify-between rounded-2xl border border-[#593650] bg-[#170F1B] px-3.5 py-2.5 text-xs font-semibold text-[#C4B4C9] hover:text-white hover:bg-[#2B1B2D] transition-colors"
            >
              <span>Continue as Customer</span>
              <span className="text-[#EC55C8]">&gt;</span>
            </Link>
            <Link
              to={ROUTES.ownerLogin}
              className="flex items-center justify-between rounded-2xl border border-[#593650] bg-[#170F1B] px-3.5 py-2.5 text-xs font-semibold text-[#C4B4C9] hover:text-white hover:bg-[#2B1B2D] transition-colors"
            >
              <span>Continue as Shop Owner</span>
              <span className="text-[#EC55C8]">&gt;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
