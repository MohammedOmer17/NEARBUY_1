const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Shop = require("../models/ShopModel");
const ShopProduct = require("../models/ShopProduct");
const CustomerModel = require("../models/CustomerModel");
const {
  CanonicalProduct,
  computeProductIdentityKey,
  identityPart,
} = require("../models/CanonicalProduct");

const requiredProductFields = ["name", "category", "price", "unit", "quantity"];

const getOwnerShop = async (ownerId) => {
  return Shop.findOne({ owner: ownerId });
};

const parsePositiveNumber = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number`);
  }

  return parsedValue;
};

const validateProductPayload = (body) => {
  const missingFields = requiredProductFields.filter((field) => {
    if (field === "price") {
      return body[field] === undefined || body[field] === null || body[field] === "";
    }

    if (field === "quantity") {
      return body[field] === undefined || body[field] === null || body[field] === "";
    }

    return typeof body[field] !== "string" || body[field].trim() === "";
  });

  if (missingFields.length > 0) {
    return `Missing or invalid required fields: ${missingFields.join(", ")}`;
  }

  try {
    parsePositiveNumber(body.price, "Price");
    parsePositiveNumber(body.quantity, "Quantity");
  } catch (error) {
    return error.message;
  }

  return null;
};

const createProduct = async (req, res) => {
  const validationError = validateProductPayload(req.body);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const ownerShop = await getOwnerShop(req.user._id);

    if (!ownerShop) {
      return res.status(404).json({ message: "Shop not found for this owner" });
    }

    // 1. Resolve or create CanonicalProduct
    let canonical = null;
    const { canonicalProductId } = req.body;

    if (canonicalProductId && mongoose.Types.ObjectId.isValid(canonicalProductId)) {
      canonical = await CanonicalProduct.findById(canonicalProductId);
    }

    const candidateIdentityKey = computeProductIdentityKey({
      name: req.body.name,
      brand: req.body.brand || "",
      category: req.body.category || "",
      unit: req.body.unit || "",
      packSize: req.body.packSize || "",
    });

    if (!canonical) {
      canonical = await CanonicalProduct.findOne({ identityKey: candidateIdentityKey });
    }

    if (!canonical) {
      const normName = identityPart(req.body.name);
      canonical = await CanonicalProduct.findOne({
        $or: [
          { normalizedName: normName, unit: req.body.unit.trim() },
          { aliases: normName },
        ],
      });
    }

    // If still not found, create new shared canonical catalogue entry
    if (!canonical) {
      try {
        canonical = await CanonicalProduct.findOneAndUpdate(
          { identityKey: candidateIdentityKey },
          {
            $setOnInsert: {
              name: req.body.name.trim(),
              normalizedName: identityPart(req.body.name),
              identityKey: candidateIdentityKey,
              category: req.body.category.trim(),
              brand: typeof req.body.brand === "string" ? req.body.brand.trim() : "",
              unit: req.body.unit.trim(),
              packSize: typeof req.body.packSize === "string" ? req.body.packSize.trim() : "",
              description: typeof req.body.description === "string" ? req.body.description.trim() : "",
              image: req.body.image || "",
              basePrice: Number(req.body.price),
              aliases: [req.body.name.trim().toLowerCase()],
              tier: "popular",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (insertErr) {
        canonical = await CanonicalProduct.findOne({ identityKey: candidateIdentityKey });
      }
    }

    // 2. Check for intra-shop duplicate listing
    const intraShopDuplicateConditions = [
      {
        name: new RegExp(`^${req.body.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        unit: req.body.unit.trim(),
      },
    ];

    if (canonical) {
      intraShopDuplicateConditions.unshift({ canonicalProduct: canonical._id });
    }

    const existingInShop = await ShopProduct.findOne({
      shop: ownerShop._id,
      $or: intraShopDuplicateConditions,
    });

    if (existingInShop) {
      return res.status(409).json({
        message: `You already have "${existingInShop.name}" in your shop inventory. Update its stock or price instead.`,
      });
    }

    // 3. Create shop listing referencing the canonical product
    const product = await ShopProduct.create({
      shop: ownerShop._id,
      canonicalProduct: canonical ? canonical._id : undefined,
      name: canonical ? canonical.name : req.body.name.trim(),
      description:
        typeof req.body.description === "string" && req.body.description.trim()
          ? req.body.description.trim()
          : canonical?.description || "",
      category: canonical ? canonical.category : req.body.category.trim(),
      brand:
        typeof req.body.brand === "string" && req.body.brand.trim()
          ? req.body.brand.trim()
          : canonical?.brand || "",
      image: req.body.image || canonical?.image || "",
      price: Number(req.body.price),
      unit: canonical ? canonical.unit : req.body.unit.trim(),
      packSize:
        typeof req.body.packSize === "string" && req.body.packSize.trim()
          ? req.body.packSize.trim()
          : canonical?.packSize || "",
      quantity: Number(req.body.quantity),
      lowStockThreshold: req.body.lowStockThreshold === undefined ? 5 : Number(req.body.lowStockThreshold),
      isAvailable: Number(req.body.quantity) > 0,
    });

    // If canonical product lacked an image and this listing provides one, update canonical
    if (canonical && !canonical.image && product.image) {
      await CanonicalProduct.findByIdAndUpdate(canonical._id, { image: product.image }).catch(() => {});
    }

    await product.populate([
      { path: "shop", select: "shopName address contact status location" },
      { path: "canonicalProduct" },
    ]);

    return res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Create product failed:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(", ") || error.message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ message: error.message || "Unable to create product" });
  }
};

const getShopProducts = async (req, res) => {
  const { shopId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return res.status(400).json({ message: "Invalid shop ID" });
  }

  const filter = { shop: shopId };
  const { category, search, availability } = req.query;

  if (category) {
    filter.category = new RegExp(String(category).trim(), "i");
  }

  if (search) {
    filter.name = new RegExp(String(search).trim(), "i");
  }

  if (availability !== undefined) {
    filter.isAvailable = String(availability).toLowerCase() === "true";
  }

  try {
    if (req.query.countOnly === "true") {
      const count = await ShopProduct.countDocuments(filter);
      return res.status(200).json({ count, totalCount: count });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = req.query.limit !== undefined ? Math.min(200, Math.max(1, Number(req.query.limit))) : null;

    let queryBuilder = ShopProduct.find(filter)
      .sort({ createdAt: -1 })
      .populate("shop", "shopName address contact status location")
      .populate("canonicalProduct", "name normalizedName category brand unit packSize image basePrice tier")
      .lean();

    if (limit) {
      queryBuilder = queryBuilder.skip((page - 1) * limit).limit(limit);
    }

    const products = await queryBuilder;
    return res.status(200).json({ products, totalCount: products.length });
  } catch (error) {
    console.error("Fetch shop products failed:", error);
    return res.status(500).json({ message: "Unable to retrieve products" });
  }
};

const getProductById = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const product = await ShopProduct.findById(productId)
      .populate("shop", "shopName address contact status location")
      .populate("canonicalProduct");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Fetch product by ID failed:", error);
    return res.status(500).json({ message: "Unable to retrieve product" });
  }
};

const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isValidCoord = (num, min, max) =>
  typeof num === 'number' && Number.isFinite(num) && num >= min && num <= max;

const getProductOffers = async (req, res) => {
  const { productId } = req.params;
  const { latitude, longitude, sort } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    let targetProduct = await ShopProduct.findById(productId)
      .populate("shop")
      .populate("canonicalProduct");
    let canonical = null;

    if (targetProduct) {
      if (targetProduct.canonicalProduct) {
        canonical = targetProduct.canonicalProduct;
      } else {
        const key = computeProductIdentityKey({
          name: targetProduct.name,
          brand: targetProduct.brand,
          category: targetProduct.category,
          unit: targetProduct.unit,
          packSize: targetProduct.packSize,
        });
        canonical = await CanonicalProduct.findOne({ identityKey: key });
      }
    } else {
      canonical = await CanonicalProduct.findById(productId);
      if (!canonical) {
        return res.status(404).json({ message: "Product not found" });
      }
    }

    const matchConditions = [];
    if (canonical) {
      matchConditions.push({ canonicalProduct: canonical._id });
    }

    const refName = canonical ? canonical.name : targetProduct.name;
    const refUnit = canonical ? canonical.unit : targetProduct.unit;
    const refBrand = canonical?.brand || targetProduct?.brand;
    const refCategory = canonical?.category || targetProduct?.category;

    const escapedName = refName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameMatchCond = {
      name: new RegExp(`^${escapedName}$`, "i"),
      unit: refUnit,
    };
    if (refBrand) {
      const escapedBrand = refBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nameMatchCond.brand = new RegExp(`^${escapedBrand}$`, "i");
    }
    if (refCategory) {
      nameMatchCond.category = refCategory;
    }
    matchConditions.push(nameMatchCond);

    const matchingProducts = await ShopProduct.find({ $or: matchConditions })
      .populate("shop", "shopName address contact location status")
      .populate("canonicalProduct", "name brand category unit packSize image basePrice tier")
      .lean();

    if (!targetProduct && matchingProducts.length > 0) {
      targetProduct = matchingProducts[0];
    }

    const validOffers = matchingProducts.filter(
      (p) => p && p.shop && (p.shop.status === "active" || !p.shop.status)
    );

    let lat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null;
    let lng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null;

    if ((lat === null || lng === null) && (req.cookies?.token || req.headers.authorization)) {
      try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const customer = await CustomerModel.findById(decoded._id).select("location");
          if (
            customer?.location &&
            isValidCoord(customer.location.latitude, -90, 90) &&
            isValidCoord(customer.location.longitude, -180, 180)
          ) {
            lat = customer.location.latitude;
            lng = customer.location.longitude;
          }
        }
      } catch {
        // Ignore optional auth token failure
      }
    }

    const hasCustomerCoords = lat !== null && lng !== null && isValidCoord(lat, -90, 90) && isValidCoord(lng, -180, 180);

    const offers = validOffers.map((p) => {
      const shopObj = p.shop.toObject ? p.shop.toObject() : p.shop;
      let distanceKm = null;

      if (
        hasCustomerCoords &&
        shopObj.location &&
        isValidCoord(shopObj.location.latitude, -90, 90) &&
        isValidCoord(shopObj.location.longitude, -180, 180)
      ) {
        distanceKm = Number(
          calculateHaversineDistanceKm(
            lat,
            lng,
            shopObj.location.latitude,
            shopObj.location.longitude
          ).toFixed(1)
        );
      }

      return {
        _id: p._id,
        id: p._id,
        canonicalProductId: canonical?._id || p.canonicalProduct?._id || null,
        name: p.name,
        description: p.description,
        category: p.category,
        brand: p.brand,
        image: p.image || canonical?.image || "",
        price: p.price,
        unit: p.unit,
        packSize: p.packSize || canonical?.packSize || "",
        isAvailable: p.isAvailable && p.quantity > 0,
        available: p.isAvailable && p.quantity > 0,
        distanceKm,
        shop: {
          _id: shopObj._id,
          id: shopObj._id,
          shopName: shopObj.shopName,
          address: shopObj.address,
          contact: shopObj.contact,
          location: shopObj.location,
          distanceKm,
        },
      };
    });

    if (sort === "distance" && hasCustomerCoords) {
      offers.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm || a.price - b.price;
      });
    } else if (sort === "price_desc") {
      offers.sort((a, b) => b.price - a.price);
    } else {
      offers.sort((a, b) => {
        const priceDiff = a.price - b.price;
        if (priceDiff !== 0) return priceDiff;
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return 0;
      });
    }

    return res.status(200).json({
      product: {
        _id: targetProduct._id,
        id: targetProduct._id,
        canonicalProductId: canonical?._id || targetProduct.canonicalProduct?._id || null,
        name: canonical?.name || targetProduct.name,
        description: canonical?.description || targetProduct.description,
        category: canonical?.category || targetProduct.category,
        brand: canonical?.brand || targetProduct.brand,
        image: targetProduct.image || canonical?.image || "",
        unit: canonical?.unit || targetProduct.unit,
        packSize: canonical?.packSize || targetProduct.packSize || "",
        price: offers[0] ? offers[0].price : targetProduct.price,
        isAvailable: targetProduct.isAvailable && targetProduct.quantity > 0,
        shop: targetProduct.shop,
      },
      offers,
      totalOffers: offers.length,
    });
  } catch (error) {
    console.error("Fetch product offers failed:", error);
    return res.status(500).json({ message: "Unable to retrieve product offers" });
  }
};

const updateProduct = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const ownerShop = await getOwnerShop(req.user._id);

    if (!ownerShop) {
      return res.status(404).json({ message: "Shop not found for this owner" });
    }

    const product = await ShopProduct.findOne({ _id: productId, shop: ownerShop._id });

    if (!product) {
      return res.status(404).json({ message: "Product not found for this shop" });
    }

    const allowedUpdates = [
      "name",
      "description",
      "category",
      "brand",
      "image",
      "price",
      "unit",
      "packSize",
      "quantity",
      "lowStockThreshold",
      "isAvailable",
    ];

    const updates = {};

    for (const field of allowedUpdates) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (field === "name" || field === "category" || field === "unit") {
          if (typeof req.body[field] !== "string" || req.body[field].trim() === "") {
            return res.status(400).json({ message: `${field} must be a non-empty string` });
          }
          updates[field] = req.body[field].trim();
        } else if (field === "price" || field === "quantity" || field === "lowStockThreshold") {
          const value = Number(req.body[field]);
          if (!Number.isFinite(value) || value < 0) {
            return res.status(400).json({ message: `${field} must be a valid non-negative number` });
          }
          updates[field] = value;
        } else if (field === "isAvailable") {
          if (typeof req.body[field] !== "boolean") {
            return res.status(400).json({ message: "isAvailable must be a boolean" });
          }
          updates[field] = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one field to update" });
    }

    if (updates.quantity !== undefined) {
      updates.isAvailable = updates.quantity > 0;
    }

    if (updates.price !== undefined && updates.price < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }

    Object.assign(product, updates);
    await product.save();

    return res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Product update failed:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        message: messages.join(", ") || error.message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ message: error.message || "Unable to update product" });
  }
};

const deleteProduct = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  try {
    const ownerShop = await getOwnerShop(req.user._id);

    if (!ownerShop) {
      return res.status(404).json({ message: "Shop not found for this owner" });
    }

    const product = await ShopProduct.findOneAndDelete({ _id: productId, shop: ownerShop._id });

    if (!product) {
      return res.status(404).json({ message: "Product not found for this shop" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product failed:", error);
    return res.status(500).json({ message: "Unable to delete product" });
  }
};

const updateProductStock = async (req, res) => {
  const { productId } = req.params;
  const quantity = req.body.quantity ?? req.body.stock ?? req.body.availableQuantity;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  if (quantity === undefined || quantity === null || quantity === "") {
    return res.status(400).json({ message: "Quantity is required" });
  }

  const parsedQuantity = Number(quantity);

  if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
    return res.status(400).json({ message: "Quantity must be a valid non-negative number" });
  }

  try {
    const ownerShop = await getOwnerShop(req.user._id);

    if (!ownerShop) {
      return res.status(404).json({ message: "Shop not found for this owner" });
    }

    const product = await ShopProduct.findOne({ _id: productId, shop: ownerShop._id });

    if (!product) {
      return res.status(404).json({ message: "Product not found for this shop" });
    }

    product.quantity = parsedQuantity;
    product.isAvailable = parsedQuantity > 0;
    await product.save();

    return res.status(200).json({
      message: "Product stock updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product stock failed:", error);
    return res.status(500).json({ message: "Unable to update product stock" });
  }
};

module.exports = {
  createProduct,
  getShopProducts,
  getProductById,
  getProductOffers,
  updateProduct,
  deleteProduct,
  updateProductStock,
};
