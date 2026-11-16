const mongoose = require("mongoose");

const shopProductSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
    },
    canonicalProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CanonicalProduct",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      validate: {
        validator: (value) => value.trim().length > 0,
        message: "Product name cannot be empty",
      },
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      validate: {
        validator: (value) => value.trim().length > 0,
        message: "Category cannot be empty",
      },
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      enum: {
        values: [
          "kg",
          "g",
          "ltr",
          "ml",
          "packet",
          "piece",
          "box",
          "1 kg",
          "500 g",
          "250 g",
          "100 g",
          "1 l",
          "500 ml",
          "1 packet",
          "1 pc",
          "1 piece",
          "1 box",
        ],
        message: "Invalid unit: {VALUE}. Allowed units are kg, g, ltr, ml, packet, piece, box, or standard pack sizes.",
      },
    },
    packSize: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, "Low stock threshold cannot be negative"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const unitNormalizationMap = {
  "1 packet": "packet",
  packet: "packet",
  packets: "packet",
  pkt: "packet",
  "1 pc": "piece",
  "1 piece": "piece",
  pc: "piece",
  piece: "piece",
  pieces: "piece",
  "1 kg": "kg",
  kg: "kg",
  "500 g": "g",
  "250 g": "g",
  "100 g": "g",
  g: "g",
  gm: "g",
  gram: "g",
  grams: "g",
  "1 l": "ltr",
  "1 ltr": "ltr",
  ltr: "ltr",
  l: "ltr",
  liter: "ltr",
  litre: "ltr",
  "500 ml": "ml",
  ml: "ml",
  "1 box": "piece",
  box: "piece",
};

function normalizeProductUnit(value, packSize = "") {
  const rawUnit = String(value || "").trim().toLowerCase();
  const unit = unitNormalizationMap[rawUnit] || rawUnit;
  const normalizedPackSize = String(packSize || "").trim() ||
    (unit !== rawUnit ? String(value).trim() : "");
  return { unit, packSize: normalizedPackSize };
}

shopProductSchema.pre("validate", function () {
  if (this.unit) {
    const measurement = normalizeProductUnit(this.unit, this.packSize);
    this.unit = measurement.unit;
    this.packSize = measurement.packSize;
  }
});

shopProductSchema.index({ shop: 1, isAvailable: 1, createdAt: -1 });
shopProductSchema.index({ shop: 1, category: 1 });
shopProductSchema.index({ canonicalProduct: 1, isAvailable: 1, price: 1 });
shopProductSchema.index({ isAvailable: 1, createdAt: -1 });
shopProductSchema.index({ name: 1, unit: 1 });

const ShopProduct = mongoose.model("ShopProduct", shopProductSchema);
ShopProduct.normalizeProductUnit = normalizeProductUnit;

module.exports = ShopProduct;
