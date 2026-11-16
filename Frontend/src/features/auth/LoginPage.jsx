import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../services/apiClient'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const next = {}
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (!form.password) next.password = 'Enter your password'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    setServerError('')
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || ROUTES.home, { replace: true })
    } catch (err) {
      setServerError(
        err.response?.status === 401 || err.response?.status === 400
          ? getErrorMessage(err, 'Email or password is incorrect.')
          : getErrorMessage(err),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Customer Login</h2>
          <p className="mt-1 text-xs text-[#94849A]">Enter your details to continue.</p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
            {serverError}
          </p>
        )}

        <Input
          label="Email address"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
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
            onChange={set('password')}
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
          <Link to={ROUTES.register} className="font-bold text-[#EC55C8] hover:underline">
            Create account
          </Link>
        </p>
      </form>

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
          NearBuy uses your verified email or mobile number for account access. In this demo
          environment, default seed accounts share standard credentials. For assistance, reach out
          to support.
        </p>
      </Modal>
    </>
  )
}
