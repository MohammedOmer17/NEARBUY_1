const assert = require("assert");
const http = require("http");

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const path = require('node:path');
process.loadEnvFile(path.join(__dirname, '../.env'));
const app = require('../app');
const connectToDb = require('../db/db');

let testServer = null;

async function runTests() {
  console.log("=== STARTING SHARED PRODUCT CATALOGUE & AUTOCOMPLETE TESTS ===");
  try {
    await httpRequest({ hostname: "localhost", port: 3000, path: "/shops", method: "GET" });
  } catch {
    await connectToDb();
    testServer = http.createServer(app);
    await new Promise(r => testServer.listen(3000, "localhost", r));
  }

  // --------------------------------------------------------------------------
  // TEST 1: Live Autocomplete Suggestions API
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 1: Autocomplete Suggestions Query ---");

  // 1a: Minimum 2-character requirement
  const shortRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: "/shop-products/suggestions?q=t",
    method: "GET",
  });
  assert.equal(shortRes.status, 200);
  assert.deepEqual(shortRes.data.suggestions, [], "Query shorter than 2 chars should return empty array");
  console.log("✓ Enforces minimum 2-character query requirement (returns empty array)");

  // 1b: Prefix matching for "Tata"
  const prefixRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: "/shop-products/suggestions?q=tata",
    method: "GET",
  });
  assert.equal(prefixRes.status, 200);
  assert.ok(Array.isArray(prefixRes.data.suggestions), "Suggestions must be an array");
  assert.ok(prefixRes.data.suggestions.length > 0, "Should find matching Tata products");
  const tataProduct = prefixRes.data.suggestions.find((p) => /tata/i.test(p.name) || /tata/i.test(p.brand));
  assert.ok(tataProduct, "Suggestions must include Tata branded item");
  assert.ok(tataProduct.canonicalProductId, "Suggestion must have canonicalProductId");
  assert.ok(tataProduct.unit, "Suggestion must have standardized unit");
  console.log(`✓ Prefix search for "tata" found ${prefixRes.data.suggestions.length} items. Top: "${tataProduct.name}" (${tataProduct.unit})`);

  // 1c: Capitalization and whitespace tolerance: "  EGGS  "
  const caseRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: "/shop-products/suggestions?q=%20%20EGGS%20%20",
    method: "GET",
  });
  assert.equal(caseRes.status, 200);
  assert.ok(caseRes.data.suggestions.length > 0, "Case and whitespace variations must resolve canonical product");
  const eggProduct = caseRes.data.suggestions.find((p) => /egg/i.test(p.name));
  assert.ok(eggProduct, "Eggs item found for query '  EGGS  '");
  console.log(`✓ Capitalization & whitespace tolerance: "  EGGS  " matched "${eggProduct.name}"`);

  // 1d: Fuzzy spelling tolerance: "frotune" -> "Fortune"
  const fuzzyRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: "/shop-products/suggestions?q=frotune",
    method: "GET",
  });
  assert.equal(fuzzyRes.status, 200);
  assert.ok(fuzzyRes.data.suggestions.length > 0, "Fuzzy spelling should return matches");
  const fortuneMatch = fuzzyRes.data.suggestions.find((p) => /fortune/i.test(p.name) || /fortune/i.test(p.brand));
  assert.ok(fortuneMatch, 'Fuzzy spelling "frotune" matched Fortune product');
  console.log(`✓ Fuzzy spelling tolerance: "frotune" correctly suggested "${fortuneMatch.name}"`);

  // --------------------------------------------------------------------------
  // TEST 2: Shop Owner - Linking Existing Canonical Product
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 2: Shop Owner Product Creation Flow ---");

  // Authenticate as Murad Owner 01 (Azhar Kirana)
  const loginRes = await httpRequest(
    {
      hostname: "localhost",
      port: 3000,
      path: "/shop-owner/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "murad.owner01@nearbuy.test", password: "NearBuy@Demo2025!" }
  );
  assert.equal(loginRes.status, 200, "Shop Owner login should succeed");
  const ownerToken = loginRes.data.token;
  const ownerShopId = loginRes.data.shop._id;
  const ownerCookie = loginRes.headers["set-cookie"] ? loginRes.headers["set-cookie"][0].split(";")[0] : "";

  // 2a: Test intra-shop duplicate detection
  // Azhar Kirana already sells "Tata Salt Vacuum Evaporated Iodised Salt (1kg)"
  const dupAttempt = await httpRequest(
    {
      hostname: "localhost",
      port: 3000,
      path: "/shop-products",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
        Cookie: ownerCookie,
      },
    },
    {
      name: "Tata Salt Vacuum Evaporated Iodised Salt (1kg)",
      category: "Spices & Masalas",
      price: 28,
      unit: "1 kg",
      quantity: 50,
      canonicalProductId: tataProduct.canonicalProductId,
    }
  );
  assert.equal(dupAttempt.status, 409, "Adding duplicate product to same shop must return 409 Conflict");
  console.log("✓ Intra-shop duplicate protection prevents multiple listings for the same item in one shop");

  // --------------------------------------------------------------------------
  // TEST 3: Shop Owner - Creating Genuinely New Product
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 3: Genuinely New Shared Product Creation ---");

  const timestamp = Date.now();
  const newProductName = `Organic Forest Honey Batch ${timestamp}`;
  const createNewRes = await httpRequest(
    {
      hostname: "localhost",
      port: 3000,
      path: "/shop-products",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
        Cookie: ownerCookie,
      },
    },
    {
      name: newProductName,
      category: "Grocery & Kirana",
      brand: "Himalayan Organics",
      price: 349,
      unit: "500 g",
      packSize: "500g Jar",
      quantity: 25,
      description: "Raw wild unprocessed organic honey from high-altitude flora.",
    }
  );

  assert.equal(createNewRes.status, 201, `New product creation must return 201: ${JSON.stringify(createNewRes.data)}`);
  const createdShopProduct = createNewRes.data.product;
  assert.ok(createdShopProduct._id, "Created shop product must have _id");
  assert.ok(createdShopProduct.canonicalProduct, "Created shop product must link to canonical product");
  console.log(`✓ Genuinely new product "${createdShopProduct.name}" created and linked to canonical ID: ${createdShopProduct.canonicalProduct._id || createdShopProduct.canonicalProduct}`);

  // --------------------------------------------------------------------------
  // TEST 4: Immediate Availability in Suggestions for Other Shops
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 4: Immediate Availability in Autocomplete Suggestions ---");

  const instantSuggestRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: `/shop-products/suggestions?q=Forest%20Honey`,
    method: "GET",
  });
  assert.equal(instantSuggestRes.status, 200);
  const foundInstant = instantSuggestRes.data.suggestions.find((p) => p.name.includes(newProductName));
  assert.ok(foundInstant, "Newly created canonical product must be immediately searchable across all shops");
  console.log(`✓ Newly created product immediately searchable: found "${foundInstant.name}" with brand "${foundInstant.brand}"`);

  // --------------------------------------------------------------------------
  // TEST 5: Customer Discovery & Multi-Shop Offers Comparison
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 5: Customer Multi-Shop Offers Flow ---");

  // Murad Nagar coordinates for distance calculation
  const customerLat = 17.3824;
  const customerLng = 78.4418;

  const offersRes = await httpRequest({
    hostname: "localhost",
    port: 3000,
    path: `/shop-products/${createdShopProduct._id}/offers?latitude=${customerLat}&longitude=${customerLng}`,
    method: "GET",
  });

  assert.equal(offersRes.status, 200, "Fetch offers should return 200");
  assert.ok(offersRes.data.offers.length >= 1, "Must return at least 1 offer for the product");
  const offer = offersRes.data.offers[0];
  assert.equal(offer.price, 349, "Offer must display shop's actual price (₹349)");
  assert.ok(offer.unit === "g" || offer.unit === "500 g", "Offer must display product package unit");
  assert.ok(offer.packSize, "Offer must display pack size");
  assert.ok(offer.shop.shopName, "Offer must display shop name");
  assert.ok(offer.isAvailable, "Offer must reflect inventory availability");
  console.log(`✓ Customer offers verified: "${offersRes.data.product.name}" offered by ${offer.shop.shopName} at ₹${offer.price} (${offer.unit})`);

  console.log("\n============================================================");
  console.log("ALL SHARED PRODUCT CATALOGUE & AUTOCOMPLETE TESTS PASSED!");
  console.log("============================================================");
}

runTests()
  .then(async () => {
    if (testServer) await new Promise(r => testServer.close(r));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
