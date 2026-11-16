import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Mail,
  Lock,
  User,
  Phone,
  Store,
  Navigation,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  Camera,
} from 'lucide-react'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { getErrorMessage } from '../../services/apiClient'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CATEGORIES = [
  'Grocery & Kirana',
  'Supermarket',
  'Dairy & Bakery',
  'Fruits & Vegetables',
  'Beverages & Snacks',
  'Organic Store',
  'General Store',
]

const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  agreeTerms: true,
  shopName: '',
  category: 'Grocery & Kirana',
  address: '',
  landmark: '',
  contact: '',
  latitude: '17.4447',
  longitude: '78.4664',
}

export default function OwnerRegisterPage() {
  const { register } = useOwnerAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  const updateField = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setDetectingLocation(false)
      },
      () => {
        setDetectingLocation(false)
        alert('Could not detect location automatically. You can enter coordinates manually.')
      },
      { timeout: 8000 },
    )
  }

  const validateStep1 = () => {
    const nextErrors = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Full name is required'
    if (!EMAIL_RE.test(form.email.trim())) nextErrors.email = 'Enter a valid email address'
    if (form.phone.trim().length < 10) nextErrors.phone = 'Enter a valid 10-digit phone number'
    if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters'
    if (!form.agreeTerms) nextErrors.agreeTerms = 'You must agree to the Terms & Conditions'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = (e) => {
    e.preventDefault()
    if (validateStep1()) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.shopName.trim()) nextErrors.shopName = 'Shop name is required'
    if (!form.address.trim()) nextErrors.address = 'Shop address is required'
    if (!form.contact.trim()) nextErrors.contact = 'Shop contact phone is required'
    if (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) {
      nextErrors.latitude = 'Valid latitude is required'
      nextErrors.longitude = 'Valid longitude is required'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setServerError('')
    try {
      const data = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        shopName: form.shopName.trim(),
        address: form.landmark.trim()
          ? `${form.address.trim()}, Near ${form.landmark.trim()}`
          : form.address.trim(),
        contact: form.contact.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      })

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
      setServerError(getErrorMessage(error, 'Unable to create shop owner account.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#100A14] bg-radial from-[#2B1B2D]/60 via-[#170F1B] to-[#100A14] p-4 text-white">
      <div className="w-full max-w-md flex flex-col">
        {/* Brand Header */}
        <div className="px-6 pb-6 pt-6 text-center text-white">
          <h1 className="text-2xl font-black tracking-tight text-white">Register Your Shop</h1>
          <p className="mt-1 text-xs text-[#F58AD8]">
            Join NearBuy and start accepting orders from nearby customers
          </p>

          {/* Stepper Indicators matching Storyboard Screens 2 & 3 */}
          <div className="mt-5 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  step >= 1 ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-sm' : 'bg-[#2B1B2D] text-[#94849A] border border-[#593650]'
                }`}
              >
                1
              </span>
              <span className={`text-[11px] font-bold ${step >= 1 ? 'text-white' : 'text-[#94849A]'}`}>Owner Details</span>
            </div>
            <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-[#EC55C8]' : 'bg-[#593650]'}`} />
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  step >= 2 ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] text-white shadow-sm' : 'bg-[#2B1B2D] text-[#94849A] border border-[#593650]'
                }`}
              >
                2
              </span>
              <span className={`text-[11px] font-bold ${step >= 2 ? 'text-white' : 'text-[#94849A]'}`}>Shop Details</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <main className="rounded-[28px] border border-[#593650] bg-[#211522] px-6 py-7 shadow-2xl">
          {serverError && (
            <p role="alert" className="mb-4 rounded-xl bg-danger/15 border border-danger/30 p-3 text-xs font-semibold text-danger">
              {serverError}
            </p>
          )}

          {step === 1 ? (
            /* Step 1: Owner Information matching Storyboard Screen 2 */
            <form onSubmit={handleNext} noValidate className="space-y-3.5">
              <div>
                <h2 className="text-lg font-bold text-white">Owner Information</h2>
                <p className="text-xs text-[#94849A]">Tell us about yourself as the shop proprietor.</p>
              </div>

              <Input
                label="Full Name"
                icon={User}
                placeholder="e.g. Ramesh Chandra"
                value={form.name}
                onChange={updateField('name')}
                error={errors.name}
              />

              <Input
                label="Email address"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="owner@example.com"
                value={form.email}
                onChange={updateField('email')}
                error={errors.email}
              />

              <Input
                label="Phone number"
                icon={Phone}
                type="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={updateField('phone')}
                error={errors.phone}
              />

              <Input
                label="Password"
                icon={Lock}
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={updateField('password')}
                error={errors.password}
              />

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#C4B4C9] select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.agreeTerms}
                    onChange={(e) => setForm((f) => ({ ...f, agreeTerms: e.target.checked }))}
                  />
                  {form.agreeTerms ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-[#EC55C8] mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-[#94849A] mt-0.5" />
                  )}
                  <span>
                    I agree to the{' '}
                    <span className="font-semibold text-[#EC55C8] underline">Terms & Conditions</span>{' '}
                    and <span className="font-semibold text-[#EC55C8] underline">Privacy Policy</span>
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="mt-1 text-xs text-danger">{errors.agreeTerms}</p>
                )}
              </div>

              <Button
                type="submit"
                full
                className="mt-3 text-xs py-3 shadow-md shadow-pink-500/25 flex items-center justify-center gap-1.5"
              >
                Next: Shop Details <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="pt-2 text-center text-xs text-[#94849A]">
                Already have an account?{' '}
                <Link to={ROUTES.ownerLogin} className="font-bold text-[#EC55C8] hover:underline">
                  Login
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: Shop Details matching Storyboard Screen 3 */
            <form onSubmit={onSubmit} noValidate className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Shop Details</h2>
                  <p className="text-xs text-[#94849A]">Step 2 of 2: Location and store details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs font-bold text-[#EC55C8] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              <Input
                label="Shop Name"
                icon={Store}
                placeholder="e.g. Ravi Kirana Store"
                value={form.shopName}
                onChange={updateField('shopName')}
                error={errors.shopName}
              />

              <div>
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1">Shop Category</label>
                <select
                  value={form.category}
                  onChange={updateField('category')}
                  className="w-full text-xs font-semibold text-white bg-[#170F1B] border border-[#593650] p-3 rounded-xl outline-none focus:border-[#EC55C8]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#170F1B] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Shop Address"
                icon={MapPin}
                placeholder="e.g. Shop #4, Sultan Bhag, Erragadda"
                value={form.address}
                onChange={updateField('address')}
                error={errors.address}
              />

              <Input
                label="Landmark (Optional)"
                icon={MapPin}
                placeholder="e.g. Opposite Community Hall"
                value={form.landmark}
                onChange={updateField('landmark')}
              />

              <Input
                label="Shop Contact Phone"
                icon={Phone}
                placeholder="e.g. +91 98765 43210"
                value={form.contact}
                onChange={updateField('contact')}
                error={errors.contact}
              />

              {/* GPS Coordinates & Auto Detect Button */}
              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-[#EC55C8]" /> Shop GPS Coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={detectingLocation}
                    className="text-xs font-bold text-[#EC55C8] hover:underline disabled:opacity-50"
                  >
                    {detectingLocation ? 'Detecting...' : 'Auto-detect Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#94849A] block">Latitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.latitude}
                      onChange={updateField('latitude')}
                      className="w-full p-2 bg-[#211522] rounded-lg border border-[#593650] text-xs font-mono font-semibold text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94849A] block">Longitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.longitude}
                      onChange={updateField('longitude')}
                      className="w-full p-2 bg-[#211522] rounded-lg border border-[#593650] text-xs font-mono font-semibold text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Photos Area */}
              <div>
                <label className="block text-xs font-semibold text-[#C4B4C9] mb-1.5">Shop Photos</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-20 rounded-xl bg-[#2B1B2D] border-2 border-dashed border-[#EC55C8]/50 grid place-items-center text-center p-2 text-[#EC55C8] cursor-pointer">
                    <Camera className="h-5 w-5" />
                    <span className="text-[9px] font-bold mt-0.5">+ Add Photo</span>
                  </div>
                  <p className="text-[11px] text-[#94849A] leading-tight">
                    Upload storefront photos so nearby customers can easily identify your shop.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                full
                loading={submitting}
                className="mt-4 text-xs py-3 shadow-md shadow-pink-500/25"
              >
                Complete Registration & Open Dashboard
              </Button>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}
