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
          <h2 className="text-xl font-bold text-ink">Customer Login</h2>
          <p className="mt-1 text-xs text-mute">Enter your details to continue.</p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger">
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
          Login
        </Button>

        <p className="pt-2 text-center text-xs text-mute">
          New to NearBuy?{' '}
          <Link to={ROUTES.register} className="font-bold text-accent-500 hover:underline">
            Create account
          </Link>
        </p>
      </form>

      <Modal open={showForgotModal} onClose={() => setShowForgotModal(false)} title="Reset Password">
        <div className="space-y-3 py-2 text-sm text-mute">
          <p>
            Password reset is currently handled by your store administrator or via customer support.
          </p>
          <p className="text-xs bg-brand-50 p-3 rounded-xl text-brand-900">
            For local testing and evaluation, please use your registered credentials or create a new account.
          </p>
          <Button full variant="soft" onClick={() => setShowForgotModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}
