const express = require("express");
const {
  createProduct,
  getShopProducts,
  getProductById,
  getProductOffers,
  updateProduct,
  deleteProduct,
  updateProductStock,
} = require("../controllers/shopProductController");
const {
  getProductSuggestions,
  getCanonicalProductById,
} = require("../controllers/canonicalProductController");
const { authShopOwner, authCustomer } = require("../Middlewares/authMiddleware");

const router = express.Router();

// Autocomplete and canonical product endpoints (must precede /:productId parameter route)
router.get("/shop-products/suggestions", getProductSuggestions);
router.get("/canonical-products/suggestions", getProductSuggestions);
router.get("/canonical-products/:id", getCanonicalProductById);

router.post("/shop-products", authShopOwner, createProduct);
router.get("/shop-products/shop/:shopId", getShopProducts);
router.get("/shop-products/:productId/offers", getProductOffers);
router.get("/shop-products/:productId", getProductById);
router.put("/shop-products/:productId", authShopOwner, updateProduct);
router.delete("/shop-products/:productId", authShopOwner, deleteProduct);
router.patch("/shop-products/:productId/stock", authShopOwner, updateProductStock);

module.exports = router;
