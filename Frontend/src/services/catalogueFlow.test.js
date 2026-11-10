import assert from 'node:assert/strict'
import test from 'node:test'
import http from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BACKEND_URL = 'http://localhost:3000'

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL)
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          })
        } catch {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          })
        }
      })
    })
    req.on('error', reject)
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

test('End-to-End Shopping Flow: Home -> Product Details -> Compare Shop Offers -> Select Shop -> Selected Shop Catalogue with Prices -> Add to Cart', async () => {
  let serverInstance = null
  let mongoose = null
  try {
    try {
      await request('/shops')
    } catch {
      const backendEnv = path.resolve(__dirname, '../../../Backend/.env')
      process.loadEnvFile(backendEnv)
      const app = require('../../../Backend/app.js')
      const connectToDb = require('../../../Backend/db/db.js')
      mongoose = require('../../../Backend/node_modules/mongoose')
      await connectToDb()
      serverInstance = http.createServer(app)
      await new Promise((resolve) => serverInstance.listen(3000, 'localhost', resolve))
    }
  // 1. Fetch shops list and choose a shop with products
  const shopsRes = await request('/shops')
  assert.equal(shopsRes.statusCode, 200, 'Failed to fetch shops')
  const shops = shopsRes.body?.shops || []
  assert.ok(shops.length > 0, 'No shops found')
  
  // Find a shop that has catalogue products
  let testShop = null
  let initialProducts = []
  for (const s of shops) {
    const res = await request(`/shop-products/shop/${s._id}`)
    const prods = res.body?.products || []
    if (prods.length >= 10) {
      testShop = s
      initialProducts = prods
      break
    }
  }
  assert.ok(testShop, 'No shop found with at least 10 products')
  console.log(`[E2E] Step 1: Discovered active shop "${testShop.shopName}" (${testShop._id}) with ${initialProducts.length} products`)

  // 2. Select a staple test product that is available across multiple shops
  const firstProduct = initialProducts.find((p) => /Tata Salt|Sunflower Oil|Basmati Rice|Atta/i.test(p.name)) || initialProducts[0]
  console.log(`[E2E] Step 2: Selected test product "${firstProduct.name}" (ID: ${firstProduct._id})`)

  // 3. Multi-shop price comparison: GET /shop-products/:productId/offers
  const offersRes = await request(`/shop-products/${firstProduct._id}/offers?latitude=17.3824&longitude=78.4418`)
  assert.equal(offersRes.statusCode, 200, 'Offers endpoint returned non-200')
  const offers = offersRes.body?.offers || []
  assert.ok(offers.length >= 2, 'Expected multiple shop offers for comparison')
  console.log(`[E2E] Step 3: Comparison offers returned ${offers.length} shops for "${offersRes.body?.product?.name}"`)

  // Verify offers have distinct prices and lowest price badge candidate
  for (const offer of offers) {
    assert.ok(offer.price > 0, `Offer must have positive price: ${offer.price}`)
    assert.ok(offer.shop?.shopName, 'Offer must contain shop details')
    console.log(`       - ${offer.shop.shopName}: ₹${offer.price} (${offer.distanceKm} km away)`)
  }

  // 4. Customer chooses an offer (e.g. lowest price or specific shop)
  const selectedOffer = offers[0]
  const targetShopId = selectedOffer.shop._id
  console.log(`[E2E] Step 4: Customer selects offer from "${selectedOffer.shop.shopName}" (Shop ID: ${targetShopId}) at ₹${selectedOffer.price}`)

  // 5. Customer enters Selected Shop Catalogue: GET /shop-products/shop/:shopId
  const catalogueRes = await request(`/shop-products/shop/${targetShopId}`)
  assert.equal(catalogueRes.statusCode, 200, 'Catalogue endpoint returned non-200')
  const catalogueProducts = catalogueRes.body?.products || []
  assert.ok(catalogueProducts.length > 0, 'Shop catalogue must not be empty')
  console.log(`[E2E] Step 5: Loaded catalogue for shop: found ${catalogueProducts.length} products`)

  // REQUIREMENT 1 & 2 VERIFICATION:
  // Every product in selected shop catalogue must display its actual shop price, name, image, unit/pack
  let verifiedCount = 0
  for (const prod of catalogueProducts) {
    assert.ok(prod.name && prod.name.trim().length > 0, 'Product name is required')
    assert.ok(typeof prod.price === 'number' && prod.price > 0, `Product "${prod.name}" price must be a valid positive number, got: ${prod.price}`)
    assert.ok(prod.unit && prod.unit.trim().length > 0, `Product "${prod.name}" unit is required, got: ${prod.unit}`)
    assert.equal(String(prod.shop?._id || prod.shop), String(targetShopId), 'Product must belong to the selected shop')
    verifiedCount++
  }
  console.log(`[E2E] ✓ Verified all ${verifiedCount} products in the selected shop catalogue display actual prices (no hardcoded/zero prices)!`)

  // 6. Test User Authentication and Adding to Cart
  const ts = Date.now()
  const testCustomer = {
    name: `E2E Customer ${ts}`,
    email: `e2ecustomer${ts}@test.com`,
    phone: `91${String(ts).slice(-8)}`,
    password: 'Password123!',
  }

  const regRes = await request('/User/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, testCustomer)
  assert.equal(regRes.statusCode, 201, 'Customer registration failed')

  const cookie = regRes.headers['set-cookie']?.[0]?.split(';')?.[0]
  assert.ok(cookie, 'Missing authentication cookie from registration')

  // Add the chosen product to cart:
  const addToCartRes = await request('/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
  }, {
    productId: selectedOffer._id,
    quantity: 1,
  })
  assert.equal(addToCartRes.statusCode, 200, 'Failed to add selected offer to cart')
  console.log(`[E2E] Step 6: Successfully added "${selectedOffer.name}" to cart (Status: ${addToCartRes.statusCode})`)

  // 7. Verify Cart state
  const cartRes = await request('/cart', {
    method: 'GET',
    headers: { 'Cookie': cookie },
  })
  assert.equal(cartRes.statusCode, 200)
  const cart = cartRes.body?.cart
  assert.ok(cart, 'Cart should exist')
  assert.equal(String(cart.shop?._id || cart.shop), String(targetShopId), 'Cart shop must match selected shop')
  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].price, selectedOffer.price, 'Cart item price must match selected shop product price')
  console.log(`[E2E] Step 7: Cart verified - Shop: "${cart.shop?.shopName || 'Shop'}", Item: "${cart.items[0].name}", Price: ₹${cart.items[0].price}`)

  // 8. Add a second product from the same shop catalogue
  const secondProduct = catalogueProducts.find((p) => String(p._id) !== String(selectedOffer._id) && p.isAvailable && p.quantity > 0)
  assert.ok(secondProduct, 'Need second in-stock product')

  const addSecondRes = await request('/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
  }, {
    productId: secondProduct._id,
    quantity: 2,
  })
  assert.equal(addSecondRes.statusCode, 200)

  // Verify updated cart
  const cartRes2 = await request('/cart', {
    method: 'GET',
    headers: { 'Cookie': cookie },
  })
  const cart2 = cartRes2.body?.cart
  assert.equal(cart2.items.length, 2, 'Cart should have 2 items from same shop')
  const expectedTotal = selectedOffer.price * 1 + secondProduct.price * 2
  const actualTotal = cart2.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  assert.equal(actualTotal, expectedTotal, `Cart total mismatch: expected ₹${expectedTotal}, got ₹${actualTotal}`)
  console.log(`[E2E] Step 8: Successfully added second item "${secondProduct.name}" (qty: 2 @ ₹${secondProduct.price}). Cart Total: ₹${actualTotal}`)

  // 9. Single-Shop Isolation Rule: Attempt adding product from another shop without clearing
  const otherShop = shops.find((s) => String(s._id) !== String(targetShopId))
  if (otherShop) {
    const otherShopProdRes = await request(`/shop-products/shop/${otherShop._id}`)
    const otherProd = otherShopProdRes.body?.products?.[0]
    if (otherProd) {
      const conflictRes = await request('/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
      }, {
        productId: otherProd._id,
        quantity: 1,
      })
      assert.equal(conflictRes.statusCode, 400, 'Adding item from different shop must be rejected with 400')
      console.log(`[E2E] Step 9: One-shop-per-cart isolation rule enforced (Rejection message: "${conflictRes.body?.message}")`)
    }
  }

  console.log('[E2E] ✓ COMPLETE SHOPPING FLOW VERIFIED SUCCESSFULLY!')
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve))
    }
    if (mongoose) {
      await mongoose.disconnect()
    }
  }
})
