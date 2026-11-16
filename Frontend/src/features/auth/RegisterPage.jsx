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
        <h2 className="text-xl font-bold text-white">Create Your Account</h2>
        <p className="mt-1 text-xs text-[#94849A]">Join NearBuy and shop from nearby kirana stores.</p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
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
        placeholder="98765 43210"
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
        placeholder="Repeat password"
        value={form.confirmPassword}
        onChange={set('confirmPassword')}
        error={errors.confirmPassword}
      />

      {/* Terms checkbox */}
      <div>
        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#C4B4C9] select-none">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, agreeTerms: !f.agreeTerms }))}
            className="mt-0.5 text-[#EC55C8] focus:outline-none"
            aria-checked={form.agreeTerms}
            role="checkbox"
          >
            {form.agreeTerms ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4 text-[#94849A]" />
            )}
          </button>
          <span>
            I agree to the{' '}
            <span className="font-semibold text-[#EC55C8] hover:underline">
              Terms & Conditions
            </span>{' '}
            and{' '}
            <span className="font-semibold text-[#EC55C8] hover:underline">
              Privacy Policy
            </span>
          </span>
        </label>
        {errors.agreeTerms && (
          <p className="mt-1 text-xs text-danger">{errors.agreeTerms}</p>
        )}
      </div>

      <Button
        type="submit"
        full
        loading={submitting}
        className="mt-2 text-sm shadow-md shadow-pink-500/25"
      >
        Create Account
      </Button>

      <p className="pt-1 text-center text-xs text-[#94849A]">
        Already have an account?{' '}
        <Link to={ROUTES.login} className="font-bold text-[#EC55C8] hover:underline">
          Login
        </Link>
      </p>
    </form>
  )
}
