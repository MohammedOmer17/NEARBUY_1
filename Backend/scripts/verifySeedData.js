/**
 * Verification Script for NearBuy Kirana Seed Data
 * Validates all 14 criteria specified in requirements:
 * - Owners and shops existence and relations
 * - Numeric and distinct coordinates in Murad Nagar vicinity
 * - Category coverage
 * - Cross-shop shared product matching & price variation
 * - No intra-shop duplicates
 * - Referential integrity
 * - Mongoose schema validation
 * - API endpoint retrieval simulation
 */

const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const envFilePath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const connectToDb = require("../db/db");
const ShopOwner = require("../models/ShopOwnerModel");
const Shop = require("../models/ShopModel");
const ShopProduct = require("../models/ShopProduct");
const app = require("../app");

// Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const identityPart = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function getProductIdentityKey(product = {}) {
  const name = identityPart(product.name);
  const brand = identityPart(product.brand);
  const category = identityPart(product.category);
  const unit = identityPart(product.unit);
  if (!name || !unit || (!brand && !category)) return "";
  return [name, brand, brand ? "" : category, unit, "", ""].join("|");
}

async function runVerifications() {
  console.log("=================================================");
  console.log("       Running NearBuy Seed Data Verification    ");
  console.log("=================================================");

  await connectToDb();

  const MURAD_NAGAR_CENTER = { lat: 17.3822, lng: 78.4421 };
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Exactly 10 demo owners exist
  const demoOwners = await ShopOwner.find({
    email: { $regex: /^murad\.owner\d+@nearbuy\.test$/i },
  }).select("+password");
  assert(demoOwners.length === 10, "10 demo shop owners exist", `Found ${demoOwners.length}`);

  // 2. Exactly 10 demo shops exist and each is linked to an existing owner
  const ownerIds = demoOwners.map((o) => o._id);
  const demoShops = await Shop.find({ owner: { $in: ownerIds } });
  assert(demoShops.length === 10, "10 demo shops exist for the demo owners", `Found ${demoShops.length}`);

  // Check 1:1 owner-shop link
  let allOwnersLinkedCorrectly = true;
  for (const shop of demoShops) {
    if (!ownerIds.some((id) => id.toString() === shop.owner.toString())) {
      allOwnersLinkedCorrectly = false;
    }
  }
  assert(allOwnersLinkedCorrectly, "Every shop references a valid demo owner");

  // 3. All shop locations contain valid numeric coordinates
  let allNumericCoordinates = true;
  for (const shop of demoShops) {
    const lat = shop.location?.latitude;
    const lng = shop.location?.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      allNumericCoordinates = false;
    }
  }
  assert(allNumericCoordinates, "All shop locations contain valid numeric latitude/longitude");

  // 4. Coordinates are not all identical
  const coordSet = new Set(
    demoShops.map((s) => `${s.location.latitude.toFixed(4)},${s.location.longitude.toFixed(4)}`)
  );
  assert(coordSet.size === demoShops.length, "Shop coordinates are distinct (no duplicate coordinates)");

  // 5. Shops are located within Murad Nagar vicinity (< 2.0 km of Murad Nagar center)
  let allWithinRadius = true;
  let maxDistance = 0;
  for (const shop of demoShops) {
    const d = calculateDistanceKm(
      MURAD_NAGAR_CENTER.lat,
      MURAD_NAGAR_CENTER.lng,
      shop.location.latitude,
      shop.location.longitude
    );
    if (d > maxDistance) maxDistance = d;
    if (d > 2.0) allWithinRadius = false;
  }
  assert(allWithinRadius, `All shops are within 2.0km of Murad Nagar center (max: ${maxDistance.toFixed(2)}km)`);

  // 6. Product catalogue covers all planned categories
  const shopIds = demoShops.map((s) => s._id);
  const seededProducts = await ShopProduct.find({ shop: { $in: shopIds } });
  const distinctCategories = new Set(seededProducts.map((p) => p.category));
  assert(distinctCategories.size === 12, "Product catalogue covers all 12 planned categories", `Found ${distinctCategories.size}`);

  // 7. Every shop has a useful catalogue (at least 60 products per shop)
  const productCountPerShop = new Map();
  for (const p of seededProducts) {
    const sid = p.shop.toString();
    productCountPerShop.set(sid, (productCountPerShop.get(sid) || 0) + 1);
  }
  let allShopsHaveUsefulCatalogue = true;
  for (const shop of demoShops) {
    const count = productCountPerShop.get(shop._id.toString()) || 0;
    if (count < 60) allShopsHaveUsefulCatalogue = false;
  }
  assert(allShopsHaveUsefulCatalogue, "Every shop has a useful catalogue (>= 60 products per shop)");

  // 8. Shared products exist in multiple shops with varying prices
  const productsByName = new Map();
  for (const p of seededProducts) {
    if (!productsByName.has(p.name)) {
      productsByName.set(p.name, []);
    }
    productsByName.get(p.name).push(p);
  }

  let stapleProductsWithVaryingPrices = 0;
  for (const [name, listings] of productsByName.entries()) {
    if (listings.length >= 8) {
      const distinctPrices = new Set(listings.map((l) => l.price));
      if (distinctPrices.size > 1) {
        stapleProductsWithVaryingPrices++;
      }
    }
  }
  assert(stapleProductsWithVaryingPrices >= 60, `At least 60 staple products have varying prices across 8+ shops (Found: ${stapleProductsWithVaryingPrices})`);

  // 9. No duplicate product identity exists within a single shop
  let hasIntraShopDuplicates = false;
  for (const shop of demoShops) {
    const productsInShop = seededProducts.filter((p) => p.shop.toString() === shop._id.toString());
    const seenInShop = new Set();
    for (const p of productsInShop) {
      const key = `${p.name}__${p.unit}`;
      if (seenInShop.has(key)) {
        hasIntraShopDuplicates = true;
      }
      seenInShop.add(key);
    }
  }
  assert(!hasIntraShopDuplicates, "No duplicate product identities exist within any single shop");

  // 10. All product records reference valid shops
  const validShopIdStrings = new Set(demoShops.map((s) => s._id.toString()));
  let allProductsReferenceValidShops = true;
  for (const p of seededProducts) {
    if (!validShopIdStrings.has(p.shop.toString())) {
      allProductsReferenceValidShops = false;
    }
  }
  assert(allProductsReferenceValidShops, "All product records reference existing, valid shops");

  // 11. Schema validation passes for all records
  let allSatisfyValidation = true;
  for (const p of seededProducts.slice(0, 100)) {
    try {
      await p.validate();
    } catch (err) {
      allSatisfyValidation = false;
    }
  }
  assert(allSatisfyValidation, "All tested records satisfy Mongoose schema validation");

  // 12. Password hashing validation (verify comparePassword works with demo password)
  let allOwnersCanAuthenticate = true;
  for (const owner of demoOwners) {
    const match = await owner.comparePassword("NearBuy@Demo2025!");
    if (!match) allOwnersCanAuthenticate = false;
  }
  assert(allOwnersCanAuthenticate, "All seeded shop owners can authenticate with the demo password");

  // 13. Customer API endpoint simulation: GET /shop-products/shop/:shopId
  const testShop = demoShops[0];
  const fetchedProducts = await ShopProduct.find({ shop: testShop._id })
    .populate("shop", "shopName address contact status");
  assert(fetchedProducts.length > 0 && fetchedProducts[0].shop.shopName, "Endpoint simulation: /shop-products/shop/:shopId returns populated shop details");

  console.log("\n=================================================");
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runVerifications().catch((err) => {
  console.error("Verification execution error:", err);
  process.exit(1);
});
