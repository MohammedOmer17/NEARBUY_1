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
    <div className="min-h-screen bg-[#100A14] text-white pb-12">
      <PageHeader title="Store & Owner Profile" back={false} />

      <div className="space-y-4 p-4">
        {/* Profile Card */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] text-2xl font-black text-white shadow-md shadow-pink-500/25">
              {(owner?.name || profile?.shopOwner?.name || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold text-white">
                {owner?.name || profile?.shopOwner?.name || 'Shop Owner'}
              </h2>
              <p className="truncate text-xs text-[#94849A]">
                {owner?.email || profile?.shopOwner?.email || 'No email registered'}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#20C878]/15 border border-[#20C878]/30 px-2.5 py-0.5 text-[10px] font-semibold text-[#20C878]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20C878]" />
                Verified Merchant
              </div>
            </div>
          </div>
        </div>

        {/* Shop Overview */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Store Information</h3>
            <span className="rounded-full bg-[#2B1B2D] border border-[#593650] px-2.5 py-0.5 text-[10px] font-bold text-[#F58AD8]">
              Active Store
            </span>
          </div>

          <div className="space-y-3 text-xs text-[#94849A]">
            <div className="flex items-start gap-3 rounded-2xl bg-[#170F1B] border border-[#593650] p-3">
              <Store className="h-4 w-4 shrink-0 text-[#EC55C8] mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">{shop?.shopName || 'NearBuy Partner Shop'}</p>
                <p className="text-[11px] text-[#94849A]">{shop?.category || 'General Store'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-[#170F1B] border border-[#593650] p-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#EC55C8] mt-0.5" />
              <div>
                <p className="font-semibold text-white">Address</p>
                <p className="text-[11px] text-[#94849A]">{shop?.address || 'Address not configured'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-[#170F1B] border border-[#593650] p-3">
              <Phone className="h-4 w-4 shrink-0 text-[#EC55C8]" />
              <div>
                <p className="font-semibold text-white">Contact Number</p>
                <p className="text-[11px] text-[#94849A]">{shop?.contact || owner?.phone || 'Not configured'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#EC55C8]" />
              <h3 className="text-sm font-bold text-white">Customer UPI & QR</h3>
            </div>
            {!isEditingPayment && (
              <button
                type="button"
                onClick={() => setIsEditingPayment(true)}
                className="text-xs font-bold text-[#EC55C8] hover:text-[#F58AD8] transition"
              >
                Configure
              </button>
            )}
          </div>

          {paymentSuccess && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#20C878]/15 border border-[#20C878]/30 p-2.5 text-xs text-[#20C878]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#20C878]" />
              <span>{paymentSuccess}</span>
            </div>
          )}

          {paymentError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-danger/15 border border-danger/30 p-2.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
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
              <p className="text-[10px] text-[#94849A]">
                Customers see this UPI ID and QR code during UPI payment checkout.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditingPayment(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
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
              <div className="flex items-center justify-between rounded-xl bg-[#170F1B] border border-[#593650] p-3">
                <span className="text-[#94849A]">UPI ID</span>
                <span className="font-bold text-white">
                  {payment?.upiId || <span className="text-[#94849A] font-normal">Not configured</span>}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#170F1B] border border-[#593650] p-3">
                <span className="text-[#94849A]">QR Code</span>
                <span className="font-bold text-white">
                  {payment?.qrCode ? (
                    <span className="inline-flex items-center gap-1 text-[#EC55C8]">
                      <QrCode className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="text-[#94849A] font-normal">Not configured</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="rounded-3xl border border-[#593650] bg-[#211522] p-5 shadow-card text-white">
          <h3 className="text-sm font-bold text-white mb-2">Switch NearBuy Mode</h3>
          <p className="text-xs text-[#94849A] mb-3">
            Quickly test or switch between Customer, Shop Owner, and Captain interfaces.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/home"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#170F1B] border border-[#593650] p-3 text-xs font-bold text-white hover:border-[#EC55C8] transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-[#EC55C8]" /> Customer App
            </Link>
            <Link
              to="/captain/home"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#170F1B] border border-[#593650] p-3 text-xs font-bold text-white hover:border-[#EC55C8] transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-[#B65DDA]" /> Captain App
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
