import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import { CartProvider } from './context/CartContext'
import { NotificationProvider } from './context/NotificationContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary title="NearBuy Application Error" message="Something went wrong while loading NearBuy. Please reload.">
        <ToastProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                <NotificationProvider>
                  <AppRouter />
                </NotificationProvider>
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
