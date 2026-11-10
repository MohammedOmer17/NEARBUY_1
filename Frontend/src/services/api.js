import { apiClient } from './apiClient'
import {
  unwrap,
  normalizeProduct,
  normalizeShop,
  normalizeCart,
  normalizeOrder,
  normalizeNotification,
  normalizePaymentInfo,
  normalizeCaptainDelivery,
} from './normalizers'

const list = (data, ...keys) => {
  const v = unwrap(data, ...keys)
  return Array.isArray(v) ? v : []
}

export const authApi = {
  profile: () =>
    apiClient
      .get('/User/profile', { skipAuthEvent: true, role: 'customer' })
      .then((r) => unwrap(r.data, 'customer', 'user', 'data')),
  login: (body) =>
    apiClient.post('/User/login', body, { skipAuthEvent: true, role: 'customer' }).then((r) => r.data),
  register: (body) =>
    apiClient.post('/User/register', body, { skipAuthEvent: true, role: 'customer' }).then((r) => r.data),
  logout: () => apiClient.post('/User/logout', null, { skipAuthEvent: true, role: 'customer' }).then((r) => r.data),
}

export const locationApi = {
  get: () => apiClient.get('/User/location').then((r) => r.data),
  update: (latitude, longitude, address) =>
    apiClient.patch('/User/location', { latitude, longitude, address }).then((r) => r.data),
  reverseGeocode: (latitude, longitude) =>
    apiClient
      .get('/maps/reverse-geocode', { params: { lat: latitude, lng: longitude } })
      .then((r) => r.data?.data),
}

export const shopApi = {
  // Discover nearby active shops ranked by distance to given customer coordinates
  nearby: (latitude, longitude, maxDistanceKm = 30) =>
    apiClient
      .get('/shops/nearby', { params: { latitude, longitude, maxDistanceKm } })
      .then((r) => list(r.data, 'shops', 'data').map(normalizeShop).filter((s) => s.id)),
  // List all active shops
  list: () =>
    apiClient
      .get('/shops')
      .then((r) => list(r.data, 'shops', 'data').map(normalizeShop).filter((s) => s.id)),
  // Retrieve single shop by ID
  getById: (shopId) =>
    apiClient
      .get(`/shops/${shopId}`)
      .then((r) => normalizeShop(unwrap(r.data, 'shop', 'data'))),
  // Assessment calculates route & fulfillment feasibility for specific items.
  assess: (items, fulfillmentType = 'delivery') =>
    apiClient
      .post('/assessment/shops', { items, fulfillmentType })
      .then((r) => list(r.data, 'shops', 'results', 'data').map(normalizeShop).filter((s) => s.id)),
  paymentInfo: (shopId) =>
    apiClient.get(`/shop/${shopId}/payment`).then((r) => normalizePaymentInfo(r.data)),
}

export const productApi = {
  byShop: (shopId, query = {}) =>
    apiClient
      .get(`/shop-products/shop/${shopId}`, { params: query })
      .then((r) =>
        list(r.data, 'products', 'data').map((p) =>
          normalizeProduct({
            ...p,
            shopId: p.shop?._id || p.shop?.id || p.shop || shopId,
          }),
        ),
      ),
  one: (id) =>
    apiClient
      .get(`/shop-products/${id}`)
      .then((r) => normalizeProduct(unwrap(r.data, 'product', 'data'))),
  offers: (id, params = {}) =>
    apiClient
      .get(`/shop-products/${id}/offers`, { params })
      .then((r) => ({
        product: normalizeProduct(unwrap(r.data, 'product')),
        offers: list(r.data, 'offers').map((o) => ({
          ...normalizeProduct(o),
          distanceKm: o.distanceKm ?? o.shop?.distanceKm ?? null,
          isAvailable: o.isAvailable !== false,
          available: o.isAvailable !== false,
          shop: normalizeShop(o.shop),
        })),
        totalOffers: r.data?.totalOffers || list(r.data, 'offers').length,
      })),
  suggestions: (q, category) => {
    if (!q || typeof q !== 'string' || q.trim().length < 2) return Promise.resolve([])
    return apiClient
      .get('/shop-products/suggestions', { params: { q: q.trim(), category } })
      .then((r) => r.data?.suggestions || [])
  },
}

export const cartApi = {
  get: () => apiClient.get('/cart').then((r) => normalizeCart(r.data)),
  add: (productId, quantity = 1) =>
    apiClient.post('/cart', { productId, quantity }).then((r) => r.data),
  update: (productId, quantity) =>
    apiClient.put(`/cart/${productId}`, { quantity }).then((r) => r.data),
  remove: (productId) => apiClient.delete(`/cart/${productId}`).then((r) => r.data),
  clear: () => apiClient.delete('/cart/clear').then((r) => r.data),
}

export const orderApi = {
  create: (payload) =>
    apiClient
      .post('/orders', payload)
      .then((r) => normalizeOrder(unwrap(r.data, 'order', 'data'))),
  list: () =>
    apiClient.get('/orders').then((r) => list(r.data, 'orders', 'data').map(normalizeOrder)),
  get: (id) =>
    apiClient
      .get(`/orders/${id}`)
      .then((r) => normalizeOrder(unwrap(r.data, 'order', 'data'))),
  cancel: (id) => apiClient.put(`/orders/${id}/cancel`).then((r) => r.data),
  markPaid: (id) => apiClient.patch(`/orders/${id}/payment/mark-paid`).then((r) => r.data),
}

export const shopOwnerApi = {
  register: (body) =>
    apiClient.post('/shop-owner/register', body, { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  login: (body) =>
    apiClient.post('/shop-owner/login', body, { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  logout: () =>
    apiClient.post('/shop-owner/logout', null, { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  me: () => apiClient.get('/shop-owner/me', { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  payment: () => apiClient.get('/shop-owner/payment', { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  updatePayment: (body) =>
    apiClient.patch('/shop-owner/payment', body, { skipAuthEvent: true, role: 'owner' }).then((r) => r.data),
  salesSummary: (params = {}) => {
    const p = typeof params === 'string' ? { period: params } : params
    return apiClient.get('/sales/summary', { params: p, role: 'owner' }).then((r) => r.data)
  },
  salesStatistics: (params = {}) => {
    const p = typeof params === 'string' ? { period: params } : params
    return apiClient.get('/sales/statistics', { params: p, role: 'owner' }).then((r) => r.data)
  },
  salesTrends: (period = 'daily') => {
    const params = typeof period === 'object' ? period : { period }
    return apiClient.get('/sales/trends', { params, role: 'owner' }).then((r) => r.data)
  },
  topProducts: (params = {}) => {
    const p = typeof params === 'string' ? { period: params } : params
    return apiClient.get('/sales/top-products', { params: p, role: 'owner' }).then((r) => r.data)
  },
  listOrders: (params) =>
    apiClient.get('/shop/orders', { params, role: 'owner' }).then((r) => r.data?.orders ?? []),
  getOrder: (id) => apiClient.get(`/shop/orders/${id}`, { role: 'owner' }).then((r) => r.data?.order ?? null),
  acceptOrder: (id) => apiClient.put(`/shop/orders/${id}/accept`, null, { role: 'owner' }).then((r) => r.data),
  updateOrderStatus: (id, status) =>
    apiClient.put(`/shop/orders/${id}/status`, { status }, { role: 'owner' }).then((r) => r.data),
  confirmPayment: (id) =>
    apiClient.patch(`/shop/orders/${id}/payment/confirm`, null, { role: 'owner' }).then((r) => r.data),
  confirmCodPayment: (id) =>
    apiClient.patch(`/shop/orders/${id}/payment/confirm-cod`, null, { role: 'owner' }).then((r) => r.data),
  productCount: async (shopId) => {
    if (!shopId) return 0
    const res = await apiClient.get(`/shop-products/shop/${shopId}`, { params: { countOnly: true }, role: 'owner' })
    return res.data?.totalCount ?? res.data?.count ?? 0
  },
  listProducts: async (shopId) => {
    if (!shopId) throw new Error('Shop ID is required')
    const res = await apiClient.get(`/shop-products/shop/${shopId}`, { role: 'owner' })
    return res.data?.products ?? []
  },
  createProduct: (payload) => apiClient.post('/shop-products', payload, { role: 'owner' }).then((r) => r.data),
  updateProduct: (id, payload) =>
    apiClient.put(`/shop-products/${id}`, payload, { role: 'owner' }).then((r) => r.data),
  deleteProduct: (id) => apiClient.delete(`/shop-products/${id}`, { role: 'owner' }).then((r) => r.data),
  updateStock: (id, quantity) =>
    apiClient.patch(`/shop-products/${id}/stock`, { quantity }, { role: 'owner' }).then((r) => r.data),
  suggestions: (q, category) => productApi.suggestions(q, category),
}

export const captainApi = {
  register: (body) =>
    apiClient.post('/captain/register', body, { skipAuthEvent: true, role: 'captain' }).then((r) => r.data),
  login: (body) =>
    apiClient.post('/captain/login', body, { skipAuthEvent: true, role: 'captain' }).then((r) => r.data),
  logout: () =>
    apiClient.post('/captain/logout', null, { skipAuthEvent: true, role: 'captain' }).then((r) => r.data),
  profile: () =>
    apiClient.get('/captain/profile', { skipAuthEvent: true, role: 'captain' }).then((r) => r.data?.captain ?? null),
  updateProfile: (body) => apiClient.put('/captain/profile', body, { role: 'captain' }).then((r) => r.data),
  changePassword: (body) => apiClient.put('/captain/change-password', body, { role: 'captain' }).then((r) => r.data),
  updateAvailability: (availabilityStatus) =>
    apiClient.patch('/captain/availability', { availabilityStatus }, { role: 'captain' }).then((r) => r.data),
  location: () => apiClient.get('/captain/location', { role: 'captain' }).then((r) => r.data),
  updateLocation: (latitude, longitude) =>
    apiClient.patch('/captain/location', { latitude, longitude }, { role: 'captain' }).then((r) => r.data),
  serviceAreas: () =>
    apiClient.get('/captain/service-areas', { role: 'captain' }).then((r) => r.data),
  updateServiceAreas: (serviceAreas) =>
    apiClient.put('/captain/service-areas', { serviceAreas }, { role: 'captain' }).then((r) => r.data),
  availableDeliveries: () =>
    apiClient.get('/captain/deliveries/available', { role: 'captain' }).then((r) => r.data?.deliveries ?? []),
  acceptDelivery: (orderId) =>
    apiClient.post(`/captain/deliveries/${orderId}/accept`, null, { role: 'captain' }).then((r) => r.data),
  currentDelivery: () =>
    apiClient.get('/captain/deliveries/current', { role: 'captain' }).then((r) => normalizeCaptainDelivery(r.data?.delivery)),
  confirmArrived: (orderId) =>
    apiClient.patch(`/captain/deliveries/${orderId}/arrived`, null, { role: 'captain' }).then((r) => r.data),
  confirmPickup: (orderId) =>
    apiClient.patch(`/captain/deliveries/${orderId}/pickup`, null, { role: 'captain' }).then((r) => r.data),
  startDelivery: (orderId) =>
    apiClient.patch(`/captain/deliveries/${orderId}/start`, null, { role: 'captain' }).then((r) => r.data),
  collectPayment: (orderId) =>
    apiClient.patch(`/captain/deliveries/${orderId}/payment/collect`, null, { role: 'captain' }).then((r) => r.data),
  completeDelivery: (orderId) =>
    apiClient.patch(`/captain/deliveries/${orderId}/complete`, null, { role: 'captain' }).then((r) => r.data),
  deliveryHistory: () =>
    apiClient
      .get('/captain/deliveries/history', { role: 'captain' })
      .then((r) => list(r.data, 'deliveries').map(normalizeCaptainDelivery)),
}

export const mapsApi = {
  captainToShop: (shopId, coords) => {
    const params = coords?.latitude && coords?.longitude ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : ''
    return apiClient.get(`/maps/captain-to-shop/${shopId}${params}`, { role: 'captain' }).then((r) => r.data)
  },
  captainToCustomer: (orderId, coords) => {
    const params = coords?.latitude && coords?.longitude ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : ''
    return apiClient.get(`/maps/captain-to-customer/${orderId}${params}`, { role: 'captain' }).then((r) => r.data)
  },
  shopToCustomer: (orderId) =>
    apiClient.get(`/maps/shop-to-customer/${orderId}`, { role: 'owner' }).then((r) => r.data),
  deliveryRoute: (orderId, coords) => {
    const params = coords?.latitude && coords?.longitude ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : ''
    return apiClient.get(`/maps/delivery-route/${orderId}${params}`).then((r) => r.data?.data ?? r.data)
  },
}

export const notificationApi = {
  list: () =>
    apiClient
      .get('/notifications/')
      .then((r) => list(r.data, 'notifications', 'data').map(normalizeNotification)),
  unreadCount: () =>
    apiClient.get('/notifications/unread-count').then((r) => {
      const d = r.data
      return Number(d?.count ?? d?.unreadCount ?? d?.data ?? 0) || 0
    }),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
  remove: (id) => apiClient.delete(`/notifications/${id}`).then((r) => r.data),
  clearAll: () => apiClient.delete('/notifications/').then((r) => r.data),
}
