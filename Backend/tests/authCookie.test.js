const http = require('http');
const path = require('node:path');
process.loadEnvFile(path.join(__dirname, '../.env'));
const app = require('../app');
const connectToDb = require('../db/db');
const mongoose = require('mongoose');

async function request(server, options, body) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      ...options,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data ? JSON.parse(data) : null,
      }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  await connectToDb();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    phone: `99${String(timestamp).slice(-8)}`,
    password: 'password123',
  };

  console.log('1. Registering new customer...');
  const regRes = await request(server, {
    path: '/User/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, testUser);

  console.log('Register status:', regRes.statusCode);
  const regCookie = regRes.headers['set-cookie'];
  console.log('Register Set-Cookie header present:', !!regCookie);
  if (!regCookie || !regCookie[0].includes('token=')) {
    throw new Error('Register did not set token cookie!');
  }

  const cookieVal = regCookie[0].split(';')[0];

  console.log('\n2. Fetching profile using only the cookie (no Bearer header)...');
  const profileRes = await request(server, {
    path: '/User/profile',
    method: 'GET',
    headers: { 'Cookie': cookieVal },
  });
  console.log('Profile status:', profileRes.statusCode);
  console.log('Customer name in profile:', profileRes.body?.name);
  if (profileRes.statusCode !== 200 || profileRes.body?.email !== testUser.email) {
    throw new Error('Profile request with cookie failed!');
  }

  console.log('\n3. Logging out customer...');
  const logoutRes = await request(server, {
    path: '/User/logout',
    method: 'POST',
    headers: { 'Cookie': cookieVal },
  });
  console.log('Logout status:', logoutRes.statusCode);
  const logoutCookie = logoutRes.headers['set-cookie'];
  console.log('Logout Set-Cookie header clears token:', !!logoutCookie && logoutCookie[0].includes('token=;'));

  console.log('\n4. Verifying token is rejected after logout...');
  const revokedProfileRes = await request(server, {
    path: '/User/profile',
    method: 'GET',
    headers: { 'Cookie': cookieVal },
  });
  console.log('Revoked profile status:', revokedProfileRes.statusCode);
  if (revokedProfileRes.statusCode !== 401) {
    throw new Error('Blacklisted token was not rejected!');
  }

  console.log('\nALL CUSTOMER AUTH AND COOKIE TESTS PASSED SUCCESSFULLY!');
  server.close();
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
