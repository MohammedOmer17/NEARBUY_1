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
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-50 text-accent-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-mute">{label}</p>
        <p className="truncate text-xs font-bold text-ink">{value || 'Not provided'}</p>
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
    <div className="pb-16">
      <PageHeader title="Customer Profile" back={false} />

      <div className="space-y-4 px-4 pt-3">
        {/* User Card */}
        <section className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card border border-line">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-xl font-black text-white shadow-md shadow-pink-500/20">
            {initials(customer?.name || 'Customer')}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-ink">{customer?.name || 'NearBuy Customer'}</h2>
            <p className="truncate text-xs text-mute font-medium">{customer?.email}</p>
            <span className="mt-1 inline-block text-[10px] font-bold text-accent-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-100">
              Customer Account
            </span>
          </div>
        </section>

        {/* Contact Information */}
        <section className="divide-y divide-line rounded-2xl bg-white px-4 shadow-card border border-line">
          <Row icon={Phone} label="Phone Number" value={customer?.phone} />
          <Row icon={Mail} label="Email Address" value={customer?.email} />
          <div className="flex items-center gap-3 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-50 text-accent-500">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-mute">Delivery Location</p>
              <p className="truncate text-xs font-bold text-ink">
                {location ? (location.address || location.label || 'Hyderabad') : 'Not set'}
              </p>
              {location?.updatedAt && (
                <p className="text-[10px] text-mute">{formatDateTime(location.updatedAt)}</p>
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
            className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-card border border-line text-ink transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  {unread} new
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-mute" />
            </div>
          </Link>
        </div>

        {/* Switch Roles section */}
        <section className="rounded-2xl bg-white p-4 shadow-card border border-line space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-mute">Other Portals</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={ROUTES.ownerDashboard}
              className="flex items-center gap-2 rounded-xl bg-canvas p-2.5 text-xs font-bold text-ink border border-line hover:border-pink-300 transition"
            >
              <Store className="h-4 w-4 text-pink-600" />
              <span>Shop Owner</span>
            </Link>
            <Link
              to={ROUTES.captainHome}
              className="flex items-center gap-2 rounded-xl bg-canvas p-2.5 text-xs font-bold text-ink border border-line hover:border-purple-300 transition"
            >
              <Bike className="h-4 w-4 text-purple-600" />
              <span>Delivery Partner</span>
            </Link>
          </div>
        </section>

        {/* Logout */}
        <Button
          full
          variant="danger"
          loading={leaving}
          onClick={async () => {
            setLeaving(true)
            await logout()
          }}
          className="text-xs font-bold"
        >
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </div>
    </div>
  )
}
