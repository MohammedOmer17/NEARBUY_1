const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const catalogPath = path.join(__dirname, "..", "data", "productCatalog.json");
const envFilePath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const connectToDb = require("../db/db");
const { CanonicalProduct, computeProductIdentityKey, identityPart } = require("../models/CanonicalProduct");
const ShopProduct = require("../models/ShopProduct");
const placeholderImage = "/images/product-placeholder.svg";

async function seedCatalogFromJson() {
  const products = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("Product catalogue JSON must contain a non-empty array.");
  }

  const ids = new Set();
  for (const product of products) {
    if (!product.productId || !product.name || !product.category || !product.unit) {
      throw new Error("Every catalogue product must include productId, name, category, and unit.");
    }
    if (ids.has(product.productId)) {
      throw new Error(`Duplicate catalogue productId: ${product.productId}`);
    }
    ids.add(product.productId);
  }

  await connectToDb();
  let inserted = 0;
  let updated = 0;
  let mergedDuplicates = 0;

  for (const item of products) {
    const identityKey = computeProductIdentityKey({
      name: item.name,
      brand: item.brand,
      category: item.category,
      unit: item.unit,
      packSize: item.packSize,
    });
    const data = {
      productId: item.productId,
      name: item.name.trim(),
      normalizedName: identityPart(item.name),
      identityKey,
      category: item.category.trim(),
      brand: String(item.brand || "").trim(),
      unit: item.unit.trim(),
      packSize: String(item.packSize || "").trim(),
      aliases: [...new Set((item.aliases || []).map((alias) => identityPart(alias)).filter(Boolean))],
      image: item.image || placeholderImage,
      description: item.description || "",
      tier: item.tier || "popular",
      basePrice: Number.isFinite(Number(item.basePrice)) ? Number(item.basePrice) : 0,
      isActive: item.isActive !== false && item.status !== "inactive",
    };

    const identityMatch = await CanonicalProduct.findOne({ identityKey }).select("_id").lean();
    const measuredPackage = data.packSize.match(/(\d+(?:\.\d+)?)\s*(kg|g|ltr|l|ml|pcs?|pieces?|packets?)/i);
    const namedPackage = data.packSize.match(/pack\s+of\s+(\d+)/i);
    const packageIsInName = measuredPackage
      ? data.normalizedName.replace(/\s/g, "").includes(measuredPackage[0].toLowerCase().replace(/\s/g, ""))
      : namedPackage
        ? data.normalizedName.replace(/\s/g, "").includes(`packof${namedPackage[1]}`)
        : false;
    const legacyMatches = packageIsInName
      ? await CanonicalProduct.find({
          normalizedName: data.normalizedName,
          unit: data.unit,
          packSize: { $in: ["", null] },
        }).select("_id brand category").lean()
      : [];
    const matchesById = new Map();
    if (identityMatch) matchesById.set(String(identityMatch._id), identityMatch);
    for (const candidate of legacyMatches) {
      if (
        identityPart(candidate.brand) === identityPart(data.brand) &&
        identityPart(candidate.category) === identityPart(data.category)
      ) {
        matchesById.set(String(candidate._id), candidate);
      }
    }

    const candidates = [...matchesById.values()];
    const rankedCandidates = await Promise.all(candidates.map(async (candidate) => ({
      candidate,
      references: await ShopProduct.countDocuments({ canonicalProduct: candidate._id }),
    })));
    rankedCandidates.sort((a, b) => b.references - a.references);

    const target = rankedCandidates[0]?.candidate;
    if (target) {
      for (const { candidate } of rankedCandidates.slice(1)) {
        await ShopProduct.updateMany(
          { canonicalProduct: candidate._id },
          { $set: { canonicalProduct: target._id } },
          { timestamps: false }
        );
        await CanonicalProduct.deleteOne({ _id: candidate._id });
        mergedDuplicates += 1;
      }

      const result = await CanonicalProduct.updateOne(
        { _id: target._id },
        { $set: data },
        { runValidators: true, timestamps: false }
      );
      if (result.modifiedCount) updated += 1;
    } else {
      const result = await CanonicalProduct.updateOne(
        { identityKey },
        { $set: data },
        { upsert: true, runValidators: true, timestamps: false }
      );
      if (result.upsertedCount) inserted += 1;
      else if (result.modifiedCount) updated += 1;
    }
  }

  const missingIds = await CanonicalProduct.find({
    $or: [{ productId: { $exists: false } }, { productId: null }, { productId: "" }],
  }).select("_id").lean();
  for (const product of missingIds) {
    await CanonicalProduct.updateOne(
      { _id: product._id },
      { $set: { productId: `NB-${product._id.toString()}` } },
      { timestamps: false }
    );
  }

  const imageCleanup = await CanonicalProduct.updateMany(
    { image: { $regex: "^https?://(images\\.openfoodfacts\\.org|upload\\.wikimedia\\.org)/", $options: "i" } },
    { $set: { image: placeholderImage } },
    { timestamps: false }
  );
  const sanitizedImages = imageCleanup.modifiedCount;

  console.log(
    `Catalogue import complete: ${inserted} inserted, ${updated} updated, ${mergedDuplicates} duplicates merged, ` +
    `${missingIds.length} legacy IDs assigned, ${sanitizedImages} unverified images replaced, ` +
    `${products.length} dataset records.`
  );
  return {
    inserted,
    updated,
    mergedDuplicates,
    assignedIds: missingIds.length,
    sanitizedImages,
    total: products.length,
  };
}

if (require.main === module) {
  seedCatalogFromJson()
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error("Catalogue import failed:", error);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}

module.exports = { seedCatalogFromJson };