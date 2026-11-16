import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import {
  ProtectedRoute,
  GuestRoute,
  OwnerProtectedRoute,
  OwnerGuestRoute,
  CaptainProtectedRoute,
  CaptainGuestRoute,
} from './ProtectedRoute'
import AuthLayout from '../layouts/AuthLayout'
import TabsLayout from '../layouts/TabsLayout'
import StackLayout from '../layouts/StackLayout'
import OwnerShell from '../layouts/OwnerShell'
import CaptainShell from '../layouts/CaptainShell'
import PhoneFrame from '../layouts/PhoneFrame'
import { OwnerAuthProvider } from '../context/OwnerAuthContext'
import { CaptainAuthProvider } from '../context/CaptainAuthContext'
import ErrorBoundary from '../components/shared/ErrorBoundary'

// Lazy-loaded Customer Screens
const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const RegisterPage = lazy(() => import('../features/auth/RegisterPage'))
const HomePage = lazy(() => import('../features/customer/home/HomePage'))
const ShopPage = lazy(() => import('../features/customer/shops/ShopPage'))
const ProductPage = lazy(() => import('../features/customer/products/ProductPage'))
const CartPage = lazy(() => import('../features/customer/cart/CartPage'))
const CheckoutPage = lazy(() => import('../features/customer/checkout/CheckoutPage'))
const OrdersPage = lazy(() => import('../features/customer/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('../features/customer/orders/OrderDetailPage'))
const NotificationsPage = lazy(() => import('../features/customer/notifications/NotificationsPage'))
const ProfilePage = lazy(() => import('../features/customer/profile/ProfilePage'))

// Lazy-loaded Shop Owner Screens
const OwnerLoginPage = lazy(() => import('../features/shopOwner/OwnerLoginPage'))
const OwnerRegisterPage = lazy(() => import('../features/shopOwner/OwnerRegisterPage'))
const OwnerDashboardPage = lazy(() => import('../features/shopOwner/OwnerDashboardPage'))
const OwnerOrdersPage = lazy(() => import('../features/shopOwner/OwnerOrdersPage'))
const OwnerProductsPage = lazy(() => import('../features/shopOwner/OwnerProductsPage'))
const OwnerSalesPage = lazy(() => import('../features/shopOwner/OwnerSalesPage'))
const OwnerProfilePage = lazy(() => import('../features/shopOwner/OwnerProfilePage'))

// Lazy-loaded Captain Screens
const CaptainLoginPage = lazy(() => import('../features/captain/CaptainLoginPage'))
const CaptainRegisterPage = lazy(() => import('../features/captain/CaptainRegisterPage'))
const CaptainHomePage = lazy(() => import('../features/captain/CaptainHomePage'))
const CaptainDeliveryDetailPage = lazy(() => import('../features/captain/CaptainDeliveryDetailPage'))
const CaptainHistoryPage = lazy(() => import('../features/captain/CaptainHistoryPage'))
const CaptainEarningsPage = lazy(() => import('../features/captain/CaptainEarningsPage'))
const CaptainProfilePage = lazy(() => import('../features/captain/CaptainProfilePage'))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        <span className="text-[11px] font-medium text-mute tracking-wider uppercase">Loading...</span>
      </div>
    </div>
  )
}

function OwnerScope() {
  return (
    <OwnerAuthProvider>
      <Outlet />
    </OwnerAuthProvider>
  )
}

function CaptainScope() {
  return (
    <CaptainAuthProvider>
      <Outlet />
    </CaptainAuthProvider>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Customer Guest Routes */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
          </Route>
        </Route>

        {/* Customer Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<TabsLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route
              path={ROUTES.orders}
              element={
                <ErrorBoundary title="Orders Error" message="Unable to load orders list. Please try reloading.">
                  <OrdersPage />
                </ErrorBoundary>
              }
            />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
          </Route>
          <Route element={<StackLayout />}>
            <Route path={ROUTES.shop()} element={<ShopPage />} />
            <Route path={ROUTES.product()} element={<ProductPage />} />
            <Route path={ROUTES.cart} element={<CartPage />} />
            <Route
              path={ROUTES.checkout}
              element={
                <ErrorBoundary title="Checkout Error" message="Unable to complete checkout. Your cart items are preserved.">
                  <CheckoutPage />
                </ErrorBoundary>
              }
            />
            <Route
              path={ROUTES.order()}
              element={
                <ErrorBoundary title="Order Details Error" message="Unable to display this order. Please try reloading.">
                  <OrderDetailPage />
                </ErrorBoundary>
              }
            />
            <Route path={ROUTES.notifications} element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Shop Owner Routes */}
        <Route element={<OwnerScope />}>
          <Route element={<OwnerGuestRoute />}>
            <Route path={ROUTES.ownerLogin} element={<OwnerLoginPage />} />
            <Route path={ROUTES.ownerRegister} element={<OwnerRegisterPage />} />
          </Route>
          <Route element={<OwnerProtectedRoute />}>
            <Route element={<OwnerShell />}>
              <Route path={ROUTES.ownerDashboard} element={<OwnerDashboardPage />} />
              <Route path={ROUTES.ownerOrders} element={<OwnerOrdersPage />} />
              <Route path={ROUTES.ownerProducts} element={<OwnerProductsPage />} />
              <Route path={ROUTES.ownerSales} element={<OwnerSalesPage />} />
              <Route path={ROUTES.ownerProfile} element={<OwnerProfilePage />} />
            </Route>
          </Route>
        </Route>

        {/* Captain Routes */}
        <Route element={<CaptainScope />}>
          <Route element={<CaptainGuestRoute />}>
            <Route path={ROUTES.captainLogin} element={<CaptainLoginPage />} />
            <Route path={ROUTES.captainRegister} element={<CaptainRegisterPage />} />
          </Route>
          <Route element={<CaptainProtectedRoute />}>
            <Route element={<CaptainShell />}>
              <Route path={ROUTES.captainHome} element={<CaptainHomePage />} />
              <Route path={ROUTES.captainNotifications} element={<NotificationsPage />} />
              <Route path={ROUTES.captainHistory} element={<CaptainHistoryPage />} />
              <Route path={ROUTES.captainEarnings} element={<CaptainEarningsPage />} />
              <Route path={ROUTES.captainProfile} element={<CaptainProfilePage />} />
            </Route>
            <Route
              path={ROUTES.captainDelivery()}
              element={
                <PhoneFrame>
                  <ErrorBoundary
                    title="Delivery Mission Error"
                    message="An unexpected error occurred while displaying this delivery mission. You can safely return to the home screen."
                  >
                    <CaptainDeliveryDetailPage />
                  </ErrorBoundary>
                </PhoneFrame>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </Suspense>
  )
}
