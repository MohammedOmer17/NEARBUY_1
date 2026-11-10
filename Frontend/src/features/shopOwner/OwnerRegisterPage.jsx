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
import PhoneFrame from '../../layouts/PhoneFrame'

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

      // Cache newly created shop ID in known shops for discovery
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
    <PhoneFrame className="flex min-h-dvh flex-col bg-gradient-to-b from-[#2A0F5C] via-[#3B0764] to-[#4A0E4E]">
      <div className="px-6 pb-6 pt-[calc(2.5rem+env(safe-area-inset-top))] text-center text-white">
        <h1 className="text-2xl font-extrabold tracking-tight">Register Your Shop</h1>
        <p className="mt-1 text-xs text-pink-300">
          Join NearBuy and start accepting orders from nearby customers
        </p>

        {/* Stepper Indicators matching Storyboard Screens 2 & 3 */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                step >= 1 ? 'bg-accent-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              1
            </span>
            <span className="text-[11px] font-bold text-white">Owner Details</span>
          </div>
          <div className="h-0.5 w-8 bg-white/20" />
          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                step >= 2 ? 'bg-accent-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              2
            </span>
            <span className="text-[11px] font-bold text-white">Shop Details</span>
          </div>
        </div>
      </div>

      <main className="flex-1 rounded-t-[32px] bg-white px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-7 shadow-2xl">
        {serverError && (
          <p role="alert" className="mb-4 rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger">
            {serverError}
          </p>
        )}

        {step === 1 ? (
          /* Step 1: Owner Information matching Storyboard Screen 2 */
          <form onSubmit={handleNext} noValidate className="space-y-3.5">
            <div>
              <h2 className="text-lg font-bold text-ink">Owner Information</h2>
              <p className="text-xs text-mute">Tell us about yourself as the shop proprietor.</p>
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
                  <span className="font-semibold text-accent-500 underline">Terms & Conditions</span>{' '}
                  and <span className="font-semibold text-accent-500 underline">Privacy Policy</span>
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="mt-1 text-xs text-danger">{errors.agreeTerms}</p>
              )}
            </div>

            <Button
              type="submit"
              full
              className="mt-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 shadow-md shadow-pink-500/25"
            >
              Next: Shop Details <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="pt-2 text-center text-xs text-mute">
              Already have an account?{' '}
              <Link to={ROUTES.ownerLogin} className="font-bold text-accent-500 hover:underline">
                Login
              </Link>
            </p>
          </form>
        ) : (
          /* Step 2: Shop Details matching Storyboard Screen 3 */
          <form onSubmit={onSubmit} noValidate className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">Shop Details</h2>
                <p className="text-xs text-mute">Step 2 of 2: Location and store details</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-bold text-accent-500 hover:underline"
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
              <label className="block text-xs font-semibold text-ink mb-1">Shop Category</label>
              <select
                value={form.category}
                onChange={updateField('category')}
                className="w-full text-xs font-semibold text-ink bg-white border border-line p-3 rounded-xl outline-none focus:border-accent-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
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
            <div className="rounded-2xl border border-line bg-canvas p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink flex items-center gap-1">
                  <Navigation className="h-3.5 w-3.5 text-accent-500" /> Shop GPS Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleAutoDetectLocation}
                  disabled={detectingLocation}
                  className="text-xs font-bold text-accent-500 hover:underline disabled:opacity-50"
                >
                  {detectingLocation ? 'Detecting...' : 'Auto-detect Location'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-mute block">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.latitude}
                    onChange={updateField('latitude')}
                    className="w-full p-2 bg-white rounded-lg border border-line text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-mute block">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.longitude}
                    onChange={updateField('longitude')}
                    className="w-full p-2 bg-white rounded-lg border border-line text-xs font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Shop Photos Area */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Shop Photos</label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-20 rounded-xl bg-purple-50 border-2 border-dashed border-purple-200 grid place-items-center text-center p-2 text-purple-700 cursor-pointer">
                  <Camera className="h-5 w-5" />
                  <span className="text-[9px] font-bold mt-0.5">+ Add Photo</span>
                </div>
                <p className="text-[11px] text-mute leading-tight">
                  Upload storefront photos so nearby customers can easily identify your shop.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              full
              loading={submitting}
              className="mt-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 shadow-md shadow-pink-500/25"
            >
              Complete Registration & Open Dashboard
            </Button>
          </form>
        )}
      </main>
    </PhoneFrame>
  )
}
