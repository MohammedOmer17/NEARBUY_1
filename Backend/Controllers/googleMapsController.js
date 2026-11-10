const mongoose = require("mongoose");
const Shop = require("../models/ShopModel");
const Order = require("../models/Order");
const {
  getCaptainToShopRoute,
  getCaptainToCustomerRoute,
  getShopToCustomerRoute,
  reverseGeocodeLocation,
} = require("../services/googleMapsService");

const hasValidCoordinatePair = (location) => {
  return !!location &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude)) &&
    Number(location.latitude) >= -90 &&
    Number(location.latitude) <= 90 &&
    Number(location.longitude) >= -180 &&
    Number(location.longitude) <= 180;
};

const getOrderForCaptain = async (captainId, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const error = new Error("Invalid order ID");
    error.statusCode = 400;
    throw error;
  }

  const order = await Order.findById(orderId).populate("shop", "shopName address location");

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(order.captain) !== String(captainId)) {
    const error = new Error("You are not authorized to access this delivery route");
    error.statusCode = 403;
    throw error;
  }

  if (order.fulfillmentType !== "delivery") {
    const error = new Error("This order is not a delivery order");
    error.statusCode = 400;
    throw error;
  }

  return order;
};

const getCaptainToShop = async (req, res) => {
  const { shopId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    return res.status(400).json({ success: false, message: "Invalid shop ID" });
  }

  try {
    const shop = await Shop.findById(shopId);

    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    let captainLocation = null;
    if (req.query.latitude && req.query.longitude) {
      const qLat = Number(req.query.latitude);
      const qLng = Number(req.query.longitude);
      if (hasValidCoordinatePair({ latitude: qLat, longitude: qLng })) {
        captainLocation = { latitude: qLat, longitude: qLng };
      }
    }
    if (!captainLocation && req.user && hasValidCoordinatePair(req.user.location)) {
      captainLocation = req.user.location;
    }

    if (!hasValidCoordinatePair(captainLocation)) {
      return res.status(400).json({ success: false, message: "Captain GPS location is not available" });
    }

    if (!hasValidCoordinatePair(shop.location)) {
      return res.status(400).json({ success: false, message: "Shop location is not available" });
    }

    const routeData = await getCaptainToShopRoute(captainLocation, shop.location);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${captainLocation.latitude},${captainLocation.longitude}&destination=${shop.location.latitude},${shop.location.longitude}&travelmode=driving`;

    return res.status(200).json({
      success: true,
      data: {
        ...routeData,
        captainLocation,
        shopLocation: {
          name: shop.shopName,
          address: shop.address,
          latitude: shop.location.latitude,
          longitude: shop.location.longitude,
        },
        googleMapsUrl,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to calculate captain to shop route",
    });
  }
};

const getCaptainToCustomer = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await getOrderForCaptain(req.user._id, orderId);

    let captainLocation = null;
    if (req.query.latitude && req.query.longitude) {
      const qLat = Number(req.query.latitude);
      const qLng = Number(req.query.longitude);
      if (hasValidCoordinatePair({ latitude: qLat, longitude: qLng })) {
        captainLocation = { latitude: qLat, longitude: qLng };
      }
    }
    if (!captainLocation && req.user && hasValidCoordinatePair(req.user.location)) {
      captainLocation = req.user.location;
    }

    if (!hasValidCoordinatePair(captainLocation)) {
      return res.status(400).json({ success: false, message: "Captain GPS location is not available" });
    }

    if (!hasValidCoordinatePair(order.deliveryLocation)) {
      return res.status(400).json({ success: false, message: "Order delivery location is not available" });
    }

    const routeData = await getCaptainToCustomerRoute(captainLocation, order.deliveryLocation);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${captainLocation.latitude},${captainLocation.longitude}&destination=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}&travelmode=driving`;

    return res.status(200).json({
      success: true,
      data: {
        ...routeData,
        captainLocation,
        deliveryLocation: {
          address: order.deliveryAddress,
          latitude: order.deliveryLocation.latitude,
          longitude: order.deliveryLocation.longitude,
        },
        shopLocation: order.shop ? {
          name: order.shop.shopName,
          address: order.shop.address,
          latitude: order.shop.location?.latitude,
          longitude: order.shop.location?.longitude,
        } : null,
        googleMapsUrl,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to calculate captain to customer route",
    });
  }
};

const getShopToCustomer = async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(orderId).populate("shop", "owner location shopName address");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.shop.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this order route" });
    }

    if (!hasValidCoordinatePair(order.shop.location)) {
      return res.status(400).json({ success: false, message: "Shop location is not available" });
    }

    if (!hasValidCoordinatePair(order.deliveryLocation)) {
      return res.status(400).json({ success: false, message: "Order delivery location is not available" });
    }

    const routeData = await getShopToCustomerRoute(order.shop.location, order.deliveryLocation);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${order.shop.location.latitude},${order.shop.location.longitude}&destination=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}&travelmode=driving`;

    return res.status(200).json({
      success: true,
      data: {
        ...routeData,
        shopLocation: {
          name: order.shop.shopName,
          address: order.shop.address,
          latitude: order.shop.location.latitude,
          longitude: order.shop.location.longitude,
        },
        deliveryLocation: {
          address: order.deliveryAddress,
          latitude: order.deliveryLocation.latitude,
          longitude: order.deliveryLocation.longitude,
        },
        googleMapsUrl,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to calculate shop to customer route",
    });
  }
};

const getDeliveryRoute = async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(orderId)
      .populate("shop", "shopName address location owner contact")
      .populate("customer", "name phone")
      .populate("captain", "name phone vehicle location locationUpdatedAt");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.fulfillmentType !== "delivery") {
      return res.status(400).json({ success: false, message: "This order is not a delivery order" });
    }

    const userIdStr = String(req.user._id);
    const isCustomer = String(order.customer?._id || order.customer) === userIdStr;
    const isOwner = String(order.shop?.owner) === userIdStr;
    const isCaptain = String(order.captain?._id || order.captain) === userIdStr;

    if (!isCustomer && !isOwner && !isCaptain) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this delivery tracking route",
      });
    }

    // Coordinates check
    let captainLocation =
      order.captain?.location && hasValidCoordinatePair(order.captain.location)
        ? { latitude: order.captain.location.latitude, longitude: order.captain.location.longitude }
        : null;

    // If caller is the captain and provided live GPS in query params, prioritize it
    if (isCaptain && req.query.latitude && req.query.longitude) {
      const qLat = Number(req.query.latitude);
      const qLng = Number(req.query.longitude);
      if (hasValidCoordinatePair({ latitude: qLat, longitude: qLng })) {
        captainLocation = { latitude: qLat, longitude: qLng };
      }
    }

    const shopLocation =
      order.shop?.location && hasValidCoordinatePair(order.shop.location)
        ? {
            name: order.shop.shopName,
            address: order.shop.address,
            contact: order.shop.contact,
            latitude: order.shop.location.latitude,
            longitude: order.shop.location.longitude,
          }
        : null;

    const deliveryLocation =
      order.deliveryLocation && hasValidCoordinatePair(order.deliveryLocation)
        ? {
            name: order.customer?.name || "Customer",
            address: order.deliveryAddress,
            phone: isCaptain || isOwner ? order.customer?.phone : undefined,
            latitude: order.deliveryLocation.latitude,
            longitude: order.deliveryLocation.longitude,
          }
        : null;

    // Determine current active route leg:
    // Before pickup (placed, accepted, preparing, ready): Captain is heading to Shop!
    // After pickup (picked_up, out_for_delivery, completed): Route is to Customer destination!
    const isPrePickup = ["placed", "accepted", "preparing", "ready"].includes(order.orderStatus);
    const activeLeg = isPrePickup ? "captain_to_shop" : "shop_to_customer";
    let routeData = null;
    let googleMapsUrl = "";

    if (isPrePickup) {
      if (captainLocation && shopLocation) {
        try {
          routeData = await getCaptainToShopRoute(captainLocation, shopLocation);
          googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${captainLocation.latitude},${captainLocation.longitude}&destination=${shopLocation.latitude},${shopLocation.longitude}&travelmode=driving`;
        } catch (err) {
          // fallback
        }
      }
    } else {
      // Picked up or out for delivery
      if (captainLocation && deliveryLocation) {
        try {
          routeData = await getCaptainToCustomerRoute(captainLocation, deliveryLocation);
          googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${captainLocation.latitude},${captainLocation.longitude}&destination=${deliveryLocation.latitude},${deliveryLocation.longitude}&travelmode=driving`;
        } catch (err) {
          // fallback
        }
      } else if (shopLocation && deliveryLocation) {
        try {
          routeData = await getShopToCustomerRoute(shopLocation, deliveryLocation);
          googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${shopLocation.latitude},${shopLocation.longitude}&destination=${deliveryLocation.latitude},${deliveryLocation.longitude}&travelmode=driving`;
        } catch (err) {
          // fallback
        }
      }
    }

    // Distance sanity check: Kirana hyperlocal deliveries are within 150 km
    let isOutOfRange = false;
    if (routeData?.distance?.kilometers && routeData.distance.kilometers > 150) {
      isOutOfRange = true;
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderStatus: order.orderStatus,
        activeLeg,
        captain: order.captain
          ? {
              id: order.captain._id,
              name: order.captain.name,
              phone: isCustomer || isOwner ? order.captain.phone : undefined,
              vehicle: order.captain.vehicle,
              location: captainLocation,
              latitude: captainLocation?.latitude,
              longitude: captainLocation?.longitude,
              locationUpdatedAt: order.captain.locationUpdatedAt,
            }
          : null,
        shop: shopLocation,
        deliveryLocation,
        deliveryAddress: isCustomer || isCaptain ? order.deliveryAddress : undefined,
        route: routeData?.route || null,
        distance: !isOutOfRange ? (routeData?.distance || null) : null,
        duration: !isOutOfRange ? (routeData?.duration || null) : null,
        isOutOfRange,
        googleMapsUrl,
        delivery: order.delivery || {},
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to calculate delivery route",
    });
  }
};

const reverseGeocode = async (req, res) => {
  const latitude = req.query.lat ?? req.query.latitude;
  const longitude = req.query.lng ?? req.query.longitude;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude query parameters are required",
    });
  }

  try {
    const data = await reverseGeocodeLocation(Number(latitude), Number(longitude));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to reverse geocode location",
    });
  }
};

module.exports = {
  getCaptainToShop,
  getCaptainToCustomer,
  getShopToCustomer,
  getDeliveryRoute,
  reverseGeocode,
};
