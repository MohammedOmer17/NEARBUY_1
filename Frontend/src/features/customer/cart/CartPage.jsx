import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../context/CartContext'
import { ROUTES } from '../../../config/routes'

export default function CartPage() {
  const { openCart } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    openCart()
    navigate(ROUTES.home, { replace: true })
  }, [openCart, navigate])

  return null
}
