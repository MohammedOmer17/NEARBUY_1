import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bike,
  User,
  Phone,
  Mail,
  Lock,
  Power,
  ShieldCheck,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Car,
  MapPin,
  Search,
  Plus,
  Trash2,
} from 'lucide-react'
import { useCaptainAuth } from '../../context/CaptainAuthContext'
import { captainApi } from '../../services/api'
import { ROUTES } from '../../config/routes'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function CaptainProfilePage() {
  const navigate = useNavigate()
  const { captain, updateAvailability, updateProfile, updateServiceAreas, changePassword, logout } = useCaptainAuth()

  const [isEditingVehicle, setIsEditingVehicle] = useState(false)
  const [vehicleType, setVehicleType] = useState(captain?.vehicle?.type || 'bike')
  const [vehicleModel, setVehicleModel] = useState(captain?.vehicle?.model || '')
  const [vehicleNumber, setVehicleNumber] = useState(captain?.vehicle?.number || '')

  // Service Areas state
  const [serviceAreas, setServiceAreas] = useState([])
  const [allLocalities, setAllLocalities] = useState([])
  const [localitySearch, setLocalitySearch] = useState('')
  const [savingAreas, setSavingAreas] = useState(false)
  const [areasChanged, setAreasChanged] = useState(false)

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  // Load verified localities and restore saved service areas from Captain record
  useEffect(() => {
    let alive = true
    captainApi
      .serviceAreas()
      .then((res) => {
        if (!alive) return
        if (Array.isArray(res?.availableLocalities)) {
          setAllLocalities(res.availableLocalities)
        }
        if (Array.isArray(res?.serviceAreas)) {
          setServiceAreas(res.serviceAreas)
        } else if (Array.isArray(captain?.serviceAreas)) {
          setServiceAreas(captain.serviceAreas)
        }
      })
      .catch(() => {
        if (Array.isArray(captain?.serviceAreas)) {
          setServiceAreas(captain.serviceAreas)
        }
      })

    return () => {
      alive = false
    }
  }, [captain?.serviceAreas])

  const handleAddServiceArea = (loc) => {
    if (!loc) return
    const id = loc.id || loc.localityId
    if (serviceAreas.some((sa) => (sa.localityId || sa.id) === id)) {
      return // Prevent duplicates
    }
    const newArea = {
      localityId: loc.id,
      name: loc.name,
      zone: loc.zone || '',
      sublocalities: loc.sublocalities || [],
      latitude: loc.latitude || null,
      longitude: loc.longitude || null,
    }
    setServiceAreas((prev) => [...prev, newArea])
    setAreasChanged(true)
  }

  const handleRemoveServiceArea = (localityId) => {
    setServiceAreas((prev) => prev.filter((sa) => (sa.localityId || sa.id) !== localityId))
    setAreasChanged(true)
  }

  const handleSaveServiceAreas = async () => {
    setSavingAreas(true)
    setError('')
    setMsg('')
    try {
      await updateServiceAreas(serviceAreas)
      setMsg('Service delivery areas updated successfully!')
      setAreasChanged(false)
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to update service areas')
    } finally {
      setSavingAreas(false)
    }
  }

  const isOnline = captain?.availabilityStatus === 'available' || captain?.availabilityStatus === 'busy'

  const handleToggleOnline = async () => {
    try {
      const next = isOnline ? 'offline' : 'available'
      await updateAvailability(next)
      setMsg(`Status updated to ${next.toUpperCase()}`)
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setError('Failed to update status.')
    }
  }

  const handleSaveVehicle = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMsg('')

    try {
      await updateProfile({
        vehicle: {
          type: vehicleType,
          model: vehicleModel.trim(),
          number: vehicleNumber.trim().toUpperCase(),
        },
      })
      setMsg('Vehicle details updated successfully!')
      setIsEditingVehicle(false)
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to update vehicle details')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setMsg('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setMsg('Password changed successfully! Please log in again.')
      setTimeout(() => {
        logout()
        navigate(ROUTES.captainLogin)
      }, 1500)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <PageHeader title="Captain Profile" back={false} />

      <div className="space-y-4 p-4">
        {/* Messages */}
        {msg && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 via-pink-600 to-purple-800 text-2xl font-black text-white shadow-md">
              {(captain?.name || 'C').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-black text-ink">{captain?.name || 'Captain Partner'}</h2>
              <p className="truncate text-xs text-mute">{captain?.email || 'captain@nearbuy.local'}</p>
              <p className="text-xs text-mute mt-0.5">{captain?.phone || '+91 98765 43210'}</p>
            </div>
          </div>

          {/* Duty status toggle button */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-canvas p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Power className={`h-4 w-4 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Duty Status</span>
            </div>
            <button
              type="button"
              onClick={handleToggleOnline}
              className={`rounded-full px-3 py-1 text-xs font-bold transition shadow-sm ${
                isOnline
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        </div>

        {/* Service Areas (Locality Selection) */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-ink">Service Delivery Areas</h3>
            </div>
            {areasChanged && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-mute mb-3">
            Choose your active localities (e.g. Mehdipatnam, Abids, Murad Nagar). You will only receive delivery dispatch offers for orders within your configured areas.
          </p>

          {/* Active Selected Areas */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-mute mb-2">
              Active Coverage Areas ({serviceAreas.length})
            </label>
            {serviceAreas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-mute">
                No delivery areas selected yet. Search and add localities below to start receiving order dispatches.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((sa) => {
                  const id = sa.localityId || sa.id
                  return (
                    <div
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-50 border border-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-sm"
                    >
                      <MapPin className="h-3 w-3 text-brand-600 shrink-0" />
                      <span>{sa.name}</span>
                      {sa.zone && (
                        <span className="text-[10px] text-brand-600/80 font-normal">({sa.zone})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceArea(id)}
                        className="ml-1 rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-800 transition-colors"
                        title="Remove area"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add Locality Search & Quick Chips */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-mute">
              Add Verified Localities
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-mute" />
              <input
                type="text"
                value={localitySearch}
                onChange={(e) => setLocalitySearch(e.target.value)}
                placeholder="Search localities (e.g. Mehdipatnam, Abids, Tolichowki)..."
                className="w-full rounded-2xl border border-slate-200 bg-canvas pl-9 pr-3 py-2.5 text-xs font-medium text-ink focus:border-brand-600 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* Locality suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
              {allLocalities
                .filter((loc) => {
                  const alreadySelected = serviceAreas.some((sa) => (sa.localityId || sa.id) === loc.id)
                  if (alreadySelected) return false
                  if (!localitySearch.trim()) return true
                  const q = localitySearch.toLowerCase()
                  return (
                    loc.name.toLowerCase().includes(q) ||
                    loc.zone?.toLowerCase().includes(q) ||
                    loc.sublocalities?.some((s) => s.toLowerCase().includes(q))
                  )
                })
                .slice(0, 10)
                .map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleAddServiceArea(loc)}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-2.5 py-1 text-xs font-medium text-slate-700 border border-transparent hover:border-brand-200 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{loc.name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={savingAreas || !areasChanged}
              onClick={handleSaveServiceAreas}
            >
              <Save className="h-3.5 w-3.5" />
              {savingAreas ? 'Saving Areas…' : 'Save Service Areas'}
            </Button>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-ink">Delivery Vehicle</h3>
            </div>
            {!isEditingVehicle && (
              <button
                type="button"
                onClick={() => {
                  setVehicleType(captain?.vehicle?.type || 'bike')
                  setVehicleModel(captain?.vehicle?.model || '')
                  setVehicleNumber(captain?.vehicle?.number || '')
                  setIsEditingVehicle(true)
                }}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingVehicle ? (
            <form onSubmit={handleSaveVehicle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-ink focus:border-brand-600 focus:outline-none"
                >
                  <option value="bike">Motorcycle (Bike)</option>
                  <option value="scooter">Scooter / Scooty</option>
                  <option value="car">Car / Van</option>
                  <option value="other">EV / Bicycle</option>
                </select>
              </div>

              <Input
                label="Model / Brand"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Hero Splendor"
                required
              />

              <Input
                label="Plate Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH02AB1234"
                required
              />

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setIsEditingVehicle(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={saving}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving…' : 'Save Vehicle'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="text-mute">Type</span>
                <span className="font-bold capitalize text-ink">
                  {captain?.vehicle?.type || 'Motorcycle (Bike)'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="text-mute">Model</span>
                <span className="font-bold text-ink">
                  {captain?.vehicle?.model || 'Hero Splendor'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="text-mute">Plate Number</span>
                <span className="font-bold font-mono text-ink">
                  {captain?.vehicle?.number || 'MH02AB1234'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-ink">Security & Password</h3>
            </div>
            {!showPasswordChange && (
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Change
              </button>
            )}
          </div>

          {showPasswordChange ? (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowPasswordChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={saving}
                >
                  Update Password
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-mute">
              Keep your partner account secure. Update your password regularly.
            </p>
          )}
        </div>

        {/* Role Switcher */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h3 className="text-sm font-bold text-ink mb-2">Switch NearBuy Mode</h3>
          <p className="text-xs text-mute mb-3">
            Access customer shopping or merchant store partner dashboards.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={ROUTES.home}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas p-3 text-xs font-bold text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-brand-600" /> Customer App
            </Link>
            <Link
              to={ROUTES.ownerLogin}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas p-3 text-xs font-bold text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-brand-600" /> Shop Owner App
            </Link>
          </div>
        </div>

        {/* Logout */}
        <Button
          full
          variant="danger"
          onClick={async () => {
            await logout()
            navigate(ROUTES.captainLogin)
          }}
        >
          <LogOut className="h-4 w-4" />
          Log Out of Captain Partner
        </Button>
      </div>
    </div>
  )
}
