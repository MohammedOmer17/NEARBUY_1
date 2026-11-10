// The backend returns Mongoose documents. These adapters turn them into the
// flat shapes the UI uses, and tolerate populated or unpopulated references.
const refId = (v) => (v && typeof v === 'object' ? v._id || v.id : v)
const asObj = (v) => (v && typeof v === 'object' ? v : null)

export function unwrap(data, ...keys) {
  for (const k of keys) if (data?.[k] !== undefined) return data[k]
  return data
}

export function normalizeProduct(p) {
  const shop = asObj(p.shop)
  const isStocked =
    p.quantity === undefined || p.quantity === null || Number(p.quantity) > 0
  const canonicalId =
    refId(p.canonicalProduct) ||
    p.canonicalProductId ||
    (typeof p.canonicalProduct === 'string' ? p.canonicalProduct : null)

  return {
    id: p._id || p.id,
    canonicalProductId: canonicalId || null,
    shopId: refId(p.shop) || p.shopId || shop?._id || shop?.id || '',
    shopName: shop?.shopName || shop?.name || p.shopName || '',
    shopAddress: shop?.address || p.shopAddress || '',
    shopLocation: shop?.location || p.shopLocation || null,
    name: p.name || '',
    description: p.description || '',
    category: p.category || '',
    brand: p.brand || '',
    image: p.image || '',
    price: Number.isFinite(Number(p.price)) && Number(p.price) >= 0 ? Number(p.price) : 0,
    unit: p.unit || '',
    packSize: p.packSize || '',
    variant: p.variant || '',
    barcode: p.barcode || p.gtin || '',
    // Only availability is exposed. Stock quantity is deliberately dropped.
    available: p.isAvailable !== false && p.available !== false && isStocked,
  }
}

const identityPart = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')

export function getProductIdentityKey(product = {}) {
  if (product.canonicalProductId) {
    return `canonical:${product.canonicalProductId}`
  }

  const barcode = identityPart(product.barcode || product.gtin)
  if (barcode) return `barcode:${barcode}`

  const name = identityPart(product.name)
  const brand = identityPart(product.brand)
  const category = identityPart(product.category)
  const unit = identityPart(product.unit)
  const packSize = identityPart(product.packSize)
  const variant = identityPart(product.variant)

  // Avoid merging by name alone if brand/category/packSize are absent
  if (!name || !unit || (!brand && !category && !packSize && !variant)) return ''
  return [name, brand, brand ? '' : category, unit, packSize, variant].join('|')
}

export function groupProductsByIdentity(products = []) {
  const groups = new Map()

  for (const [index, product] of products.entries()) {
    const key = getProductIdentityKey(product)
    const groupKey = key || `unmatched:${product.id || index}`
    if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, offers: [] })
    groups.get(groupKey).offers.push(product)
  }

  return [...groups.values()].map(({ key, offers }) => {
    const ordered = [...offers].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    const canonical = ordered[0] || offers[0]

    return {
      ...canonical,
      canonicalProductId: canonical.canonicalProductId || null,
      key,
      offers: ordered,
      offerCount: ordered.length,
    }
  })
}

export function normalizeShop(item) {
  const s = asObj(item?.shop) || item || {}
  const rawKm =
    item?.distanceKm ??
    item?.distanceInKm ??
    item?.distance?.kilometers ??
    s.distanceKm ??
    s.distanceInKm ??
    s.distance?.kilometers
  const distanceKm =
    rawKm !== null &&
    rawKm !== undefined &&
    rawKm !== '' &&
    Number.isFinite(Number(rawKm)) &&
    Number(rawKm) >= 0
      ? Number(Number(rawKm).toFixed(2))
      : null

  return {
    id: s._id || s.id,
    name: s.shopName || s.name || 'Shop',
    address: s.address || '',
    image: s.image || s.logo || '',
    distanceKm,
    location: s.location || null,
  }
}

export function normalizeCart(data) {
  const cart = unwrap(data, 'cart', 'data') || {}
  const rawItems = cart.items || []
  const items = rawItems
    .map((i) => {
      const p = asObj(i.product) || {}
      return {
        productId: p._id || p.id || refId(i.product) || i.productId,
        name: i.name || p.name || 'Item',
        image: i.image || p.image || '',
        unit: i.unit || p.unit || '',
        packSize: p.packSize || i.packSize || '',
        price: Number(i.price ?? p.price) || 0,
        quantity: Number(i.quantity) || 0,
      }
    })
    .filter((i) => i.quantity > 0 && i.productId)

  if (items.length === 0) {
    return {
      shopId: null,
      shopName: '',
      shopAddress: '',
      items: [],
    }
  }

  const shop = asObj(cart.shop)
  return {
    shopId: refId(cart.shop) || null,
    shopName: shop?.shopName || shop?.name || '',
    shopAddress: shop?.address || '',
    items,
  }
}


export function normalizeOrder(o) {
  const shop = asObj(o.shop)
  const captain = asObj(o.captain)
  const addr = o.deliveryAddress
  return {
    id: o._id || o.id,
    shopId: refId(o.shop),
    shopName: shop?.shopName || shop?.name || 'Shop',
    shopAddress: shop?.address || '',
    shopLocation: shop?.location || null,
    captainId: refId(o.captain),
    captainName: captain?.name || null,
    captainPhone: captain?.phone || null,
    captainVehicle: captain?.vehicle || null,
    captainLocation: captain?.location || null,
    items: (o.items || []).map((i) => ({
      name: i.name || asObj(i.product)?.name || 'Item',
      quantity: Number(i.quantity) || 0,
      price: Number(i.price) || 0,
      unit: i.unit || '',
    })),
    totalAmount: Number(o.totalAmount) || 0,
    fulfillmentType: o.fulfillmentType,
    status: o.orderStatus,
    paymentMethod: o.payment?.method,
    paymentStatus: o.payment?.status,
    deliveryAddress: typeof addr === 'string' ? addr : addr?.address || '',
    deliveryLocation: o.deliveryLocation || null,
    delivery: o.delivery || {},
    createdAt: o.createdAt,
  }
}

export function normalizeNotification(n) {
  return {
    id: n._id || n.id,
    title: n.title || 'Notification',
    message: n.message || '',
    isRead: !!n.isRead,
    createdAt: n.createdAt,
  }
}

export function normalizePaymentInfo(data) {
  const d = unwrap(data, 'paymentDetails', 'payment', 'data') || {}
  const nested = asObj(d.paymentDetails) || d
  return { upiId: nested.upiId || '', qrCode: nested.qrCode || '' }
}

export function normalizeCaptainDelivery(o) {
  if (!o) return null
  const shop = asObj(o.shop) || {}
  const customer = asObj(o.customer) || {}
  return {
    id: o._id || o.id,
    orderId: o._id || o.id,
    shopId: refId(o.shop),
    shopName: shop.shopName || shop.name || 'Shop',
    shopAddress: shop.address || '',
    shopContact: shop.contact || '',
    shopLocation: shop.location || null,
    customerName: customer.name || 'Customer',
    customerPhone: customer.phone || '',
    deliveryAddress: o.deliveryAddress || '',
    deliveryLocation: o.deliveryLocation || null,
    items: (o.items || []).map((i) => ({
      name: i.name || 'Item',
      quantity: Number(i.quantity) || 1,
      unit: i.unit || '',
      price: Number(i.price) || 0,
      subtotal: Number(i.subtotal) || (Number(i.price) || 0) * (Number(i.quantity) || 1),
    })),
    totalAmount: Number(o.totalAmount) || 0,
    fulfillmentType: o.fulfillmentType,
    orderStatus: o.orderStatus,
    paymentMethod: o.payment?.method || 'cod',
    paymentStatus: o.payment?.status || 'pending',
    delivery: o.delivery || {},
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}

