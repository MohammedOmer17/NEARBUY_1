const http = require('http');

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

const path = require('node:path');
process.loadEnvFile(path.join(__dirname, '../.env'));
const app = require('../app');
const connectToDb = require('../db/db');

let testServer = null;

async function run() {
  try {
    await request({ path: '/shops', method: 'GET' });
  } catch {
    await connectToDb();
    testServer = http.createServer(app);
    await new Promise(r => testServer.listen(3000, '127.0.0.1', r));
  }
  const jar = {}; // Global browser cookie jar

  console.log('=== TEST 1: Customer Authentication Persistence & Lifecycle ===');
  const timestamp = Date.now();
  const testCustomer = {
    name: `Persist Cust ${timestamp}`,
    email: `persist.cust.${timestamp}@test.com`,
    phone: `91${String(timestamp).slice(-8)}`,
    password: 'password123',
  };

  // Register & Login
  const regRes = await request({
    path: '/User/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, testCustomer);
  if (regRes.statusCode !== 201) throw new Error(`Customer register failed: ${regRes.statusCode}`);
  Object.assign(jar, extractCookieMap(regRes.cookies));

  if (!jar.customer_token && !jar.token) throw new Error('Customer cookies not set on register');
  const custToken = regRes.body?.token;
  if (!custToken) throw new Error('Customer token not returned in JSON body');
  console.log('✓ Customer registered and received token & cookies');

  // Verify reload via Cookie only (simulating browser page refresh)
  const reloadCustRes = await request({
    path: '/User/profile',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (reloadCustRes.statusCode !== 200 || reloadCustRes.body?.email !== testCustomer.email) {
    throw new Error(`Customer reload with cookie failed: ${reloadCustRes.statusCode}`);
  }
  console.log('✓ Customer session verified on page reload using cookie');

  // Verify reload via Bearer header only
  const bearerCustRes = await request({
    path: '/User/profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}`, 'x-role': 'customer' },
  });
  if (bearerCustRes.statusCode !== 200) throw new Error('Customer profile with Bearer header failed');
  console.log('✓ Customer session verified using Authorization Bearer header');

  // Verify navigation to protected customer endpoint (/cart)
  const cartRes = await request({
    path: '/cart',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (cartRes.statusCode !== 200) throw new Error(`Customer cart fetch failed: ${cartRes.statusCode}`);
  console.log('✓ Customer navigation to protected endpoint /cart succeeded');

  console.log('\n=== TEST 2: Shop Owner Authentication Persistence & Lifecycle ===');
  const ownerLoginRes = await request({
    path: '/shop-owner/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'murad.owner01@nearbuy.test', password: 'NearBuy@Demo2025!' });
  if (ownerLoginRes.statusCode !== 200) throw new Error(`Owner login failed: ${ownerLoginRes.statusCode}`);
  Object.assign(jar, extractCookieMap(ownerLoginRes.cookies));

  const ownerToken = ownerLoginRes.body?.token;
  if (!ownerToken) throw new Error('Owner token not returned in JSON body');
  if (!jar.owner_token) throw new Error('Owner cookie owner_token not set');
  console.log('✓ Shop Owner logged in and received token & cookies');

  // Verify Owner reload via Cookie only
  const reloadOwnerRes = await request({
    path: '/shop-owner/me',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (reloadOwnerRes.statusCode !== 200 || !reloadOwnerRes.body?.shopOwner) {
    throw new Error(`Owner reload failed: ${reloadOwnerRes.statusCode}`);
  }
  console.log('✓ Shop Owner session verified on page reload using cookie');

  // Verify Owner navigation to protected owner endpoint (/shop/orders)
  const ordersRes = await request({
    path: '/shop/orders',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (ordersRes.statusCode !== 200 || !Array.isArray(ordersRes.body?.orders)) {
    throw new Error(`Owner orders navigation failed: ${ordersRes.statusCode}`);
  }
  console.log('✓ Shop Owner navigation to protected endpoint /shop/orders succeeded');

  console.log('\n=== TEST 3: Captain Authentication Persistence & Lifecycle ===');
  const capLoginRes = await request({
    path: '/captain/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'captain.test@nearbuy.test', password: 'password123' });
  if (capLoginRes.statusCode !== 200) throw new Error(`Captain login failed: ${capLoginRes.statusCode}`);
  Object.assign(jar, extractCookieMap(capLoginRes.cookies));

  const capToken = capLoginRes.body?.token;
  if (!capToken) throw new Error('Captain token not returned in JSON body');
  if (!jar.captain_token) throw new Error('Captain cookie captain_token not set');
  console.log('✓ Captain logged in and received token & cookies');

  // Verify Captain reload via Cookie only
  const reloadCapRes = await request({
    path: '/captain/profile',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (reloadCapRes.statusCode !== 200 || !reloadCapRes.body?.captain) {
    throw new Error(`Captain reload failed: ${reloadCapRes.statusCode}`);
  }
  console.log('✓ Captain session verified on page reload using cookie');

  // Verify Captain navigation to protected endpoint (/captain/location)
  const locRes = await request({
    path: '/captain/location',
    method: 'GET',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (locRes.statusCode !== 200) throw new Error(`Captain location navigation failed: ${locRes.statusCode}`);
  console.log('✓ Captain navigation to protected endpoint /captain/location succeeded');

  console.log('\n=== TEST 4: Independent Role Preservation & Selective Logout ===');
  // All 3 cookies are currently in the jar. Verify each role is authed simultaneously:
  const checkCust1 = await request({ path: '/User/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  const checkOwner1 = await request({ path: '/shop-owner/me', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  const checkCap1 = await request({ path: '/captain/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });

  if (checkCust1.statusCode !== 200 || checkOwner1.statusCode !== 200 || checkCap1.statusCode !== 200) {
    throw new Error('Concurrent multi-role authentication failed');
  }
  console.log('✓ All 3 roles are independently authenticated and coexisting in the same session');

  // Logout Customer only
  console.log('\nLogging out Customer...');
  const custLogoutRes = await request({
    path: '/User/logout',
    method: 'POST',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (custLogoutRes.statusCode !== 200) throw new Error('Customer logout failed');
  delete jar.customer_token;

  // Verify Customer is logged out (401)
  const checkCust2 = await request({ path: '/User/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  if (checkCust2.statusCode !== 401) throw new Error(`Customer should be 401 after logout, got ${checkCust2.statusCode}`);
  console.log('✓ Customer is now logged out (401 Unauthorized)');

  // Verify Owner & Captain are STILL authenticated!
  const checkOwner2 = await request({ path: '/shop-owner/me', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  const checkCap2 = await request({ path: '/captain/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  if (checkOwner2.statusCode !== 200) throw new Error('Shop Owner was improperly affected by Customer logout');
  if (checkCap2.statusCode !== 200) throw new Error('Captain was improperly affected by Customer logout');
  console.log('✓ Shop Owner and Captain remain authenticated after Customer logout');

  // Logout Owner only
  console.log('\nLogging out Shop Owner...');
  const ownerLogoutRes = await request({
    path: '/shop-owner/logout',
    method: 'POST',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (ownerLogoutRes.statusCode !== 200) throw new Error('Owner logout failed');
  delete jar.owner_token;

  // Verify Owner is logged out (401)
  const checkOwner3 = await request({ path: '/shop-owner/me', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  if (checkOwner3.statusCode !== 401) throw new Error(`Owner should be 401 after logout, got ${checkOwner3.statusCode}`);
  console.log('✓ Shop Owner is now logged out (401 Unauthorized)');

  // Verify Captain is STILL authenticated!
  const checkCap3 = await request({ path: '/captain/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  if (checkCap3.statusCode !== 200) throw new Error('Captain was improperly affected by Owner logout');
  console.log('✓ Captain remains authenticated after Owner logout');

  // Logout Captain
  console.log('\nLogging out Captain...');
  const capLogoutRes = await request({
    path: '/captain/logout',
    method: 'POST',
    headers: { 'Cookie': serializeCookieMap(jar) },
  });
  if (capLogoutRes.statusCode !== 200) throw new Error('Captain logout failed');
  delete jar.captain_token;

  // Verify Captain is logged out (401)
  const checkCap4 = await request({ path: '/captain/profile', method: 'GET', headers: { 'Cookie': serializeCookieMap(jar) } });
  if (checkCap4.statusCode !== 401) throw new Error(`Captain should be 401 after logout, got ${checkCap4.statusCode}`);
  console.log('✓ Captain is now logged out (401 Unauthorized)');

  console.log('\n======================================================');
  console.log('ALL AUTH PERSISTENCE, RELOAD & MULTI-ROLE TESTS PASSED');
  console.log('======================================================');
  if (testServer) await new Promise(r => testServer.close(r));
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
