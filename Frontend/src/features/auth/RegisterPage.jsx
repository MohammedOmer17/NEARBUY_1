import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Lock, CheckSquare, Square } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../services/apiClient'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const phone = form.phone.replace(/[\s-]/g, '')
    const next = {}
    if (form.name.trim().length < 2) next.name = 'Enter your full name'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (!/^\+?\d{10,14}$/.test(phone)) next.phone = 'Enter a valid 10-digit phone number'
    if (form.password.length < 6) next.password = 'Use at least 6 characters'
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match'
    if (!form.agreeTerms) next.agreeTerms = 'You must agree to the Terms & Conditions'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setServerError('')
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone,
        password: form.password,
      })
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3.5">
      <div>
        <h2 className="text-xl font-bold text-ink">Create Your Account</h2>
        <p className="mt-1 text-xs text-mute">Join NearBuy and shop from nearby kirana stores.</p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger">
          {serverError}
        </p>
      )}

      <Input
        label="Full Name"
        icon={User}
        autoComplete="name"
        placeholder="e.g. Rahul Sharma"
        value={form.name}
        onChange={set('name')}
        error={errors.name}
      />

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

      <Input
        label="Phone number"
        icon={Phone}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="10-digit mobile number"
        value={form.phone}
        onChange={set('phone')}
        error={errors.phone}
      />

      <Input
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={form.password}
        onChange={set('password')}
        error={errors.password}
      />

      <Input
        label="Confirm Password"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
        value={form.confirmPassword}
        onChange={set('confirmPassword')}
        error={errors.confirmPassword}
      />

      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-mute">
          <input
            type="checkbox"
            className="sr-only"
            checked={form.agreeTerms}
            onChange={(e) => setForm((f) => ({ ...f, agreeTerms: e.target.checked }))}
          />
          {form.agreeTerms ? (
            <CheckSquare className="h-4 w-4 shrink-0 text-accent-500 mt-0.5" />
          ) : (
            <Square className="h-4 w-4 shrink-0 text-mute mt-0.5" />
          )}
          <span>
            I agree to the{' '}
            <span className="font-semibold text-accent-500 underline">Terms & Conditions</span> and{' '}
            <span className="font-semibold text-accent-500 underline">Privacy Policy</span>
          </span>
        </label>
        {errors.agreeTerms && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {errors.agreeTerms}
          </p>
        )}
      </div>

      <Button
        type="submit"
        full
        loading={submitting}
        className="mt-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25 uppercase tracking-wide font-bold"
      >
        Create Account
      </Button>

      <p className="pt-2 text-center text-xs text-mute">
        Already registered?{' '}
        <Link to={ROUTES.login} className="font-bold text-accent-500 hover:underline">
          Login
        </Link>
      </p>
    </form>
  )
}
