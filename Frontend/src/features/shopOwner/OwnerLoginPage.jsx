import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, User, Bike } from 'lucide-react'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { getErrorMessage } from '../../services/apiClient'

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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#100A14] bg-radial from-[#2B1B2D]/60 via-[#170F1B] to-[#100A14] p-4 text-white">
      <div className="w-full max-w-md flex flex-col">
        {/* Brand Header */}
        <div className="px-6 pb-6 pt-6 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] shadow-lg shadow-pink-500/30">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">NearBuy</h1>
          <p className="mt-1 text-sm font-bold text-[#F58AD8]">Local shopping, made easy.</p>
          <p className="mt-1 text-xs text-[#94849A]">Manage your shop and grow your business.</p>
        </div>

        {/* Card Body */}
        <main className="rounded-[28px] border border-[#593650] bg-[#211522] px-6 py-7 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white">Shop Owner Login</h2>
            <p className="mt-1 text-xs text-[#94849A]">Enter your details to continue.</p>
          </div>

          {serverError && (
            <p role="alert" className="mb-4 rounded-xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
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
                  className="text-xs font-semibold text-[#EC55C8] hover:text-[#F58AD8] transition"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              full
              loading={submitting}
              className="mt-2 text-sm shadow-md shadow-pink-500/25"
            >
              Login →
            </Button>

            <p className="pt-2 text-center text-xs text-[#94849A]">
              New to NearBuy?{' '}
              <Link to={ROUTES.ownerRegister} className="font-bold text-[#EC55C8] hover:underline">
                Create account
              </Link>
            </p>
          </form>

          {/* Switch Portal Section */}
          <div className="mt-7 border-t border-[#593650] pt-5">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#94849A]">
              Or continue as
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <Link
                to={ROUTES.login}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8] hover:bg-[#2B1B2D]"
              >
                <User className="h-4 w-4 text-[#EC55C8]" />
                <span>Customer</span>
              </Link>
              <Link
                to={ROUTES.captainLogin}
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8] hover:bg-[#2B1B2D]"
              >
                <Bike className="h-4 w-4 text-[#B65DDA]" />
                <span>Delivery Partner</span>
              </Link>
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        footer={
          <Button full onClick={() => setShowForgotModal(false)}>
            Close
          </Button>
        }
      >
        <p className="text-xs text-[#C4B4C9] leading-relaxed">
          Default seed accounts share standard credentials. If you forgot your store credentials,
          please contact support or re-register.
        </p>
      </Modal>
    </div>
  )
}
