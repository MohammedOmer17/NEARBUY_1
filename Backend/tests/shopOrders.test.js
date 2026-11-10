const http = require('http');
const assert = require('assert');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const path = require('node:path');
process.loadEnvFile(path.join(__dirname, '../.env'));
const app = require('../app');
const connectToDb = require('../db/db');

async function runTests() {
  console.log('--- Testing Shop Owner Order Management Flow ---');
  let testServer = null;
  try {
    await httpRequest({ hostname: 'localhost', port: 3000, path: '/shops', method: 'GET' });
  } catch {
    await connectToDb();
    testServer = http.createServer(app);
    await new Promise(r => testServer.listen(3000, 'localhost', r));
  }

  // 1. Log in as Azhar Kirana owner
  console.log('1. Logging in as shop owner (Azhar Kirana)...');
  const loginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/shop-owner/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'murad.owner01@nearbuy.test', password: 'NearBuy@Demo2025!' });

  assert.equal(loginRes.status, 200, `Login failed: ${JSON.stringify(loginRes.data)}`);
  const cookies = loginRes.headers['set-cookie'] || [];
  const token = loginRes.data?.token;
  console.log('✓ Shop owner authenticated. Shop name:', loginRes.data?.shop?.shopName);
  const shopId = loginRes.data?.shop?._id;
  assert.ok(shopId, 'Shop ID must be present');

  const authHeaders = {
    'Cookie': cookies.join('; '),
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  // 2. Fetch shop orders via GET /shop/orders
  console.log('2. Fetching orders via GET /shop/orders...');
  const ordersRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/shop/orders',
    method: 'GET',
    headers: authHeaders,
  });

  assert.equal(ordersRes.status, 200, `Expected 200, got ${ordersRes.status}: ${JSON.stringify(ordersRes.data)}`);
  assert.equal(ordersRes.data?.success, true);
  assert.ok(Array.isArray(ordersRes.data?.orders), 'Orders should be an array');
  assert.ok(ordersRes.data.orders.length >= 2, `Expected at least 2 orders, found ${ordersRes.data.orders.length}`);
  console.log(`✓ GET /shop/orders returned ${ordersRes.data.orders.length} orders successfully!`);

  const placedOrder = ordersRes.data.orders.find(o => o.orderStatus === 'placed');
  assert.ok(placedOrder, 'At least one order in placed status should exist');
  console.log(`✓ Placed order identified: #${placedOrder._id.slice(-8)} (Total: ₹${placedOrder.totalAmount}, Type: ${placedOrder.fulfillmentType})`);

  // 3. Test GET /shop/orders/:orderId
  console.log('3. Fetching single order details via GET /shop/orders/:orderId...');
  const singleOrderRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/shop/orders/${placedOrder._id}`,
    method: 'GET',
    headers: authHeaders,
  });

  assert.equal(singleOrderRes.status, 200);
  assert.equal(singleOrderRes.data?.order?._id, placedOrder._id);
  console.log('✓ GET /shop/orders/:orderId returned correct order details');

  // 4. Test Customer Shop Lookup route /shop/:shopId still works
  console.log('4. Verifying customer shop lookup /shop/:shopId does not conflict...');
  const shopLookupRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/shop/${shopId}`,
    method: 'GET',
  });
  assert.equal(shopLookupRes.status, 200, `Shop lookup failed: ${JSON.stringify(shopLookupRes.data)}`);
  assert.equal(shopLookupRes.data?.shop?._id, shopId);
  console.log('✓ Public /shop/:shopId works properly without route conflict');

  console.log('\n--- ALL SHOP OWNER ORDER MANAGEMENT TESTS PASSED! ---');
  if (testServer) await new Promise(r => testServer.close(r));
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
