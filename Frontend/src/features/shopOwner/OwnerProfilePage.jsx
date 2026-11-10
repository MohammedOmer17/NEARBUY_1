import { useEffect, useState } from 'react'
import {
  LogOut,
  MapPin,
  Phone,
  Store,
  User,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  ArrowRightLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { shopOwnerApi } from '../../services/api'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function OwnerProfilePage() {
  const { owner, logout } = useOwnerAuth()
  const [profile, setProfile] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  // Payment edit state
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [upiId, setUpiId] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      shopOwnerApi.me().catch(() => null),
      shopOwnerApi.payment().catch(() => null),
    ])
      .then(([profileRes, paymentRes]) => {
        if (!alive) return
        setProfile(profileRes ?? null)
        const payData = paymentRes?.data ?? paymentRes ?? null
        setPayment(payData)
        setUpiId(payData?.upiId || '')
        setQrCodeUrl(payData?.qrCode || '')
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const shop = profile?.shop ?? null

  const handleSavePayment = async (e) => {
    e.preventDefault()
    setPaymentSaving(true)
    setPaymentError('')
    setPaymentSuccess('')

    try {
      const res = await shopOwnerApi.updatePayment({
        upiId: upiId.trim(),
        qrCode: qrCodeUrl.trim() || undefined,
      })
      setPayment(res?.data ?? { upiId: upiId.trim(), qrCode: qrCodeUrl.trim() })
      setPaymentSuccess('Payment details saved successfully!')
      setIsEditingPayment(false)
    } catch (err) {
      setPaymentError(
        err?.response?.data?.message || err.message || 'Failed to update payment details'
      )
    } finally {
      setPaymentSaving(false)
    }
  }

  return (
    <div className="pb-8">
      <PageHeader title="Store & Owner Profile" back={false} />

      <div className="space-y-4 p-4">
        {/* Profile Card */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-pink-500 text-2xl font-black text-white shadow-md">
              {(owner?.name || profile?.shopOwner?.name || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold text-ink">
                {owner?.name || profile?.shopOwner?.name || 'Shop Owner'}
              </h2>
              <p className="truncate text-xs text-mute">
                {owner?.email || profile?.shopOwner?.email || 'No email registered'}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Verified Merchant
              </div>
            </div>
          </div>
        </div>

        {/* Shop Overview */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">Store Information</h3>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
              Active Store
            </span>
          </div>

          <div className="space-y-3 text-xs text-mute">
            <div className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
              <Store className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
              <div>
                <p className="font-bold text-ink text-sm">{shop?.shopName || 'NearBuy Partner Shop'}</p>
                <p className="text-[11px] text-mute">{shop?.category || 'General Store'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Address</p>
                <p className="text-[11px] text-mute">{shop?.address || 'Address not configured'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="font-semibold text-ink">Contact Number</p>
                <p className="text-[11px] text-mute">{shop?.contact || owner?.phone || 'Not configured'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Configuration (Real API PATCH /shop-owner/payment) */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-ink">Customer UPI & QR</h3>
            </div>
            {!isEditingPayment && (
              <button
                type="button"
                onClick={() => setIsEditingPayment(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Configure
              </button>
            )}
          </div>

          {paymentSuccess && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{paymentSuccess}</span>
            </div>
          )}

          {paymentError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{paymentError}</span>
            </div>
          )}

          {isEditingPayment ? (
            <form onSubmit={handleSavePayment} className="space-y-3">
              <Input
                label="Shop UPI ID"
                placeholder="e.g. yourshop@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
              <Input
                label="QR Code Image URL (Optional)"
                placeholder="https://example.com/shop-qr.png"
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
              />
              <p className="text-[10px] text-mute">
                Customers see this UPI ID and QR code during UPI payment checkout.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setIsEditingPayment(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={paymentSaving}
                >
                  <Save className="h-3.5 w-3.5" />
                  {paymentSaving ? 'Saving…' : 'Save Details'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="text-mute">UPI ID</span>
                <span className="font-bold text-ink">
                  {payment?.upiId || <span className="text-slate-400 font-normal">Not configured</span>}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-canvas p-3">
                <span className="text-mute">QR Code</span>
                <span className="font-bold text-ink">
                  {payment?.qrCode ? (
                    <span className="inline-flex items-center gap-1 text-brand-600">
                      <QrCode className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal">Not configured</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h3 className="text-sm font-bold text-ink mb-2">Switch NearBuy Mode</h3>
          <p className="text-xs text-mute mb-3">
            Quickly test or switch between Customer, Shop Owner, and Captain interfaces.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/home"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas p-3 text-xs font-bold text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-brand-600" /> Customer App
            </Link>
            <Link
              to="/captain/home"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-canvas p-3 text-xs font-bold text-ink hover:bg-slate-100 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-brand-600" /> Captain App
            </Link>
          </div>
        </div>

        {/* Logout */}
        <Button full variant="danger" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Log Out of Store
        </Button>
      </div>
    </div>
  )
}

