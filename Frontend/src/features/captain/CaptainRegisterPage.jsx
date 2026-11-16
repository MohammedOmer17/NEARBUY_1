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
    <div className="flex min-h-screen flex-col bg-[#100A14] text-white">
      {/* Brand Header */}
      <div className="bg-gradient-to-br from-[#170F1B] via-[#211522] to-[#100A14] border-b border-[#593650] px-6 pt-12 pb-10 text-white">
        <div className="mx-auto max-w-sm text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EC55C8]/15 border border-[#EC55C8]/30 px-3 py-1 text-xs font-semibold text-[#F58AD8] backdrop-blur">
            <Bike className="h-4 w-4 text-[#EC55C8]" /> NearBuy Delivery Partner
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Join as Delivery Partner</h1>
          <p className="mt-2 text-xs text-[#C4B4C9]">
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
                  s <= step ? 'bg-gradient-to-r from-[#EC55C8] to-[#B65DDA]' : 'bg-[#593650]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-sm rounded-3xl border border-[#593650] bg-[#211522] p-6 shadow-card">
          {error && (
            <div className="mb-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <h2 className="text-base font-bold text-white">Personal Information</h2>

              <Input
                label="Full Name"
                placeholder="Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                leftIcon={<User className="h-4 w-4 text-[#94849A]" />}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="ramesh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="h-4 w-4 text-[#94849A]" />}
              />

              <Input
                label="Mobile Phone Number"
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                leftIcon={<Phone className="h-4 w-4 text-[#94849A]" />}
              />

              <Input
                label="Password (min 6 characters)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="h-4 w-4 text-[#94849A]" />}
              />

              <Button
                type="submit"
                variant="primary"
                full
                className="mt-2 bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 font-bold shadow-md"
              >
                Continue to Vehicle Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Vehicle Information</h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#EC55C8] hover:text-[#F58AD8]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#C4B4C9] mb-1.5">Vehicle Type</label>
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
                          ? 'border-[#EC55C8] bg-pink-950/60 text-[#F58AD8]'
                          : 'border-[#593650] bg-[#170F1B] text-[#C4B4C9] hover:bg-[#2B1B2D]'
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
                placeholder="e.g. TS 09 XX 1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                full
                className="mt-2 bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 font-bold shadow-md"
              >
                Continue to Verification
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Verification & Agreement</h2>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#EC55C8] hover:text-[#F58AD8]"
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

              <div className="rounded-2xl border border-[#593650] bg-[#170F1B] p-4 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Shield className="h-4 w-4 text-[#EC55C8]" /> Partner Safety & Terms
                </div>
                <div className="flex items-start gap-2 text-[#94849A]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20C878] mt-0.5" />
                  <span>I agree to maintain a valid driving license and vehicle registration.</span>
                </div>
                <div className="flex items-start gap-2 text-[#94849A]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20C878] mt-0.5" />
                  <span>I agree to deliver customer packages safely and collect cash payments accurately.</span>
                </div>
                <div className="flex items-start gap-2 text-[#94849A]">
                  <FileCheck className="h-4 w-4 shrink-0 text-[#20C878] mt-0.5" />
                  <span>Document verification is pre-approved for local test partner environment.</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                full
                disabled={loading}
                className="mt-4 bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] py-3.5 font-bold shadow-md"
              >
                {loading ? 'Creating Captain Account…' : 'Complete Registration & Start'}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-[#94849A]">
            Already registered as Captain?{' '}
            <Link
              to={ROUTES.captainLogin}
              className="font-bold text-[#EC55C8] hover:text-[#F58AD8] underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
