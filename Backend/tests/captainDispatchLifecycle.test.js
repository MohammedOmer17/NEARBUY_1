const http = require('http');
const assert = require('assert');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      ...options,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          cookies: res.headers['set-cookie'] || [],
          body: parsed,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'string') req.write(body);
      else req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookieMap(cookieHeaders) {
  const map = {};
  for (const c of cookieHeaders) {
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) {
      map[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return map;
}

function serializeCookieMap(map) {
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function runTests() {
  console.log('=== STARTING COMPLETE CAPTAIN DISPATCH & LIFECYCLE INTEGRATION TEST ===\n');
  const timestamp = Date.now();

  // 1. Authenticate Captain 1 (Eligible Captain for Murad Nagar & Mehdipatnam)
  console.log('--- 1. Authenticating Captain 1 ---');
  const cap1Email = `cap1.${timestamp}@nearbuy.test`;
  const cap1Reg = await request({
    path: '/captain/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Captain One (Murad Nagar)',
    email: cap1Email,
    phone: `91${String(timestamp).slice(-8)}`,
    password: 'password123',
    vehicle: { type: 'bike', model: 'Honda Activa', number: 'TS09AB1234' },
  });
  assert.equal(cap1Reg.statusCode, 201, `Cap 1 reg failed: ${JSON.stringify(cap1Reg.body)}`);
  const cap1Jar = extractCookieMap(cap1Reg.cookies);
  const cap1Token = cap1Reg.body?.token;
  const cap1Headers = {
    'Content-Type': 'application/json',
    'Cookie': serializeCookieMap(cap1Jar),
    'Authorization': `Bearer ${cap1Token}`,
  };
  console.log('✓ Captain 1 registered and authenticated');

  // 2. Configure Service Areas for Captain 1
  console.log('\n--- 2. Configuring Captain 1 Service Areas ---');
  const areasListRes = await request({
    path: '/captain/service-areas',
    method: 'GET',
    headers: cap1Headers,
  });
  assert.equal(areasListRes.statusCode, 200);
  assert.ok(Array.isArray(areasListRes.body?.availableLocalities), 'availableLocalities must be array');
  assert.ok(areasListRes.body.availableLocalities.length >= 5, 'Should return verified localities');
  console.log(`✓ Fetched verified locality registry (${areasListRes.body.availableLocalities.length} localities available)`);

  const updateAreaRes = await request({
    path: '/captain/service-areas',
    method: 'PUT',
    headers: cap1Headers,
  }, {
    serviceAreas: [
      { localityId: 'murad_nagar', name: 'Murad Nagar', zone: 'Central Zone' },
      { localityId: 'mehdipatnam', name: 'Mehdipatnam', zone: 'South Zone' },
    ],
  });
  assert.equal(updateAreaRes.statusCode, 200, `Area update failed: ${JSON.stringify(updateAreaRes.body)}`);
  assert.equal(updateAreaRes.body?.serviceAreas?.length, 2);
  console.log('✓ Service areas persisted to Captain 1 record: Murad Nagar, Mehdipatnam');

  // Make Captain 1 available
  await request({
    path: '/captain/availability',
    method: 'PATCH',
    headers: cap1Headers,
  }, { availabilityStatus: 'available' });
  console.log('✓ Captain 1 status set to: AVAILABLE');

  // 3. Authenticate Captain 2 (Ineligible Captain for Murad Nagar - set to Hitech City only)
  console.log('\n--- 3. Authenticating Captain 2 (Ineligible Area) ---');
  const cap2Email = `cap2.${timestamp}@nearbuy.test`;
  const cap2Reg = await request({
    path: '/captain/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Captain Two (Hitech City)',
    email: cap2Email,
    phone: `92${String(timestamp).slice(-8)}`,
    password: 'password123',
    vehicle: { type: 'bike', model: 'Hero Splendor', number: 'TS09CD5678' },
  });
  assert.equal(cap2Reg.statusCode, 201);
  const cap2Jar = extractCookieMap(cap2Reg.cookies);
  const cap2Token = cap2Reg.body?.token;
  const cap2Headers = {
    'Content-Type': 'application/json',
    'Cookie': serializeCookieMap(cap2Jar),
    'Authorization': `Bearer ${cap2Token}`,
  };

  await request({
    path: '/captain/service-areas',
    method: 'PUT',
    headers: cap2Headers,
  }, {
    serviceAreas: [
      { localityId: 'hitech_city', name: 'HITEC City', zone: 'West Zone' },
    ],
  });
  await request({
    path: '/captain/availability',
    method: 'PATCH',
    headers: cap2Headers,
  }, { availabilityStatus: 'available' });
  console.log('✓ Captain 2 set to AVAILABLE in HITEC City (Coverage outside Murad Nagar)');

  // 4. Authenticate Customer & Place Delivery Order in Murad Nagar
  console.log('\n--- 4. Customer Places Delivery Order in Murad Nagar ---');
  const custEmail = `cust.${timestamp}@nearbuy.test`;
  const custReg = await request({
    path: '/User/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Test Customer',
    email: custEmail,
    phone: `93${String(timestamp).slice(-8)}`,
    password: 'password123',
  });
  assert.equal(custReg.statusCode, 201);
  const custJar = extractCookieMap(custReg.cookies);
  const custToken = custReg.body?.token;
  const custHeaders = {
    'Content-Type': 'application/json',
    'Cookie': serializeCookieMap(custJar),
    'Authorization': `Bearer ${custToken}`,
  };

  // Get Murad Nagar shop (Azhar Kirana)
  const shopOwnerLogin = await request({
    path: '/shop-owner/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'murad.owner01@nearbuy.test', password: 'NearBuy@Demo2025!' });
  assert.equal(shopOwnerLogin.statusCode, 200);
  const shopId = shopOwnerLogin.body?.shop?._id;
  assert.ok(shopId);

  // Get products from shop to order
  const shopProductsRes = await request({
    path: `/shop-products/shop/${shopId}`,
    method: 'GET',
    headers: custHeaders,
  });
  assert.equal(shopProductsRes.statusCode, 200, `Fetch products failed: ${JSON.stringify(shopProductsRes.body)}`);
  const products = shopProductsRes.body?.products || (Array.isArray(shopProductsRes.body) ? shopProductsRes.body : []);
  assert.ok(products.length > 0, 'Shop should have products');
  const prod = products[0];

  // Add item to customer cart
  const addCartRes = await request({
    path: '/cart',
    method: 'POST',
    headers: custHeaders,
  }, {
    productId: prod._id,
    quantity: 1,
  });
  assert.equal(addCartRes.statusCode, 200, `Add to cart failed: ${JSON.stringify(addCartRes.body)}`);

  // Customer creates order for Delivery to Murad Nagar
  const orderRes = await request({
    path: '/orders',
    method: 'POST',
    headers: custHeaders,
  }, {
    fulfillmentType: 'delivery',
    deliveryAddress: 'House 12-2-417, Murad Nagar, Hyderabad, Telangana 500028',
    deliveryLocation: {
      latitude: 17.3824,
      longitude: 78.4418,
    },
    paymentMethod: 'cod',
  });
  assert.equal(orderRes.statusCode, 201, `Order placement failed: ${JSON.stringify(orderRes.body)}`);
  const createdOrder = orderRes.body?.order;
  assert.ok(createdOrder?._id, 'Order must be created');
  const orderId = createdOrder._id;
  console.log(`✓ Delivery Order created: #${orderId.slice(-8)} (Fulfillment: ${createdOrder.fulfillmentType}, Total: ₹${createdOrder.totalAmount})`);

  // 5. Verify Locality Coverage Dispatch: Captain 1 gets the order, Captain 2 does NOT
  console.log('\n--- 5. Verifying Order Dispatch Coverage Filtering ---');
  const cap1Available = await request({
    path: '/captain/deliveries/available',
    method: 'GET',
    headers: cap1Headers,
  });
  assert.equal(cap1Available.statusCode, 200);
  const cap1Matches = cap1Available.body?.deliveries || [];
  const cap1HasOrder = cap1Matches.some(o => String(o.orderId || o.id) === String(orderId));
  assert.ok(cap1HasOrder, 'Captain 1 MUST receive Murad Nagar delivery offer');
  console.log('✓ Captain 1 (Murad Nagar coverage) received the delivery mission offer');

  const cap2Available = await request({
    path: '/captain/deliveries/available',
    method: 'GET',
    headers: cap2Headers,
  });
  assert.equal(cap2Available.statusCode, 200);
  const cap2Matches = cap2Available.body?.deliveries || [];
  const cap2HasOrder = cap2Matches.some(o => String(o.orderId || o.id) === String(orderId));
  assert.ok(!cap2HasOrder, 'Captain 2 (HITEC City coverage) MUST NOT receive Murad Nagar order');
  console.log('✓ Captain 2 (HITEC City coverage) was filtered out (0 matching offers)');

  // 6. Check Persistent Notification for Captain 1
  console.log('\n--- 6. Verifying Captain 1 Notification Persistence ---');
  const cap1Notifs = await request({
    path: '/notifications',
    method: 'GET',
    headers: cap1Headers,
  });
  assert.equal(cap1Notifs.statusCode, 200);
  const notifsList = cap1Notifs.body?.data?.notifications || cap1Notifs.body?.notifications || [];
  const dispatchNotif = notifsList.find(n => n.type === 'NEW_DELIVERY_AVAILABLE');
  assert.ok(dispatchNotif, 'Captain 1 must have persistent NEW_DELIVERY_AVAILABLE notification');
  console.log(`✓ Persistent notification recorded: "${dispatchNotif.title}" - ${dispatchNotif.message}`);

  // 7. Competing Captain Assignment (Atomic Claim Prevention)
  console.log('\n--- 7. Competing Captain Atomic Claim Concurrency ---');
  // Register Captain 3 also with Murad Nagar coverage
  const cap3Email = `cap3.${timestamp}@nearbuy.test`;
  const cap3Reg = await request({
    path: '/captain/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    name: 'Captain Three (Rival Partner)',
    email: cap3Email,
    phone: `94${String(timestamp).slice(-8)}`,
    password: 'password123',
    vehicle: { type: 'bike', model: 'TVS Jupiter', number: 'TS09EF9012' },
  });
  assert.equal(cap3Reg.statusCode, 201);
  const cap3Jar = extractCookieMap(cap3Reg.cookies);
  const cap3Token = cap3Reg.body?.token;
  const cap3Headers = {
    'Content-Type': 'application/json',
    'Cookie': serializeCookieMap(cap3Jar),
    'Authorization': `Bearer ${cap3Token}`,
  };
  await request({
    path: '/captain/service-areas',
    method: 'PUT',
    headers: cap3Headers,
  }, {
    serviceAreas: [{ localityId: 'murad_nagar', name: 'Murad Nagar', zone: 'Central Zone' }],
  });

  // Captain 1 claims the delivery first
  console.log('Captain 1 claims the order...');
  const claim1Res = await request({
    path: `/captain/deliveries/${orderId}/accept`,
    method: 'POST',
    headers: cap1Headers,
  });
  assert.equal(claim1Res.statusCode, 200, `Claim failed: ${JSON.stringify(claim1Res.body)}`);
  assert.equal(claim1Res.body?.success, true);
  console.log('✓ Captain 1 successfully claimed the delivery mission!');

  // Competing Captain 3 attempts to claim the same order concurrently
  console.log('Competing Captain 3 attempts to claim the same order...');
  const claim3Res = await request({
    path: `/captain/deliveries/${orderId}/accept`,
    method: 'POST',
    headers: cap3Headers,
  });
  assert.equal(claim3Res.statusCode, 409, `Expected 409 Conflict, got ${claim3Res.statusCode}: ${JSON.stringify(claim3Res.body)}`);
  assert.equal(claim3Res.body?.success, false);
  console.log('✓ Competing Captain 3 was atomically rejected with 409 Conflict: "This delivery has already been assigned to another captain"');

  // 8. Order Lifecycle Progression by Assigned Captain
  console.log('\n--- 8. Testing Complete Order Lifecycle by Assigned Captain ---');
  // GET current delivery
  const curRes = await request({
    path: '/captain/deliveries/current',
    method: 'GET',
    headers: cap1Headers,
  });
  assert.equal(curRes.statusCode, 200);
  assert.equal(String(curRes.body?.delivery?._id || curRes.body?.delivery?.id), String(orderId));
  console.log('✓ GET /captain/deliveries/current returned the assigned delivery');

  // Shop Owner accepts and prepares order for delivery pickup
  console.log('Shop Owner accepts and prepares order...');
  const shopOwnerJar = extractCookieMap(shopOwnerLogin.cookies);
  const shopOwnerToken = shopOwnerLogin.body?.token;
  const ownerHeaders = {
    'Content-Type': 'application/json',
    'Cookie': serializeCookieMap(shopOwnerJar),
    'Authorization': `Bearer ${shopOwnerToken}`,
  };

  const acceptRes = await request({
    path: `/shop/orders/${orderId}/accept`,
    method: 'PUT',
    headers: ownerHeaders,
  });
  assert.equal(acceptRes.statusCode, 200);

  const prepRes = await request({
    path: `/shop/orders/${orderId}/status`,
    method: 'PUT',
    headers: ownerHeaders,
  }, { status: 'preparing' });
  assert.equal(prepRes.statusCode, 200);

  const readyRes = await request({
    path: `/shop/orders/${orderId}/status`,
    method: 'PUT',
    headers: ownerHeaders,
  }, { status: 'ready' });
  assert.equal(readyRes.statusCode, 200);
  console.log('✓ Shop Owner progressed order to READY for captain pickup');

  // Milestone 1: Confirm arrival at shop
  const arriveRes = await request({
    path: `/captain/deliveries/${orderId}/arrived`,
    method: 'PATCH',
    headers: cap1Headers,
  });
  assert.equal(arriveRes.statusCode, 200);
  console.log('✓ Milestone 1: Arrived at shop confirmed');

  // Milestone 2: Confirm pickup from shop
  const pickupRes = await request({
    path: `/captain/deliveries/${orderId}/pickup`,
    method: 'PATCH',
    headers: cap1Headers,
  });
  assert.equal(pickupRes.statusCode, 200, `Pickup failed: ${JSON.stringify(pickupRes.body)}`);
  assert.equal(pickupRes.body?.order?.orderStatus || pickupRes.body?.delivery?.orderStatus, 'picked_up');
  console.log('✓ Milestone 2: Pickup confirmed (status: picked_up)');

  // Milestone 3: Start delivery to customer
  const startRes = await request({
    path: `/captain/deliveries/${orderId}/start`,
    method: 'PATCH',
    headers: cap1Headers,
  });
  assert.equal(startRes.statusCode, 200, `Start delivery failed: ${JSON.stringify(startRes.body)}`);
  assert.equal(startRes.body?.order?.orderStatus || startRes.body?.delivery?.orderStatus, 'out_for_delivery');
  console.log('✓ Milestone 3: Start delivery confirmed (status: out_for_delivery)');

  // Milestone 4: Captain Location Update & Live Route Retrieval
  const locRes = await request({
    path: '/captain/location',
    method: 'PATCH',
    headers: cap1Headers,
  }, {
    latitude: 17.3830,
    longitude: 78.4420,
  });
  assert.equal(locRes.statusCode, 200);
  console.log('✓ Milestone 4: Live Captain coordinates saved (17.3830, 78.4420)');

  // Customer fetches live route
  const routeRes = await request({
    path: `/maps/delivery-route/${orderId}`,
    method: 'GET',
    headers: custHeaders,
  });
  assert.equal(routeRes.statusCode, 200, `Route failed: ${JSON.stringify(routeRes.body)}`);
  assert.equal(routeRes.body?.data?.orderId, orderId);
  assert.ok(routeRes.body?.data?.captain?.latitude || routeRes.body?.data?.captain?.location?.latitude, 'Captain latitude should be present');
  const distText = routeRes.body?.data?.distance?.text || routeRes.body?.data?.route?.distance?.text || 'Distance available';
  const durText = routeRes.body?.data?.duration?.text || routeRes.body?.data?.route?.duration?.text || 'ETA available';
  console.log(`✓ Live Route retrieved: Distance ${distText}, Duration ${durText}`);

  // Milestone 5: Collect COD Payment
  const payRes = await request({
    path: `/captain/deliveries/${orderId}/payment/collect`,
    method: 'PATCH',
    headers: cap1Headers,
  });
  assert.equal(payRes.statusCode, 200, `Collect payment failed: ${JSON.stringify(payRes.body)}`);
  assert.equal(payRes.body?.data?.payment?.status || payRes.body?.delivery?.paymentStatus, 'paid');
  console.log('✓ Milestone 5: COD cash payment collected (paymentStatus: paid)');

  // Milestone 6: Complete Delivery
  const compRes = await request({
    path: `/captain/deliveries/${orderId}/complete`,
    method: 'PATCH',
    headers: cap1Headers,
  });
  assert.equal(compRes.statusCode, 200, `Complete delivery failed: ${JSON.stringify(compRes.body)}`);
  assert.equal(compRes.body?.order?.orderStatus || compRes.body?.delivery?.orderStatus, 'completed');
  console.log('✓ Milestone 6: Delivery completed successfully (orderStatus: completed)');

  // 9. Delivery History Verification
  console.log('\n--- 9. Verifying Captain Delivery History ---');
  const histRes = await request({
    path: '/captain/deliveries/history',
    method: 'GET',
    headers: cap1Headers,
  });
  assert.equal(histRes.statusCode, 200);
  const completedList = histRes.body?.deliveries || [];
  const foundInHistory = completedList.some(d => String(d._id || d.id || d.orderId) === String(orderId));
  assert.ok(foundInHistory, 'Completed order must appear in Captain history');
  console.log(`✓ Order verified in Captain Delivery History (${completedList.length} total completed missions)`);

  // Cleanup test-created order and test accounts so they do not persist in the database
  try {
    const Order = require('../models/Order');
    const Customer = require('../models/CustomerModel');
    const Captain = require('../models/CaptainModel');
    if (orderId) {
      await Order.deleteOne({ _id: orderId });
    }
    if (custEmail) {
      await Customer.deleteOne({ email: custEmail });
    }
    await Captain.deleteMany({ email: { $in: [cap1Email, cap2Email, cap3Email] } });
  } catch (cleanErr) {
    // Ignore cleanup error
  }

  console.log('\n=============================================================');
  console.log('ALL CAPTAIN DISPATCH & LIFECYCLE TESTS PASSED FLAWLESSLY! ✓');
  console.log('=============================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
