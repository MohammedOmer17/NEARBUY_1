const express = require("express");
const { authCaptain, authShopOwner, authAnyUser } = require("../Middlewares/authMiddleware");
const {
  getCaptainToShop,
  getCaptainToCustomer,
  getShopToCustomer,
  getDeliveryRoute,
  reverseGeocode,
} = require("../Controllers/googleMapsController");

const router = express.Router();

router.get("/reverse-geocode", reverseGeocode);
router.get("/delivery-route/:orderId", authAnyUser, getDeliveryRoute);
router.get("/captain-to-shop/:shopId", authCaptain, getCaptainToShop);
router.get("/captain-to-customer/:orderId", authCaptain, getCaptainToCustomer);
router.get("/shop-to-customer/:orderId", authShopOwner, getShopToCustomer);

module.exports = router;
