const mongoose = require("mongoose");

const identityPart = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function computeProductIdentityKey({ name, brand = "", category = "", unit = "", packSize = "" }) {
  const normName = identityPart(name);
  const normBrand = identityPart(brand);
  const normCategory = identityPart(category);
  const normUnit = identityPart(unit);
  const normPack = identityPart(packSize);

  const brandOrCat = normBrand || normCategory;
  return [normName, brandOrCat, normUnit, normPack].join("|");
}

const canonicalProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Canonical product name is required"],
      trim: true,
      validate: {
        validator: (value) => value.trim().length > 0,
        message: "Canonical product name cannot be empty",
      },
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    identityKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
    },
    packSize: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    aliases: {
      type: [String],
      default: [],
      index: true,
    },
    tier: {
      type: String,
      enum: ["staple", "popular", "specialty"],
      default: "popular",
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

canonicalProductSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = identityPart(this.name);
  }
  if (!this.identityKey) {
    this.identityKey = computeProductIdentityKey({
      name: this.name,
      brand: this.brand,
      category: this.category,
      unit: this.unit,
      packSize: this.packSize,
    });
  }
});

canonicalProductSchema.index({
  name: "text",
  brand: "text",
  aliases: "text",
  category: "text",
});

const CanonicalProduct = mongoose.model("CanonicalProduct", canonicalProductSchema);

module.exports = {
  CanonicalProduct,
  computeProductIdentityKey,
  identityPart,
};
