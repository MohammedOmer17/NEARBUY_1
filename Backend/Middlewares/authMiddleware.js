const CustomerModel = require('../models/CustomerModel');
const jwt = require('jsonwebtoken');
const blackListTokenModel = require('../models/blackListTokenModel');
const ShopOwner = require('../models/ShopOwnerModel');
const Captain = require('../models/CaptainModel');

module.exports.authCustomer = async (req, res, next) => {
    const token =
        req.cookies?.customer_token ||
        req.headers['x-customer-token'] ||
        (req.headers['x-role'] === 'customer' ? req.headers.authorization?.split(' ')[1] : null) ||
        req.cookies?.token ||
        req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized'
        });
    }

    try {
        const isBlacklisted = await blackListTokenModel.exists({
            token: token
        });

        if (isBlacklisted) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.role && decoded.role !== 'customer') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const customer = await CustomerModel.findById(decoded._id || decoded.id);

        if (!customer) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.customer = customer;
        req.user = customer;

        next();
    } catch (err) {
        return res.status(401).json({
            message: 'Unauthorized'
        });
    }
};

module.exports.authShopOwner = async (req, res, next) => {
    const token =
        req.cookies?.owner_token ||
        req.headers['x-owner-token'] ||
        (req.headers['x-role'] === 'owner' ? req.headers.authorization?.split(' ')[1] : null) ||
        req.cookies?.token ||
        req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
        const isBlacklisted = await blackListTokenModel.exists({ token });
        if (isBlacklisted) {
            return res.status(401).json({ message: 'Token has been revoked' });
        }

        if (decoded.role && decoded.role !== 'shopOwner') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const shopOwner = await ShopOwner.findById(decoded._id || decoded.id);
        if (!shopOwner) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = shopOwner;
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports.authCaptain = async (req, res, next) => {
    const token =
        req.cookies?.captain_token ||
        req.headers['x-captain-token'] ||
        (req.headers['x-role'] === 'captain' ? req.headers.authorization?.split(' ')[1] : null) ||
        req.cookies?.token ||
        req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    if (decoded.role && decoded.role !== 'captain') {
        return res.status(401).json({ success: false, message: 'Unauthorized captain access' });
    }

    try {
        const isBlacklisted = await blackListTokenModel.exists({ token });
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: 'Token has been revoked' });
        }

        const captain = await Captain.findById(decoded._id || decoded.id);
        if (!captain) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!captain.isActive) {
            return res.status(403).json({ success: false, message: 'Captain account is inactive' });
        }

        req.user = captain;
        req.captain = captain;
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports.authAnyUser = async (req, res, next) => {
    const candidates = [
        req.cookies?.customer_token,
        req.cookies?.owner_token,
        req.cookies?.captain_token,
        req.headers['x-customer-token'],
        req.headers['x-owner-token'],
        req.headers['x-captain-token'],
        req.cookies?.token,
        req.headers.authorization?.split(' ')[1],
    ].filter(Boolean);

    if (candidates.length === 0) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    for (const token of candidates) {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            continue;
        }

        try {
            const isBlacklisted = await blackListTokenModel.exists({ token });
            if (isBlacklisted) continue;

            const customer = await CustomerModel.findById(decoded._id || decoded.id);
            if (customer) {
                req.user = customer;
                req.customer = customer;
                req.userRole = 'customer';
                return next();
            }

            const shopOwner = await ShopOwner.findById(decoded._id || decoded.id);
            if (shopOwner) {
                req.user = shopOwner;
                req.userRole = 'shopOwner';
                return next();
            }

            const captain = await Captain.findById(decoded._id || decoded.id);
            if (captain) {
                req.user = captain;
                req.captain = captain;
                req.userRole = 'captain';
                return next();
            }
        } catch {
            continue;
        }
    }

    return res.status(401).json({ success: false, message: 'Unauthorized' });
};