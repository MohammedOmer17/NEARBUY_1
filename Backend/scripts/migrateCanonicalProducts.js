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
const { CANONICAL_PRODUCTS } = require("./data/kiranaProducts");

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

  let canonicalCreated = 0;
  let canonicalUpdated = 0;

  // 1. Seed/Upsert 118 Canonical Products from CANONICAL_PRODUCTS
  console.log(`\n1. Processing ${CANONICAL_PRODUCTS.length} predefined canonical products...`);
  for (const item of CANONICAL_PRODUCTS) {
    const key = computeProductIdentityKey({
      name: item.name,
      brand: item.brand,
      category: item.category,
      unit: item.unit,
      packSize: item.packSize || "",
    });

    const aliases = generateAliases(item);

    let doc = await CanonicalProduct.findOne({ identityKey: key });
    if (!doc) {
      doc = await CanonicalProduct.create({
        name: item.name,
        normalizedName: identityPart(item.name),
        identityKey: key,
        category: item.category,
        brand: item.brand || "",
        unit: item.unit,
        packSize: item.packSize || "",
        description: item.description || "",
        image: item.image || "",
        aliases,
        tier: item.tier || "popular",
        basePrice: item.basePrice || 0,
      });
      canonicalCreated++;
    } else {
      doc.name = item.name;
      doc.normalizedName = identityPart(item.name);
      doc.category = item.category;
      doc.brand = item.brand || "";
      doc.unit = item.unit;
      doc.packSize = item.packSize || "";
      doc.description = item.description || doc.description;
      if (item.image) doc.image = item.image;
      doc.aliases = Array.from(new Set([...doc.aliases, ...aliases]));
      doc.tier = item.tier || doc.tier;
      doc.basePrice = item.basePrice || doc.basePrice;
      await doc.save();
      canonicalUpdated++;
    }
  }

  console.log(`   ✓ Predefined canonical products: ${canonicalCreated} created, ${canonicalUpdated} updated.`);

  // 2. Link existing ShopProduct records to Canonical Products
  console.log("\n2. Scanning and linking all ShopProduct records...");
  const shopProducts = await ShopProduct.find({});
  console.log(`   Found ${shopProducts.length} total ShopProduct records to process.`);

  let linkedCount = 0;
  let alreadyLinkedCount = 0;
  let customCreatedCount = 0;

  for (const sp of shopProducts) {
    // Check by identity key
    const spKey = computeProductIdentityKey({
      name: sp.name,
      brand: sp.brand,
      category: sp.category,
      unit: sp.unit,
      packSize: sp.packSize || "",
    });

    let canonical = await CanonicalProduct.findOne({ identityKey: spKey });

    // Fallback: match by normalizedName and unit
    if (!canonical) {
      const normName = identityPart(sp.name);
      canonical = await CanonicalProduct.findOne({
        normalizedName: normName,
        unit: sp.unit,
      });
    }

    // Fallback: match by normalizedName and brand
    if (!canonical && sp.brand) {
      const normName = identityPart(sp.name);
      canonical = await CanonicalProduct.findOne({
        normalizedName: normName,
        brand: new RegExp(`^${identityPart(sp.brand)}$`, "i"),
      });
    }

    // Fallback for case/spelling/whitespace variations of simple names e.g. "eggs", "Eggs", " EGGS "
    if (!canonical) {
      const normName = identityPart(sp.name);
      if (normName === "eggs" || normName === "egg") {
        canonical = await CanonicalProduct.findOne({
          name: /Classic Farm Fresh White Eggs/i,
        });
      }
    }

    // If still not matched (e.g. a custom item created previously like "2Min Maggie"),
    // create a canonical entry for this custom product so it is preserved and shared!
    if (!canonical) {
      canonical = await CanonicalProduct.create({
        name: sp.name.trim(),
        normalizedName: identityPart(sp.name),
        identityKey: spKey,
        category: sp.category || "Grocery & Kirana",
        brand: sp.brand || "",
        unit: sp.unit || "packet",
        packSize: sp.packSize || "",
        description: sp.description || "",
        image: sp.image || "",
        aliases: generateAliases(sp),
        tier: "popular",
        basePrice: sp.price || 0,
      });
      customCreatedCount++;
    }

    // Update ShopProduct canonical reference
    if (!sp.canonicalProduct || sp.canonicalProduct.toString() !== canonical._id.toString()) {
      sp.canonicalProduct = canonical._id;
      await sp.save();
      linkedCount++;
    } else {
      alreadyLinkedCount++;
    }
  }

  const totalCanonical = await CanonicalProduct.countDocuments();
  const unlinkedCount = await ShopProduct.countDocuments({ canonicalProduct: null });

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
