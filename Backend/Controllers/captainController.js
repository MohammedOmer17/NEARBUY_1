const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Captain = require("../models/CaptainModel");
const Order = require("../models/Order");
const blackListTokenModel = require("../models/blackListTokenModel");
const notificationService = require("../services/notificationService");
const paymentService = require("../services/paymentService");
const localityService = require("../services/localityService");
const { emitToUser, emitToRole, emitToOrder } = require("../services/socketService");
const { calculateHaversineDistanceKm } = require("../services/localityService");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]+$/;
const validVehicleTypes = ["bike", "scooter", "car", "other"];
const validAvailabilityStatuses = ["offline", "available", "busy"];

const normalizeServiceAreas = (areas) => {
  if (!Array.isArray(areas)) return [];
  const seen = new Set();
  const result = [];

  for (const item of areas) {
    if (!item) continue;
    let localityId = "";
    let name = "";
    let zone = "";
    let sublocalities = [];
    let latitude = null;
    let longitude = null;

    if (typeof item === "string") {
      const reg = localityService.findLocalityById(item) || localityService.resolveLocalityFromAddress(item);
      if (reg) {
        localityId = reg.id;
        name = reg.name;
        zone = reg.zone;
        sublocalities = reg.sublocalities;
        latitude = reg.latitude;
        longitude = reg.longitude;
      } else {
        localityId = item.trim().toLowerCase().replace(/\s+/g, "-");
        name = item.trim();
      }
    } else if (typeof item === "object") {
      const idCandidate = item.localityId || item.id || item.name;
      const reg =
        localityService.findLocalityById(idCandidate) ||
        localityService.resolveLocalityFromAddress(item.name || idCandidate);
      if (reg) {
        localityId = reg.id;
        name = reg.name;
        zone = reg.zone;
        sublocalities = reg.sublocalities;
        latitude = reg.latitude;
        longitude = reg.longitude;
      } else {
        localityId = String(item.localityId || item.id || item.name || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-");
        name = String(item.name || item.localityId || "").trim();
        zone = String(item.zone || "").trim();
        sublocalities = Array.isArray(item.sublocalities) ? item.sublocalities : [];
        latitude = Number(item.latitude) || null;
        longitude = Number(item.longitude) || null;
      }
    }

    if (localityId && !seen.has(localityId)) {
      seen.add(localityId);
      result.push({
        localityId,
        name,
        zone,
        sublocalities,
        latitude,
        longitude,
      });
    }
  }

  return result;
};

const validateLocationPayload = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, message: "Latitude and longitude must be valid numbers" };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, message: "Latitude must be between -90 and 90" };
  }

  if (lng < -180 || lng > 180) {
    return { valid: false, message: "Longitude must be between -180 and 180" };
  }

  return {
    valid: true,
    location: {
      latitude: lat,
      longitude: lng,
    },
  };
};

const safeCaptainResponse = (captain) => {
  if (!captain) {
    return null;
  }

  return captain.toJSON ? captain.toJSON() : { ...captain };
};

const normalizeVehicle = (vehicle) => {
  const safeVehicle = {
    type: "other",
    model: "",
    number: "",
  };

  if (!vehicle || typeof vehicle !== "object") {
    return safeVehicle;
  }

  if (typeof vehicle.type === "string" && validVehicleTypes.includes(vehicle.type)) {
    safeVehicle.type = vehicle.type;
  }

  if (typeof vehicle.model === "string") {
    safeVehicle.model = vehicle.model.trim();
  }

  if (typeof vehicle.number === "string") {
    safeVehicle.number = vehicle.number.trim();
  }

  return safeVehicle;
};

const registerCaptain = async (req, res) => {
  const { name, email, phone, password, vehicle } = req.body;

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Name is required" });
  }

  if (typeof email !== "string" || email.trim() === "" || !emailPattern.test(email.trim())) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });
  }

  if (typeof phone !== "string" || phone.trim() === "" || !phonePattern.test(phone.trim()) || !/\d/.test(phone.trim())) {
    return res.status(400).json({ success: false, message: "Please provide a valid phone number" });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
  }

  try {
    const existingCaptain = await Captain.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }],
    });

    if (existingCaptain) {
      const duplicateField = existingCaptain.email.toLowerCase() === email.trim().toLowerCase() ? "email" : "phone";
      return res.status(409).json({
        success: false,
        message: duplicateField === "email"
          ? "Captain with this email already exists"
          : "Captain with this phone already exists",
      });
    }

    const normalizedVehicle = normalizeVehicle(vehicle);

    const captain = await Captain.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      vehicle: normalizedVehicle,
    });

    const token = jwt.sign({ _id: captain._id, role: "captain" }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const cookieOpts = {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    };
    res.cookie("token", token, cookieOpts);
    res.cookie("captain_token", token, cookieOpts);

    return res.status(201).json({
      success: true,
      message: "Captain registered successfully",
      token,
      captain: safeCaptainResponse(captain),
    });
  } catch (error) {
    console.error("Captain registration failed:", error);
    return res.status(500).json({ success: false, message: "Unable to register Captain" });
  }
};

const loginCaptain = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || email.trim() === "") {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  if (typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({ success: false, message: "Password is required" });
  }

  if (!emailPattern.test(email.trim())) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });
  }

  try {
    const captain = await Captain.findOne({ email: email.trim().toLowerCase() }).select("+password");

    if (!captain) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordValid = await captain.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!captain.isActive) {
      return res.status(403).json({ success: false, message: "Captain account is inactive" });
    }

    const token = jwt.sign({ _id: captain._id, role: "captain" }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const cookieOpts = {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    };
    res.cookie("token", token, cookieOpts);
    res.cookie("captain_token", token, cookieOpts);

    return res.status(200).json({
      success: true,
      message: "Captain logged in successfully",
      token,
      captain: safeCaptainResponse(captain),
    });
  } catch (error) {
    console.error("Captain login failed:", error);
    return res.status(500).json({ success: false, message: "Unable to log in" });
  }
};

const logoutCaptain = async (req, res) => {
  const token = req.cookies?.captain_token || req.cookies?.token || req.headers.authorization?.split(" ")[1];
  const cookieOpts = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  try {
    if (token) {
      await blackListTokenModel.create({ token }).catch(() => {});
    }

    res.clearCookie("token", cookieOpts);
    res.clearCookie("captain_token", cookieOpts);

    return res.status(200).json({ success: true, message: "Captain logged out successfully" });
  } catch (error) {
    console.error("Captain logout failed:", error);
    return res.status(500).json({ success: false, message: "Unable to log out" });
  }
};

const getCaptainProfile = async (req, res) => {
  try {
    const captain = await Captain.findById(req.user._id);

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    return res.status(200).json({ success: true, captain: safeCaptainResponse(captain) });
  } catch (error) {
    console.error("Fetch captain profile failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve captain profile" });
  }
};

const updateCaptainProfile = async (req, res) => {
  const { name, phone, vehicle } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Name cannot be empty" });
    }
    updates.name = name.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== "string" || phone.trim() === "" || !phonePattern.test(phone.trim()) || !/\d/.test(phone.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid phone number" });
    }
    updates.phone = phone.trim();
  }

  if (vehicle !== undefined) {
    const normalizedVehicle = normalizeVehicle(vehicle);
    updates.vehicle = normalizedVehicle;
  }

  if (req.body.serviceAreas !== undefined) {
    updates.serviceAreas = normalizeServiceAreas(req.body.serviceAreas);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: "No profile fields to update" });
  }

  try {
    const captain = await Captain.findById(req.user._id);

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    if (updates.phone) {
      const existingCaptain = await Captain.findOne({ phone: updates.phone, _id: { $ne: captain._id } });
      if (existingCaptain) {
        return res.status(409).json({ success: false, message: "Captain with this phone already exists" });
      }
    }

    Object.assign(captain, updates);
    await captain.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      captain: safeCaptainResponse(captain),
    });
  } catch (error) {
    console.error("Captain profile update failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update captain profile" });
  }
};

const getCaptainServiceAreas = async (req, res) => {
  try {
    const captain = await Captain.findById(req.user._id);
    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    return res.status(200).json({
      success: true,
      serviceAreas: captain.serviceAreas || [],
      availableLocalities: localityService.getAllLocalities(),
    });
  } catch (error) {
    console.error("Fetch service areas failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve service areas" });
  }
};

const updateCaptainServiceAreas = async (req, res) => {
  const { serviceAreas } = req.body;

  if (!Array.isArray(serviceAreas)) {
    return res.status(400).json({ success: false, message: "serviceAreas must be an array" });
  }

  try {
    const captain = await Captain.findById(req.user._id);
    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    const normalized = normalizeServiceAreas(serviceAreas);
    captain.serviceAreas = normalized;
    await captain.save();

    return res.status(200).json({
      success: true,
      message: "Service areas updated successfully",
      serviceAreas: captain.serviceAreas,
    });
  } catch (error) {
    console.error("Update service areas failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update service areas" });
  }
};

const changeCaptainPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || currentPassword.trim() === "") {
    return res.status(400).json({ success: false, message: "Current password is required" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
  }

  try {
    const captain = await Captain.findById(req.user._id).select("+password");

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    const isCurrentPasswordValid = await captain.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from the current password" });
    }

    captain.password = newPassword;
    await captain.save();

    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (token) {
      await blackListTokenModel.create({ token }).catch(() => {});
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Captain password change failed:", error);
    return res.status(500).json({ success: false, message: "Unable to change password" });
  }
};

const updateCaptainAvailability = async (req, res) => {
  const { availabilityStatus } = req.body;

  if (!availabilityStatus || !validAvailabilityStatuses.includes(availabilityStatus)) {
    return res.status(400).json({
      success: false,
      message: "Availability status must be one of: offline, available, busy",
    });
  }

  try {
    const captain = await Captain.findById(req.user._id);

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    captain.availabilityStatus = availabilityStatus;
    await captain.save();

    return res.status(200).json({
      success: true,
      message: "Availability status updated successfully",
      availabilityStatus: captain.availabilityStatus,
    });
  } catch (error) {
    console.error("Captain availability update failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update availability status" });
  }
};

const ensureDeliveryOrderAccess = async (req, res, orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return { error: res.status(400).json({ success: false, message: "Invalid order ID" }) };
  }

  const order = await Order.findById(orderId)
    .populate("customer", "name phone")
    .populate("shop", "shopName address contact");

  if (!order) {
    return { error: res.status(404).json({ success: false, message: "Order not found" }) };
  }

  if (String(order.captain) !== String(req.user._id)) {
    return { error: res.status(403).json({ success: false, message: "You are not authorized to manage this delivery" }) };
  }

  if (order.fulfillmentType !== "delivery") {
    return { error: res.status(400).json({ success: false, message: "This order is not a delivery order" }) };
  }

  return { order };
};

const getAvailableDeliveries = async (req, res) => {
  try {
    const captain = await Captain.findById(req.user._id);
    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    // Unassigned delivery orders awaiting fulfillment
    const orders = await Order.find({
      fulfillmentType: "delivery",
      captain: null,
      orderStatus: { $in: ["placed", "accepted", "preparing", "ready"] },
    })
      .sort({ createdAt: -1 })
      .populate("shop", "shopName address location contact")
      .lean();

    const availableOrders = [];

    for (const order of orders) {
      const isEligible = localityService.isOrderCoveredByCaptain(order, captain);
      if (!isEligible) {
        continue;
      }

      const { pickupLocality, deliveryLocality } = localityService.resolveOrderLocalities(order);

      // Estimated distance if coordinates available
      let estimatedDistanceKm = null;
      if (captain.location?.latitude && order.shop?.location?.latitude) {
        estimatedDistanceKm = Number(
          calculateHaversineDistanceKm(
            captain.location.latitude,
            captain.location.longitude,
            order.shop.location.latitude,
            order.shop.location.longitude
          ).toFixed(1)
        );
      } else if (order.shop?.location?.latitude && order.deliveryLocation?.latitude) {
        estimatedDistanceKm = Number(
          calculateHaversineDistanceKm(
            order.shop.location.latitude,
            order.shop.location.longitude,
            order.deliveryLocation.latitude,
            order.deliveryLocation.longitude
          ).toFixed(1)
        );
      }

      availableOrders.push({
        _id: order._id,
        orderId: order._id,
        shopName: order.shop?.shopName || "Nearby Kirana",
        shopAddress: order.shop?.address || "",
        shopLocality: pickupLocality?.name || "Hyderabad",
        deliveryLocality: deliveryLocality?.name || "Hyderabad",
        totalAmount: order.totalAmount,
        itemsCount: order.items?.length || 0,
        fulfillmentType: order.fulfillmentType,
        orderStatus: order.orderStatus,
        paymentMethod: order.payment?.method || "cod",
        estimatedDistanceKm,
        createdAt: order.createdAt,
      });
    }

    return res.status(200).json({
      success: true,
      deliveries: availableOrders,
      totalCount: availableOrders.length,
    });
  } catch (error) {
    console.error("Fetch available deliveries failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve available deliveries" });
  }
};

const acceptDelivery = async (req, res) => {
  const { orderId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  try {
    const captain = await Captain.findById(req.user._id);
    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    if (!captain.isActive) {
      return res.status(403).json({ success: false, message: "Captain account is inactive" });
    }

    // Atomic database update prevents race conditions across competing captains
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        fulfillmentType: "delivery",
        captain: null, // CONCURRENCY SAFE: only claims if still unassigned
        orderStatus: { $in: ["placed", "accepted", "preparing", "ready"] },
      },
      {
        $set: {
          captain: captain._id,
          "delivery.assignedAt": new Date(),
        },
      },
      { new: true }
    )
      .populate("customer", "name phone")
      .populate("shop", "shopName address contact location owner");

    if (!order) {
      return res.status(409).json({
        success: false,
        message: "Order no longer available or already claimed by another captain",
      });
    }

    // Create persistent notifications for customer, shop owner, and captain
    try {
      await notificationService.notifyCaptainAssigned(order);
      await notificationService.createNotification({
        recipient: order.customer._id || order.customer,
        recipientRole: "customer",
        type: "CAPTAIN_ASSIGNED",
        title: "Captain Assigned",
        message: `${captain.name} has accepted your delivery order.`,
        relatedEntity: { entityType: "Order", entityId: order._id },
      });

      if (order.shop?.owner) {
        await notificationService.createNotification({
          recipient: order.shop.owner,
          recipientRole: "shopOwner",
          type: "CAPTAIN_ASSIGNED",
          title: "Captain Assigned",
          message: `Captain ${captain.name} has claimed delivery for order #${String(order._id).slice(-6).toUpperCase()}.`,
          relatedEntity: { entityType: "Order", entityId: order._id },
        });
      }
    } catch (notifErr) {
      console.error("Assignment notifications failed:", notifErr);
    }

    // Real-time Socket.IO synchronization
    const captainInfo = {
      id: captain._id,
      name: captain.name,
      phone: captain.phone,
      vehicle: captain.vehicle,
      location: captain.location,
    };

    emitToUser(captain._id, "delivery_assigned", { orderId: order._id, order });
    emitToUser(order.customer._id || order.customer, "captain_assigned", { orderId: order._id, captain: captainInfo });
    if (order.shop?.owner) {
      emitToUser(order.shop.owner, "captain_assigned", { orderId: order._id, captain: captainInfo });
    }
    emitToRole("captain", "delivery_claimed", { orderId: order._id });
    emitToOrder(order._id, "captain_assigned", { orderId: order._id, captain: captainInfo });

    return res.status(200).json({
      success: true,
      message: "Delivery mission accepted successfully",
      delivery: order,
    });
  } catch (error) {
    console.error("Accept delivery failed:", error);
    return res.status(500).json({ success: false, message: "Unable to accept delivery" });
  }
};

const getCurrentDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({
      captain: req.user._id,
      fulfillmentType: "delivery",
      orderStatus: { $in: ["placed", "accepted", "preparing", "ready", "picked_up", "out_for_delivery"] },
    })
      .sort({ updatedAt: -1 })
      .populate("customer", "name phone")
      .populate("shop", "shopName address contact location owner");

    return res.status(200).json({
      success: true,
      delivery: order || null,
    });
  } catch (error) {
    console.error("Fetch current delivery failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve current delivery" });
  }
};

const confirmArrivalAtShop = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await ensureDeliveryOrderAccess(req, res, orderId);
    if (result && result.error) {
      return result.error;
    }

    const { order } = result;

    if (order.orderStatus !== "ready") {
      return res.status(400).json({
        success: false,
        message: "This order is not ready for arrival confirmation",
      });
    }

    if (!order.delivery) {
      order.delivery = {};
    }

    order.delivery.arrivedAt = new Date();
    await order.save();

    emitToOrder(order._id, "order_status_updated", {
      orderId: order._id,
      orderStatus: order.orderStatus,
      delivery: order.delivery,
    });
    emitToUser(order.customer?._id || order.customer, "order_status_updated", {
      orderId: order._id,
      orderStatus: order.orderStatus,
      delivery: order.delivery,
    });

    return res.status(200).json({
      success: true,
      message: "Captain confirmed arrival at shop",
      order,
    });
  } catch (error) {
    console.error("Confirm arrival failed:", error);
    return res.status(500).json({ success: false, message: "Unable to confirm arrival at shop" });
  }
};

const confirmPickup = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await ensureDeliveryOrderAccess(req, res, orderId);
    if (result && result.error) {
      return result.error;
    }

    const { order } = result;

    if (order.orderStatus !== "ready") {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status transition",
      });
    }

    const captain = await Captain.findById(req.user._id);
    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    order.orderStatus = "picked_up";
    if (!order.delivery) {
      order.delivery = {};
    }
    order.delivery.pickedUpAt = new Date();

    captain.availabilityStatus = "busy";

    await Promise.all([order.save(), captain.save()]);

    try {
      await notificationService.notifyOrderStatusUpdate(order, "picked_up");
    } catch (notificationError) {
      console.error("Pickup notification failed:", notificationError);
    }

    emitToOrder(order._id, "order_status_updated", {
      orderId: order._id,
      orderStatus: "picked_up",
      delivery: order.delivery,
    });
    emitToUser(order.customer?._id || order.customer, "order_status_updated", {
      orderId: order._id,
      orderStatus: "picked_up",
      delivery: order.delivery,
    });
    if (order.shop?.owner) {
      emitToUser(order.shop.owner, "order_status_updated", {
        orderId: order._id,
        orderStatus: "picked_up",
        delivery: order.delivery,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order picked up successfully",
      order,
    });
  } catch (error) {
    console.error("Confirm pickup failed:", error);
    return res.status(500).json({ success: false, message: "Unable to confirm pickup" });
  }
};

const startDelivery = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await ensureDeliveryOrderAccess(req, res, orderId);
    if (result && result.error) {
      return result.error;
    }

    const { order } = result;

    if (order.orderStatus !== "picked_up") {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status transition",
      });
    }

    order.orderStatus = "out_for_delivery";
    if (!order.delivery) {
      order.delivery = {};
    }
    order.delivery.startedAt = new Date();
    await order.save();

    try {
      await notificationService.notifyOrderStatusUpdate(order, "out_for_delivery");
    } catch (notificationError) {
      console.error("Out for delivery notification failed:", notificationError);
    }

    emitToOrder(order._id, "order_status_updated", {
      orderId: order._id,
      orderStatus: "out_for_delivery",
      delivery: order.delivery,
    });
    emitToUser(order.customer?._id || order.customer, "order_status_updated", {
      orderId: order._id,
      orderStatus: "out_for_delivery",
      delivery: order.delivery,
    });
    if (order.shop?.owner) {
      emitToUser(order.shop.owner, "order_status_updated", {
        orderId: order._id,
        orderStatus: "out_for_delivery",
        delivery: order.delivery,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery started successfully",
      order,
    });
  } catch (error) {
    console.error("Start delivery failed:", error);
    return res.status(500).json({ success: false, message: "Unable to start delivery" });
  }
};

const completeDelivery = async (req, res) => {
  const { orderId } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.captain) !== String(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: "You are not authorized to manage this delivery" });
    }

    if (order.fulfillmentType !== "delivery") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "This order is not a delivery order" });
    }

    if (order.orderStatus !== "out_for_delivery") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid delivery status transition" });
    }

    try {
      paymentService.validatePaymentForCompletion(order);
    } catch (paymentError) {
      await session.abortTransaction();
      return res.status(paymentError.statusCode || 400).json({
        success: false,
        message: paymentError.message,
      });
    }

    const captain = await Captain.findById(req.user._id).session(session);
    if (!captain) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    order.orderStatus = "completed";
    order.delivery = order.delivery || {};
    order.delivery.completedAt = new Date();
    captain.availabilityStatus = "available";

    await order.save({ session });
    await captain.save({ session });

    await session.commitTransaction();

    try {
      await notificationService.notifyOrderStatusUpdate(order, "completed");
    } catch (notificationError) {
      console.error("Delivery completion notification failed:", notificationError);
    }

    emitToOrder(order._id, "order_status_updated", {
      orderId: order._id,
      orderStatus: "completed",
      delivery: order.delivery,
    });
    emitToOrder(order._id, "delivery_completed", { orderId: order._id });
    emitToUser(order.customer?._id || order.customer, "order_status_updated", {
      orderId: order._id,
      orderStatus: "completed",
      delivery: order.delivery,
    });
    emitToUser(order.customer?._id || order.customer, "delivery_completed", { orderId: order._id });

    return res.status(200).json({
      success: true,
      message: "Delivery completed successfully",
      order,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Complete delivery failed:", error);
    return res.status(500).json({ success: false, message: "Unable to complete delivery" });
  } finally {
    session.endSession();
  }
};

const getDeliveryHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = req.query.limit !== undefined ? Math.min(100, Math.max(1, Number(req.query.limit))) : null;

    let queryBuilder = Order.find({
      captain: req.user._id,
      fulfillmentType: "delivery",
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("customer", "name phone")
      .populate("shop", "shopName address contact location")
      .lean();

    if (limit) {
      queryBuilder = queryBuilder.skip((page - 1) * limit).limit(limit);
    }

    const orders = await queryBuilder;

    return res.status(200).json({
      success: true,
      deliveries: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Fetch delivery history failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve delivery history" });
  }
};

const getCaptainLocation = async (req, res) => {
  try {
    const captain = await Captain.findById(req.user._id);

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    return res.status(200).json({
      success: true,
      location: captain.location || null,
      locationUpdatedAt: captain.locationUpdatedAt || null,
    });
  } catch (error) {
    console.error("Fetch captain location failed:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve captain location" });
  }
};

const updateCaptainLocation = async (req, res) => {
  const { latitude, longitude } = req.body;
  const validation = validateLocationPayload(latitude, longitude);

  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const captain = await Captain.findById(req.user._id);

    if (!captain) {
      return res.status(404).json({ success: false, message: "Captain not found" });
    }

    captain.location = validation.location;
    captain.locationUpdatedAt = new Date();
    await captain.save();

    // If captain has an active delivery in progress, emit real-time location update to order tracking room
    try {
      const activeOrder = await Order.findOne({
        captain: req.user._id,
        fulfillmentType: "delivery",
        orderStatus: { $in: ["picked_up", "out_for_delivery"] },
      });

      if (activeOrder) {
        emitToOrder(activeOrder._id, "captain_location_updated", {
          orderId: activeOrder._id,
          captain: {
            latitude: validation.location.latitude,
            longitude: validation.location.longitude,
          },
          updatedAt: captain.locationUpdatedAt,
        });
      }
    } catch (locEmitErr) {
      // non-critical socket emission
    }

    return res.status(200).json({
      success: true,
      message: "Captain location updated successfully",
      location: captain.location,
      locationUpdatedAt: captain.locationUpdatedAt,
    });
  } catch (error) {
    console.error("Update captain location failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update captain location" });
  }
};

module.exports = {
  registerCaptain,
  loginCaptain,
  logoutCaptain,
  getCaptainProfile,
  updateCaptainProfile,
  changeCaptainPassword,
  updateCaptainAvailability,
  getCaptainLocation,
  updateCaptainLocation,
  getCaptainServiceAreas,
  updateCaptainServiceAreas,
  getAvailableDeliveries,
  acceptDelivery,
  getCurrentDelivery,
  confirmArrivalAtShop,
  confirmPickup,
  startDelivery,
  completeDelivery,
  getDeliveryHistory,
};
