const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const envFilePath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const connectToDb = require("../db/db");
const { CanonicalProduct, computeProductIdentityKey, identityPart } = require("../models/CanonicalProduct");
const ShopProduct = require("../models/ShopProduct");
const { seedCatalogFromJson } = require("./seedCatalogFromJson");

// Generates helpful aliases for search/autocomplete
function generateAliases(prod) {
  const aliases = new Set();
  const name = String(prod.name || "").trim();
  const brand = String(prod.brand || "").trim();
  const category = String(prod.category || "").trim();

  // Clean name without parenthesis (e.g. "India Gate Feast Rozzana Basmati Rice")
  const cleanName = name.replace(/\([^)]*\)/g, "").trim();
  if (cleanName && cleanName !== name) {
    aliases.add(cleanName.toLowerCase());
  }

  // Short name: brand + category or brand + key word
  if (brand) {
    aliases.add(brand.toLowerCase());
    const withoutBrand = name.replace(new RegExp(`^${brand}\\s*`, "i"), "").replace(/\([^)]*\)/g, "").trim();
    if (withoutBrand) {
      aliases.add(`${brand} ${withoutBrand}`.toLowerCase());
      aliases.add(withoutBrand.toLowerCase());
    }
  }

  // Common Hindi / colloquial aliases
  const lower = name.toLowerCase();
  if (lower.includes("salt")) aliases.add("namak");
  if (lower.includes("oil")) { aliases.add("tel"); aliases.add("cooking oil"); }
  if (lower.includes("atta") || lower.includes("wheat")) { aliases.add("gehun atta"); aliases.add("flour"); }
  if (lower.includes("sugar")) { aliases.add("cheeni"); aliases.add("shakkar"); }
  if (lower.includes("milk")) { aliases.add("doodh"); }
  if (lower.includes("egg")) { aliases.add("anda"); aliases.add("ande"); aliases.add("eggs"); }
  if (lower.includes("rice")) { aliases.add("chawal"); }
  if (lower.includes("tea")) { aliases.add("chai"); }
  if (lower.includes("soap")) { aliases.add("sabun"); }
  if (lower.includes("dal") || lower.includes("daal")) { aliases.add("daal"); }
  if (lower.includes("turmeric")) { aliases.add("haldi"); }
  if (lower.includes("chilli")) { aliases.add("mirchi"); aliases.add("lal mirch"); }

  return Array.from(aliases);
}

async function migrateCanonicalProducts() {
  console.log("=================================================");
  console.log("   NearBuy Canonical Product Migration System    ");
  console.log("=================================================");

  await connectToDb();
  console.log(`Connected to database: ${mongoose.connection.name}`);

  const catalogSeed = await seedCatalogFromJson();
  console.log(`\n1. Imported ${catalogSeed.total} products from productCatalog.json.`);

  // 2. Link existing ShopProduct records to Canonical Products
  console.log("\n2. Scanning and linking all ShopProduct records...");
  const shopProducts = await ShopProduct.find({});
  console.log(`   Found ${shopProducts.length} total ShopProduct records to process.`);

  let linkedCount = 0;
  let alreadyLinkedCount = 0;
  let customCreatedCount = 0;

  for (const sp of shopProducts) {
    if (sp.canonicalProduct) {
      alreadyLinkedCount++;
      continue;
    }

    // Check by identity key
    const spKey = computeProductIdentityKey({
      name: sp.name,
      brand: sp.brand,
      category: sp.category,
      unit: sp.unit,
      packSize: sp.packSize || "",
    });

    let canonical = await CanonicalProduct.findOne({ identityKey: spKey });

    // Link only exact identities; aliases must not collapse brands or package variants.
    if (!canonical) {
      canonical = await CanonicalProduct.findOneAndUpdate(
        { identityKey: spKey },
        {
          $setOnInsert: {
            productId: `NB-${new mongoose.Types.ObjectId().toString()}`,
            name: sp.name.trim(),
            normalizedName: identityPart(sp.name),
            identityKey: spKey,
            category: sp.category || "Grocery & Kirana",
            brand: sp.brand || "",
            unit: sp.unit || "packet",
            packSize: sp.packSize || "",
            description: sp.description || "",
            image: sp.image || "/images/product-placeholder.svg",
            aliases: generateAliases(sp),
            tier: "popular",
            basePrice: 0,
            isActive: true,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      customCreatedCount++;
    }

    sp.canonicalProduct = canonical._id;
    await sp.save();
    linkedCount++;
  }

  const totalCanonical = await CanonicalProduct.countDocuments();
  const unlinkedCount = await ShopProduct.countDocuments({
    $or: [{ canonicalProduct: null }, { canonicalProduct: { $exists: false } }],
  });

  console.log("\n=================================================");
  console.log("            MIGRATION EXECUTION SUMMARY          ");
  console.log("=================================================");
  console.log(`✓ Total Canonical Products in catalogue: ${totalCanonical}`);
  console.log(`✓ Custom Canonical Products created:     ${customCreatedCount}`);
  console.log(`✓ ShopProduct records newly linked:      ${linkedCount}`);
  console.log(`✓ ShopProduct records already linked:    ${alreadyLinkedCount}`);
  console.log(`✓ Unlinked ShopProduct records remaining: ${unlinkedCount}`);
  console.log("=================================================\n");

  return {
    totalCanonical,
    customCreatedCount,
    linkedCount,
    alreadyLinkedCount,
    unlinkedCount,
  };
}

if (require.main === module) {
  migrateCanonicalProducts()
    .then(() => {
      console.log("✅ Canonical product migration completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}

module.exports = {
  migrateCanonicalProducts,
};
