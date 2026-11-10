import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Shield,
  Car,
} from 'lucide-react'
import { useCaptainAuth } from '../../context/CaptainAuthContext'
import { ROUTES } from '../../config/routes'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function CaptainRegisterPage() {
  const navigate = useNavigate()
  const { register } = useCaptainAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [vehicleType, setVehicleType] = useState('bike')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  const handleNextStep = (e) => {
    e.preventDefault()
    setError('')
    if (step === 1) {
      if (!name || !email || !phone || !password) {
        setError('Please fill in all personal details.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!vehicleModel || !vehicleNumber) {
        setError('Please specify vehicle model and vehicle plate number.')
        return
      }
      setStep(3)
    }
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        vehicle: {
          type: vehicleType,
          model: vehicleModel.trim(),
          number: vehicleNumber.trim().toUpperCase(),
        },
      }

      await register(payload)
      navigate(ROUTES.captainHome)
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || 'Captain registration failed. Please try again.'
      )
      setStep(1)
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
            <Bike className="h-4 w-4" /> NearBuy Delivery Partner
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Become a Captain</h1>
          <p className="mt-1 text-sm text-brand-100">
            {step === 1 && 'Step 1 of 3: Enter your personal contact info.'}
            {step === 2 && 'Step 2 of 3: Enter your vehicle details.'}
            {step === 3 && 'Step 3 of 3: Verification & compliance.'}
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="-mt-4 flex-1 rounded-t-3xl bg-white px-6 pt-8 pb-10 shadow-card">
        <div className="mx-auto max-w-sm">
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <h2 className="text-base font-bold text-ink">Personal Information</h2>

              <Input
                label="Full Name"
                placeholder="Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                leftIcon={<User className="h-4 w-4 text-mute" />}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="ramesh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4 text-mute" />}
              />

              <Input
                label="Mobile Phone Number"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                leftIcon={<Phone className="h-4 w-4 text-mute" />}
              />

              <Input
                label="Password (min 6 characters)"
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
                className="mt-2 bg-gradient-to-r from-brand-600 to-pink-600 py-3.5"
              >
                Continue to Vehicle Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">Vehicle Information</h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bike', label: 'Motorcycle', icon: Bike },
                    { id: 'scooter', label: 'Scooter / Scooty', icon: Bike },
                    { id: 'car', label: 'Car / Van', icon: Car },
                    { id: 'other', label: 'EV / Bicycle', icon: Bike },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVehicleType(id)}
                      className={`flex items-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition ${
                        vehicleType === id
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-ink hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Vehicle Model / Brand"
                placeholder="e.g. Hero Splendor, Honda Activa"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                required
              />

              <Input
                label="Registration Plate Number"
                placeholder="e.g. MH02AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                full
                className="mt-2 bg-gradient-to-r from-brand-600 to-pink-600 py-3.5"
              >
                Continue to Verification
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">Verification & Agreement</h2>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              <Input
                label="Driving License Number (Optional)"
                placeholder="e.g. DL-0420110012345"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />

              <div className="rounded-2xl border border-slate-200 bg-canvas p-4 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Shield className="h-4 w-4 text-brand-600" /> Partner Safety & Terms
                </div>
                <div className="flex items-start gap-2 text-mute">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>I agree to maintain a valid driving license and vehicle registration.</span>
                </div>
                <div className="flex items-start gap-2 text-mute">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>I agree to deliver customer packages safely and collect cash payments accurately.</span>
                </div>
                <div className="flex items-start gap-2 text-mute">
                  <FileCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>Document verification is pre-approved for local test partner environment.</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                full
                disabled={loading}
                className="mt-4 bg-gradient-to-r from-brand-600 to-pink-600 py-3.5"
              >
                {loading ? 'Creating Captain Account…' : 'Complete Registration & Start'}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-mute">
            Already registered as Captain?{' '}
            <Link
              to={ROUTES.captainLogin}
              className="font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
