const express = require("express");
const { getNearbyShops, getShopById } = require("../Controllers/shopController");

const router = express.Router();

// Public customer-accessible endpoints for shop discovery
router.get("/shops/nearby", getNearbyShops);
router.get("/shops", getNearbyShops);
router.get("/shops/:shopId", getShopById);
router.get("/shop/:shopId", (req, res, next) => {
  if (req.params.shopId === "orders") {
    return next();
  }
  return getShopById(req, res, next);
});

module.exports = router;
