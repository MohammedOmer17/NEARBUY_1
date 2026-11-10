const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Shop = require('../models/ShopModel');
const CustomerModel = require('../models/CustomerModel');

const allowedStatuses = ['active', 'inactive', 'suspended'];
const editableFields = ['shopName', 'address', 'latitude', 'longitude', 'contact'];

const getAuthenticatedOwnerId = (req, res) => {
    const ownerId = req.user?._id;
    if (!ownerId) {
        res.status(401).json({ message: 'Authentication required' });
        return null;
    }
    return ownerId;
};

const getMyShop = async (req, res) => {
    const ownerId = getAuthenticatedOwnerId(req, res);
    if (!ownerId) return;

    try {
        const shop = await Shop.findOne({ owner: ownerId });
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found for this owner' });
        }
        return res.status(200).json({ shop });
    } catch (error) {
        console.error('Failed to retrieve owner shop:', error);
        return res.status(500).json({ message: 'Unable to retrieve shop' });
    }
};

const updateMyShop = async (req, res) => {
    const ownerId = getAuthenticatedOwnerId(req, res);
    if (!ownerId) return;

    const updates = {};
    for (const field of ['shopName', 'address', 'contact']) {
        if (Object.hasOwn(req.body, field)) {
            if (typeof req.body[field] !== 'string' || !req.body[field].trim()) {
                return res.status(400).json({ message: `${field} must be a non-empty string` });
            }
            updates[field] = req.body[field].trim();
        }
    }

    for (const field of ['latitude', 'longitude']) {
        if (Object.hasOwn(req.body, field)) {
            if (req.body[field] === null || req.body[field] === undefined ||
                req.body[field] === '' || !Number.isFinite(Number(req.body[field]))) {
                return res.status(400).json({ message: `${field} must be a valid number` });
            }
            updates[`location.${field}`] = Number(req.body[field]);
        }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({
            message: `Provide at least one field to update: ${editableFields.join(', ')}`,
        });
    }

    try {
        const shop = await Shop.findOneAndUpdate(
            { owner: ownerId },
            { $set: updates },
            { new: true, runValidators: true },
        );

        if (!shop) {
            return res.status(404).json({ message: 'Shop not found for this owner' });
        }
        return res.status(200).json({ message: 'Shop updated successfully', shop });
    } catch (error) {
        console.error('Failed to update owner shop:', error);
        return res.status(500).json({ message: 'Unable to update shop' });
    }
};

const getShopById = async (req, res) => {
    const { shopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
        return res.status(400).json({ message: 'Invalid shop ID' });
    }

    try {
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }
        return res.status(200).json({ shop });
    } catch (error) {
        console.error('Failed to retrieve shop:', error);
        return res.status(500).json({ message: 'Unable to retrieve shop' });
    }
};

const updateShopStatus = async (req, res) => {
    const ownerId = getAuthenticatedOwnerId(req, res);
    if (!ownerId) return;

    const { status } = req.body;
    if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: `Status must be one of: ${allowedStatuses.join(', ')}`,
        });
    }

    try {
        const shop = await Shop.findOneAndUpdate(
            { owner: ownerId },
            { $set: { status } },
            { new: true, runValidators: true },
        );

        if (!shop) {
            return res.status(404).json({ message: 'Shop not found for this owner' });
        }
        return res.status(200).json({ message: 'Shop status updated successfully', shop });
    } catch (error) {
        console.error('Failed to update shop status:', error);
        return res.status(500).json({ message: 'Unable to update shop status' });
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
    num !== null && num !== undefined && typeof num === 'number' && Number.isFinite(num) && num >= min && num <= max;

const getNearbyShops = async (req, res) => {
    try {
        const { latitude, longitude, maxDistanceKm } = req.query;
        let lat = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null;
        let lng = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null;
        const maxDist =
            maxDistanceKm !== undefined && Number.isFinite(Number(maxDistanceKm)) && Number(maxDistanceKm) > 0
                ? Number(maxDistanceKm)
                : 30; // default 30 km radius

        // If coordinates not passed in query, fallback to customer profile location if authenticated
        if ((lat === null || lng === null) && (req.cookies?.token || req.headers.authorization)) {
            try {
                const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
                if (token) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const customer = await CustomerModel.findById(decoded._id).select('location');
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
                // Ignore optional auth token extraction failure
            }
        }

        const filter = { status: 'active' };
        const shops = await Shop.find(filter)
            .select('shopName address location contact status paymentDetails')
            .lean();

        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');

        const hasCustomerCoords = lat !== null && lng !== null && isValidCoord(lat, -90, 90) && isValidCoord(lng, -180, 180);

        if (hasCustomerCoords) {
            const rankedShops = shops
                .map((shop) => {
                    const hasShopCoords =
                        shop &&
                        shop.location &&
                        isValidCoord(shop.location.latitude, -90, 90) &&
                        isValidCoord(shop.location.longitude, -180, 180);

                    const distanceKm = hasShopCoords
                        ? Number(
                              calculateHaversineDistanceKm(
                                  lat,
                                  lng,
                                  shop.location.latitude,
                                  shop.location.longitude
                              ).toFixed(2)
                          )
                        : null;

                    return {
                        ...shop,
                        distanceKm,
                    };
                })
                .filter((shop) => shop.distanceKm === null || shop.distanceKm <= maxDist)
                .sort((a, b) => {
                    if (a.distanceKm == null && b.distanceKm == null) return 0;
                    if (a.distanceKm == null) return 1;
                    if (b.distanceKm == null) return -1;
                    return a.distanceKm - b.distanceKm;
                });

            return res.status(200).json({ success: true, count: rankedShops.length, shops: rankedShops });
        }

        const shopsWithoutDist = shops.map((shop) => ({
            ...shop,
            distanceKm: null,
        }));

        return res.status(200).json({ success: true, count: shopsWithoutDist.length, shops: shopsWithoutDist });
    } catch (error) {
        console.error('Failed to retrieve nearby shops:', error);
        return res.status(500).json({ success: false, message: 'Unable to retrieve nearby shops' });
    }
};

module.exports = {
    getMyShop,
    updateMyShop,
    getShopById,
    updateShopStatus,
    getNearbyShops,
    calculateHaversineDistanceKm,
};