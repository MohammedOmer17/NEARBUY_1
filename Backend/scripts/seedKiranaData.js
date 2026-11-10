#!/usr/bin/env node

/**
 * NearBuy Kirana Store Seeding System
 *
 * Implements a complete, safe, repeatable development seeding system for
 * 10 independent kirana stores and owners located in and around Murad Nagar,
 * Asif Nagar, Hyderabad, Telangana, India.
 *
 * Features:
 * - 10 distinct synthetic owner accounts (murad.owner01@nearbuy.test .. murad.owner10@nearbuy.test)
 * - 10 distinct physical kirana stores with authentic coordinates around Murad Nagar
 * - Large categorized catalogue of 118 distinct grocery items across 12 categories
 * - High cross-shop product overlap (65+ staple products in 8-10 shops) with varied, realistic prices
 * - Non-destructive idempotent upserts (safe to run repeatedly)
 * - Opt-in scoped reset flag (--reset) restricted to seed-managed accounts
 * - Rigorous safety checks preventing runs against production environments
 */

const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

// Load environment file if available
const envFilePath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const connectToDb = require("../db/db");
const ShopOwner = require("../models/ShopOwnerModel");
const Shop = require("../models/ShopModel");
const ShopProduct = require("../models/ShopProduct");
const { CanonicalProduct, computeProductIdentityKey } = require("../models/CanonicalProduct");

const { KIRANA_SHOPS, DEMO_OWNER_PASSWORD } = require("./data/kiranaShops");
const { CANONICAL_PRODUCTS } = require("./data/kiranaProducts");

// ============================================================================
// Frontend-compatible Identity Normalizer for cross-shop verification
// ============================================================================
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

// ============================================================================
// Price and Stock Variation Engine
// ============================================================================
function calculateShopPrice(basePrice, variationRate, shopIndex) {
  // Deterministic variation based on shop price variation rate
  let price = Math.round(basePrice * (1 + variationRate));

  // If rate was non-zero but rounding produced identical basePrice, nudge by ₹1-2
  if (variationRate !== 0 && price === basePrice) {
    price = variationRate > 0 ? basePrice + 1 : Math.max(1, basePrice - 1);
  }

  // Slight deterministic minor tweak for specific price tiers
  if (basePrice > 100 && shopIndex % 3 === 1) {
    price = Math.round(price + (shopIndex % 2 === 0 ? 2 : -2));
  }

  return Math.max(1, price);
}

function shouldShopStockProduct(product, shopIndex, totalShops) {
  if (product.tier === "staple") {
    // Top 55 staples: in ALL 10 shops
    // Next 10 staples: in 8-9 shops
    const stapleIndex = CANONICAL_PRODUCTS.filter((p) => p.tier === "staple").indexOf(product);
    if (stapleIndex < 55) return true;
    return (stapleIndex + shopIndex) % 10 !== 0;
  }

  if (product.tier === "popular") {
    // Available in 5 to 7 shops
    // Supermarket (ASF Mart - shop 2) and wholesale (Hussain Traders - shop 7) stock almost all
    if (shopIndex === 2 || shopIndex === 7) return true;
    const popularIndex = CANONICAL_PRODUCTS.filter((p) => p.tier === "popular").indexOf(product);
    return (popularIndex * 3 + shopIndex) % 10 < 6;
  }

  if (product.tier === "specialty") {
    // Available in 2 to 3 shops (Supermarket + 1-2 rotating shops)
    if (shopIndex === 2) return true;
    const specialtyIndex = CANONICAL_PRODUCTS.filter((p) => p.tier === "specialty").indexOf(product);
    return (specialtyIndex * 2 + shopIndex) % 10 === 0 || (specialtyIndex + shopIndex) % 10 === 5;
  }

  return false;
}

// ============================================================================
// Safety Validation
// ============================================================================
function validateEnvironmentSafety() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SAFETY VIOLATION: Seeding cannot be executed when NODE_ENV is set to 'production'."
    );
  }

  const uri = process.env.SEED_TEST_DATA_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri || typeof uri !== "string") {
    throw new Error(
      "CONFIGURATION ERROR: Neither SEED_TEST_DATA_MONGODB_URI nor MONGODB_URI is defined."
    );
  }

  // Ensure URI does not point to a known production database name
  const lowerUri = uri.toLowerCase();
  if (lowerUri.includes("production") || lowerUri.includes("prod-live")) {
    throw new Error(
      "SAFETY VIOLATION: Target MongoDB URI indicates a production database. Refusing to proceed."
    );
  }

  return uri;
}

// ============================================================================
// Scoped Reset Function
// ============================================================================
async function performScopedReset() {
  console.log("\n🧹 Option --reset enabled: removing existing NearBuy demo kirana seed records...");

  // Match only accounts matching our deterministic email pattern
  const seededOwners = await ShopOwner.find({
    email: { $regex: /^murad\.owner\d+@nearbuy\.test$/i },
  });

  const ownerIds = seededOwners.map((o) => o._id);
  const seededShops = await Shop.find({ owner: { $in: ownerIds } });
  const shopIds = seededShops.map((s) => s._id);

  const productDeleteResult = await ShopProduct.deleteMany({ shop: { $in: shopIds } });
  const shopDeleteResult = await Shop.deleteMany({ _id: { $in: shopIds } });
  const ownerDeleteResult = await ShopOwner.deleteMany({ _id: { $in: ownerIds } });

  console.log(`   - Removed ${productDeleteResult.deletedCount} seed ShopProducts.`);
  console.log(`   - Removed ${shopDeleteResult.deletedCount} seed Shops.`);
  console.log(`   - Removed ${ownerDeleteResult.deletedCount} seed ShopOwners.`);
  console.log("   (Non-seed accounts and real development records were untouched)\n");
}

// ============================================================================
// Main Seeder Function
// ============================================================================
async function seedKiranaData() {
  const isReset = process.argv.includes("--reset") || process.env.SEED_RESET === "true";
  const targetUri = validateEnvironmentSafety();

  console.log("=================================================================");
  console.log("       NearBuy Hyperlocal Kirana Store Seeder (Hyderabad)        ");
  console.log("=================================================================");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Mode: ${isReset ? "Reset + Seed" : "Safe Idempotent Upsert"}`);
  console.log(`Target locality: Murad Nagar, Asif Nagar, Hyderabad (Telangana)\n`);

  await connectToDb(targetUri);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  if (isReset) {
    await performScopedReset();
  }

  let insertedOwners = 0;
  let updatedOwners = 0;
  let insertedShops = 0;
  let updatedShops = 0;
  let insertedProducts = 0;
  let updatedProducts = 0;

  // Ensure all canonical products are upserted with deterministic identity keys
  const canonicalDocMap = new Map();
  for (const c of CANONICAL_PRODUCTS) {
    const key = computeProductIdentityKey({
      name: c.name,
      brand: c.brand || "",
      category: c.category || "",
      unit: c.unit || "",
      packSize: c.packSize || "",
    });
    const doc = await CanonicalProduct.findOneAndUpdate(
      { identityKey: key },
      {
        $set: {
          name: c.name,
          normalizedName: identityPart(c.name),
          category: c.category,
          brand: c.brand || "",
          unit: c.unit,
          packSize: c.packSize || "",
          description: c.description || "",
          image: c.image || "",
          tier: c.tier || "popular",
          basePrice: c.basePrice || 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    canonicalDocMap.set(`${c.name}|${c.unit}`, doc._id);
  }

  const seededShopSummaries = [];
  const distinctIdentityKeys = new Set();
  const identityOfferCounts = new Map();

  for (let shopIndex = 0; shopIndex < KIRANA_SHOPS.length; shopIndex++) {
    const shopDef = KIRANA_SHOPS[shopIndex];

    // 1. Create or retrieve ShopOwner
    let owner = await ShopOwner.findOne({ email: shopDef.owner.email });
    if (!owner) {
      const hashedPassword = await bcrypt.hash(shopDef.owner.password, 12);
      owner = await ShopOwner.create({
        name: shopDef.owner.name,
        email: shopDef.owner.email,
        phone: shopDef.owner.phone,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        accountStatus: "approved",
      });
      insertedOwners++;
    } else {
      owner.name = shopDef.owner.name;
      owner.phone = shopDef.owner.phone;
      owner.isVerified = true;
      owner.isActive = true;
      owner.accountStatus = "approved";
      await owner.save();
      updatedOwners++;
    }

    // 2. Create or retrieve Shop
    let shop = await Shop.findOne({ owner: owner._id });
    if (!shop) {
      shop = await Shop.create({
        owner: owner._id,
        shopName: shopDef.shop.shopName,
        address: shopDef.shop.address,
        location: {
          latitude: shopDef.shop.location.latitude,
          longitude: shopDef.shop.location.longitude,
        },
        contact: shopDef.shop.contact,
        paymentDetails: shopDef.shop.paymentDetails,
        status: shopDef.shop.status || "active",
      });
      insertedShops++;
    } else {
      shop.shopName = shopDef.shop.shopName;
      shop.address = shopDef.shop.address;
      shop.location = {
        latitude: shopDef.shop.location.latitude,
        longitude: shopDef.shop.location.longitude,
      };
      shop.contact = shopDef.shop.contact;
      shop.paymentDetails = shopDef.shop.paymentDetails;
      shop.status = shopDef.shop.status || "active";
      await shop.save();
      updatedShops++;
    }

    // 3. Upsert shop products for this shop
    let shopProductCount = 0;
    const shopProductsList = [];

    for (let pIndex = 0; pIndex < CANONICAL_PRODUCTS.length; pIndex++) {
      const canonical = CANONICAL_PRODUCTS[pIndex];

      if (!shouldShopStockProduct(canonical, shopIndex, KIRANA_SHOPS.length)) {
        continue;
      }

      const price = calculateShopPrice(canonical.basePrice, shopDef.shop.priceVariationRate, shopIndex);
      let quantity = Math.round(canonical.defaultQuantity * shopDef.shop.stockMultiplier);

      // Controlled stock availability: out-of-stock simulation for 2 items per shop (non-staples)
      let isAvailable = true;
      if (canonical.tier !== "staple" && (shopIndex * 7 + pIndex) % 29 === 0) {
        quantity = 0;
        isAvailable = false;
      } else if (canonical.tier !== "staple" && (shopIndex * 5 + pIndex) % 31 === 0) {
        // Low stock simulation
        quantity = 2;
        isAvailable = true;
      }

      const canonicalId = canonicalDocMap.get(`${canonical.name}|${canonical.unit}`);

      let productDoc = await ShopProduct.findOne({
        shop: shop._id,
        name: canonical.name,
        unit: canonical.unit,
      });

      if (!productDoc) {
        productDoc = await ShopProduct.create({
          shop: shop._id,
          canonicalProduct: canonicalId,
          name: canonical.name,
          description: canonical.description,
          category: canonical.category,
          brand: canonical.brand,
          image: canonical.image || "",
          price: price,
          unit: canonical.unit,
          quantity: quantity,
          lowStockThreshold: canonical.lowStockThreshold || 5,
          isAvailable: isAvailable,
        });
        insertedProducts++;
      } else {
        productDoc.canonicalProduct = canonicalId;
        productDoc.description = canonical.description;
        productDoc.category = canonical.category;
        productDoc.brand = canonical.brand;
        productDoc.price = price;
        productDoc.quantity = quantity;
        productDoc.lowStockThreshold = canonical.lowStockThreshold || 5;
        productDoc.isAvailable = isAvailable;
        if (canonical.image !== undefined) productDoc.image = canonical.image || "";
        await productDoc.save();
        updatedProducts++;
      }

      // Schema validation check
      await productDoc.validate();

      shopProductCount++;
      shopProductsList.push({
        id: productDoc._id,
        name: productDoc.name,
        price: productDoc.price,
        unit: productDoc.unit,
      });

      const key = getProductIdentityKey(productDoc);
      if (key) {
        distinctIdentityKeys.add(key);
        identityOfferCounts.set(key, (identityOfferCounts.get(key) || 0) + 1);
      }
    }

    seededShopSummaries.push({
      index: shopIndex + 1,
      shopId: shop._id.toString(),
      shopName: shop.shopName,
      ownerEmail: owner.email,
      locality: shopDef.shop.locality,
      coordinates: `${shop.location.latitude.toFixed(4)}, ${shop.location.longitude.toFixed(4)}`,
      locationType: shopDef.shop.locationType,
      isApproximate: shopDef.shop.isApproximate,
      productCount: shopProductCount,
    });
  }

  // ============================================================================
  // Post-Seeding Statistics & Validation Report
  // ============================================================================
  const categoriesPresent = new Set(CANONICAL_PRODUCTS.map((p) => p.category));
  let sharedBy8OrMore = 0;
  let sharedBy3To7 = 0;
  let shopSpecificOrLow = 0;

  for (const count of identityOfferCounts.values()) {
    if (count >= 8) sharedBy8OrMore++;
    else if (count >= 3) sharedBy3To7++;
    else shopSpecificOrLow++;
  }

  console.log("\n=================================================================");
  console.log("                   SEEDING EXECUTION SUMMARY                     ");
  console.log("=================================================================");
  console.log(`✓ Seeded Shop Owners:              ${KIRANA_SHOPS.length} (${insertedOwners} created, ${updatedOwners} updated)`);
  console.log(`✓ Seeded Kirana Shops:             ${KIRANA_SHOPS.length} (${insertedShops} created, ${updatedShops} updated)`);
  console.log(`✓ Canonical Product Identities:    ${CANONICAL_PRODUCTS.length}`);
  console.log(`✓ Normalized Identity Keys:        ${distinctIdentityKeys.size}`);
  console.log(`✓ Total ShopProduct Listings:      ${insertedProducts + updatedProducts} (${insertedProducts} created, ${updatedProducts} updated)`);
  console.log(`✓ Product Categories Included:     ${categoriesPresent.size} / 12`);
  console.log(`✓ Products in 8+ Shops:            ${sharedBy8OrMore} (Target: >= 60)`);
  console.log(`✓ Products in 3-7 Shops:           ${sharedBy3To7}`);
  console.log(`✓ Specialty/Shop-specific (1-2):   ${shopSpecificOrLow}`);
  console.log(`✓ Approximate Locations:           ${seededShopSummaries.filter((s) => s.isApproximate).length} / 10`);

  console.log("\n-----------------------------------------------------------------");
  console.log("                     SEEDED KIRANA STORES                        ");
  console.log("-----------------------------------------------------------------");
  for (const s of seededShopSummaries) {
    const approxTag = s.isApproximate ? " [APPROXIMATE]" : " [VERIFIED]";
    console.log(
      `${String(s.index).padStart(2, " ")}. ${s.shopName}\n` +
      `    Owner:    ${s.ownerEmail}\n` +
      `    Locality: ${s.locality}${approxTag}\n` +
      `    Coords:   (${s.coordinates})\n` +
      `    Listings: ${s.productCount} products\n`
    );
  }

  console.log("-----------------------------------------------------------------");
  console.log("                 PRODUCT CATEGORIES COVERED                      ");
  console.log("-----------------------------------------------------------------");
  Array.from(categoriesPresent).forEach((cat, idx) => {
    const count = CANONICAL_PRODUCTS.filter((p) => p.category === cat).length;
    console.log(`  ${idx + 1}. ${cat.padEnd(30, " ")} (${count} products)`);
  });

  console.log("\n-----------------------------------------------------------------");
  console.log("                 SAMPLE CROSS-SHOP COMPARISON                    ");
  console.log("-----------------------------------------------------------------");
  const sampleProducts = [
    "Fortune Sunlite Refined Sunflower Oil (1L)",
    "Tata Salt Vacuum Evaporated Iodised Salt (1kg)",
    "Aashirvaad Shudh Chakki Atta (5kg)",
    "Tata Sampann Unpolished Toor Dal (1kg)",
  ];

  for (const sampleName of sampleProducts) {
    const foundOffers = await ShopProduct.find({ name: sampleName })
      .populate("shop", "shopName")
      .sort({ price: 1 });

    console.log(`\n📦 ${sampleName}:`);
    for (const offer of foundOffers) {
      console.log(`   - ${offer.shop?.shopName || "Shop"}: ₹${offer.price}`);
    }
  }

  console.log("\n=================================================================");
  console.log("                     DEMO AUTH CREDENTIALS                       ");
  console.log("=================================================================");
  console.log("All seeded accounts are synthetic local development test accounts.");
  console.log(`Email pattern: murad.owner01@nearbuy.test ... murad.owner10@nearbuy.test`);
  console.log(`Demo password: ${DEMO_OWNER_PASSWORD}`);
  console.log("Status:        approved & active (ready for immediate login)");
  console.log("=================================================================\n");

  return {
    ownersCount: KIRANA_SHOPS.length,
    shopsCount: KIRANA_SHOPS.length,
    canonicalCount: CANONICAL_PRODUCTS.length,
    totalListings: insertedProducts + updatedProducts,
    categoriesCount: categoriesPresent.size,
    sharedBy8OrMore,
    sharedBy3To7,
  };
}

if (require.main === module) {
  seedKiranaData()
    .then(() => {
      console.log("✅ NearBuy Kirana Store seeding completed successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = {
  seedKiranaData,
};
