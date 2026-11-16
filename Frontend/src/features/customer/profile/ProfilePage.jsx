import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, LogOut, MapPin, Phone, Mail, Store, Bike } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useLocation } from '../../../context/LocationContext'
import { useNotifications } from '../../../context/NotificationContext'
import { ROUTES } from '../../../config/routes'
import { formatDateTime, initials } from '../../../utils/format'
import PageHeader from '../../../components/shared/PageHeader'
import Button from '../../../components/ui/Button'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#94849A]">{label}</p>
        <p className="truncate text-xs font-bold text-white">{value || 'Not provided'}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { customer, logout } = useAuth()
  const { location, openSheet } = useLocation()
  const { unread } = useNotifications()
  const [leaving, setLeaving] = useState(false)

  return (
    <div className="min-h-screen bg-[#100A14] text-white pb-16">
      <PageHeader title="Customer Profile" back={false} />

      <div className="space-y-4 px-4 pt-3">
        {/* User Card */}
        <section className="flex items-center gap-4 rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650]">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#EC55C8] to-[#B65DDA] text-xl font-black text-white shadow-md shadow-pink-500/25">
            {initials(customer?.name || 'Customer')}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-white">{customer?.name || 'NearBuy Customer'}</h2>
            <p className="truncate text-xs text-[#94849A] font-medium">{customer?.email}</p>
            <span className="mt-1 inline-block text-[10px] font-bold text-[#F58AD8] bg-[#EC55C8]/15 px-2.5 py-0.5 rounded-full border border-[#EC55C8]/30">
              Customer Account
            </span>
          </div>
        </section>

        {/* Contact Information */}
        <section className="divide-y divide-[#593650] rounded-2xl bg-[#211522] px-4 shadow-card border border-[#593650]">
          <Row icon={Phone} label="Phone Number" value={customer?.phone} />
          <Row icon={Mail} label="Email Address" value={customer?.email} />
          <div className="flex items-center gap-3 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#94849A]">Delivery Location</p>
              <p className="truncate text-xs font-bold text-white">
                {location ? (location.address || location.label || 'Hyderabad') : 'Not set'}
              </p>
              {location?.updatedAt && (
                <p className="text-[10px] text-[#94849A]">{formatDateTime(location.updatedAt)}</p>
              )}
            </div>
            <Button size="sm" variant="soft" onClick={openSheet} className="text-xs font-bold">
              {location ? 'Update' : 'Set'}
            </Button>
          </div>
        </section>

        {/* Quick Links */}
        <div className="space-y-2">
          <Link
            to={ROUTES.notifications}
            className="flex items-center justify-between rounded-2xl bg-[#211522] p-3.5 shadow-card border border-[#593650] text-white transition active:scale-[0.99] hover:border-[#EC55C8]/50"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#2B1B2D] border border-[#593650] text-[#EC55C8]">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <span className="rounded-full bg-gradient-to-r from-[#EC55C8] to-[#B65DDA] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  {unread} new
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-[#94849A]" />
            </div>
          </Link>
        </div>

        {/* Switch Roles section */}
        <section className="rounded-2xl bg-[#211522] p-4 shadow-card border border-[#593650] space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#94849A]">Other Portals</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={ROUTES.ownerDashboard}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8]"
            >
              <Store className="h-4 w-4 text-[#EC55C8]" /> Shop Owner
            </Link>
            <Link
              to={ROUTES.captainHome}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#593650] bg-[#170F1B] p-3 text-xs font-bold text-white transition hover:border-[#EC55C8]"
            >
              <Bike className="h-4 w-4 text-[#B65DDA]" /> Delivery Captain
            </Link>
          </div>
        </section>

        {/* Logout Button */}
        <div className="pt-2">
          <Button
            full
            variant="outline"
            loading={leaving}
            onClick={async () => {
              setLeaving(true)
              try {
                await logout()
              } finally {
                setLeaving(false)
              }
            }}
            className="border-danger/40 text-danger hover:bg-danger/10 text-xs font-bold flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
