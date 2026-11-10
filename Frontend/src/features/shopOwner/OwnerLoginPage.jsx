import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, User, Bike } from 'lucide-react'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { getErrorMessage } from '../../services/apiClient'
import PhoneFrame from '../../layouts/PhoneFrame'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function OwnerLoginPage() {
  const { login } = useOwnerAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  const handleChange = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const onSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = 'Enter a valid email address'
    if (!form.password) nextErrors.password = 'Enter your password'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setServerError('')
    try {
      const data = await login(form.email.trim(), form.password)
      // Save shop ID to known shops for discovery
      if (data?.shop?._id) {
        try {
          const cached = JSON.parse(localStorage.getItem('nearbuy_known_shops') || '[]')
          if (!cached.includes(data.shop._id)) {
            cached.push(data.shop._id)
            localStorage.setItem('nearbuy_known_shops', JSON.stringify(cached))
          }
        } catch {
          // ignore
        }
      }
      navigate(ROUTES.ownerDashboard, { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Unable to log in as shop owner.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PhoneFrame className="flex min-h-dvh flex-col bg-gradient-to-b from-[#2A0F5C] via-[#3B0764] to-[#4A0E4E]">
      <div className="px-6 pb-8 pt-[calc(3rem+env(safe-area-inset-top))] text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 shadow-lg shadow-pink-500/30">
          <Store className="h-7 w-7 text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">NearBuy</h1>
        <p className="mt-1 text-sm font-semibold text-pink-300">Local shopping, made easy.</p>
        <p className="mt-2 text-xs text-purple-200/80">Manage your shop and grow your business.</p>
      </div>

      <main className="flex-1 rounded-t-[32px] bg-white px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-7 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-ink">Shop Owner Login</h2>
          <p className="mt-1 text-xs text-mute">Enter your details to continue.</p>
        </div>

        {serverError && (
          <p role="alert" className="mb-4 rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger">
            {serverError}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Email address"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="owner@example.com"
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
          />

          <div>
            <Input
              label="Password"
              icon={Lock}
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange('password')}
              error={errors.password}
            />
            <div className="mt-1.5 text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-accent-500 hover:text-accent-600 transition"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button
            type="submit"
            full
            loading={submitting}
            className="mt-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25 uppercase tracking-wide font-bold"
          >
            LOGIN
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-mute">
          New to NearBuy?{' '}
          <Link to={ROUTES.ownerRegister} className="font-bold text-accent-500 hover:underline">
            Create account
          </Link>
        </p>

        <div className="mt-8 border-t border-line pt-5">
          <div className="flex flex-col gap-2.5">
            <Link
              to={ROUTES.login}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-canvas p-3 text-xs font-bold text-ink transition hover:border-pink-300 hover:bg-pink-50/40"
            >
              <User className="h-4 w-4 text-pink-600" />
              <span>Continue as Customer</span>
            </Link>
            <Link
              to={ROUTES.captainLogin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-canvas p-3 text-xs font-bold text-ink transition hover:border-purple-300 hover:bg-purple-50/40"
            >
              <Bike className="h-4 w-4 text-purple-600" />
              <span>Continue as Delivery Partner</span>
            </Link>
          </div>
        </div>
      </main>

      <Modal open={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset Password">
        <div className="space-y-3 py-2 text-sm text-mute">
          <p>Shop Owner credentials can be updated or reset through the system administrator.</p>
          <Button full variant="soft" onClick={() => setShowForgotModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </PhoneFrame>
  )
}
