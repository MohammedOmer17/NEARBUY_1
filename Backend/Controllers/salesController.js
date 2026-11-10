const Shop = require("../models/ShopModel");
const Order = require("../models/Order");

const allowedPeriods = ["daily", "weekly", "monthly", "all"];

const getOwnerShop = async (req, res) => {
  const ownerId = req.user?._id;

  if (!ownerId) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }

  const shop = await Shop.findOne({ owner: ownerId });

  if (!shop) {
    res.status(404).json({ message: "Shop not found for this owner" });
    return null;
  }

  return shop;
};

const parseDateValue = (value, label) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid ${label}`);
  }

  return parsedDate;
};

// Reusable expression: confirmed revenue orders are NOT cancelled AND are completed OR have confirmed payment
const isConfirmedRevenueCond = {
  $and: [
    { $ne: ["$orderStatus", "cancelled"] },
    {
      $or: [
        { $eq: ["$orderStatus", "completed"] },
        { $eq: ["$payment.status", "paid"] },
      ],
    },
  ],
};

const resolvePeriodWindows = (period, startDate, endDate) => {
  const now = new Date();
  const p = (period || "").toLowerCase();

  if (startDate || endDate) {
    const currentStart = startDate ? parseDateValue(startDate, "startDate") : new Date(0);
    const currentEnd = endDate ? parseDateValue(endDate, "endDate") : now;

    if (currentEnd < currentStart) {
      throw new Error("End date must be greater than or equal to start date");
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(currentStart.getTime() - durationMs);

    return {
      period: "custom",
      current: { start: currentStart, end: currentEnd },
      previous: { start: prevStart, end: prevEnd },
    };
  }

  let currentStart;
  let currentEnd = now;
  let prevStart = null;
  let prevEnd = null;

  if (p === "weekly") {
    // 12-week window with previous 12-week comparison
    currentStart = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
    prevStart = new Date(now.getTime() - 24 * 7 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  } else if (p === "monthly") {
    // 12-month window with previous 12-month comparison
    currentStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 24, 1);
    prevEnd = currentStart;
  } else if (p === "all") {
    currentStart = new Date(0);
    prevStart = null;
    prevEnd = null;
  } else {
    // Default: daily (30-day window with prior 30-day comparison)
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevEnd = currentStart;
  }

  return {
    period: p || "daily",
    current: { start: currentStart, end: currentEnd },
    previous: prevStart ? { start: prevStart, end: prevEnd } : null,
  };
};

const getSalesSummary = async (req, res) => {
  try {
    const shop = await getOwnerShop(req, res);

    if (!shop) {
      return;
    }

    const windows = resolvePeriodWindows(req.query.period, req.query.startDate, req.query.endDate);

    const [currentData, previousData, allTimeData] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            shop: shop._id,
            createdAt: { $gte: windows.current.start, $lte: windows.current.end },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0],
              },
            },
            confirmedOrders: {
              $sum: {
                $cond: [isConfirmedRevenueCond, 1, 0],
              },
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0],
              },
            },
            unpaidOrders: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$orderStatus", "cancelled"] },
                      { $ne: ["$orderStatus", "completed"] },
                      { $ne: ["$payment.status", "paid"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalSales: {
              $sum: {
                $cond: [isConfirmedRevenueCond, "$totalAmount", 0],
              },
            },
          },
        },
      ]),
      windows.previous
        ? Order.aggregate([
            {
              $match: {
                shop: shop._id,
                createdAt: { $gte: windows.previous.start, $lte: windows.previous.end },
              },
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                confirmedOrders: {
                  $sum: {
                    $cond: [isConfirmedRevenueCond, 1, 0],
                  },
                },
                totalSales: {
                  $sum: {
                    $cond: [isConfirmedRevenueCond, "$totalAmount", 0],
                  },
                },
              },
            },
          ])
        : Promise.resolve([]),
      Order.aggregate([
        {
          $match: {
            shop: shop._id,
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            confirmedOrders: {
              $sum: {
                $cond: [isConfirmedRevenueCond, 1, 0],
              },
            },
            totalSales: {
              $sum: {
                $cond: [isConfirmedRevenueCond, "$totalAmount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const cur = currentData[0] || {
      totalOrders: 0,
      completedOrders: 0,
      confirmedOrders: 0,
      cancelledOrders: 0,
      unpaidOrders: 0,
      totalSales: 0,
    };

    const prev = previousData[0] || {
      totalOrders: 0,
      confirmedOrders: 0,
      totalSales: 0,
    };

    const allTime = allTimeData[0] || {
      totalOrders: 0,
      confirmedOrders: 0,
      totalSales: 0,
    };

    const totalOrders = cur.totalOrders || 0;
    const completedOrders = cur.completedOrders || 0;
    const confirmedOrders = cur.confirmedOrders || 0;
    const cancelledOrders = cur.cancelledOrders || 0;
    const unpaidOrders = cur.unpaidOrders || 0;
    const totalSales = Number(cur.totalSales || 0);

    const previousPeriodSales = Number(prev.totalSales || 0);
    const previousPeriodOrders = prev.confirmedOrders || 0;

    let salesGrowthPercent = 0;
    if (previousPeriodSales > 0) {
      salesGrowthPercent = Number((((totalSales - previousPeriodSales) / previousPeriodSales) * 100).toFixed(1));
    } else if (totalSales > 0) {
      salesGrowthPercent = 100;
    }

    let orderGrowthPercent = 0;
    if (previousPeriodOrders > 0) {
      orderGrowthPercent = Number((((confirmedOrders - previousPeriodOrders) / previousPeriodOrders) * 100).toFixed(1));
    } else if (confirmedOrders > 0) {
      orderGrowthPercent = 100;
    }

    const averageOrderValue = confirmedOrders > 0 ? Number((totalSales / confirmedOrders).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      period: windows.period,
      summary: {
        totalSales,
        totalOrders,
        confirmedOrders,
        completedOrders,
        cancelledOrders,
        unpaidOrders,
        averageOrderValue,
        previousPeriodSales,
        previousPeriodOrders,
        salesGrowthPercent,
        orderGrowthPercent,
        lifetimeSales: Number(allTime.totalSales || 0),
        lifetimeOrders: allTime.totalOrders || 0,
        isDevelopmentData: true,
        historicalStatus: prev.totalOrders > 0 ? "sufficient" : "insufficient",
      },
    });
  } catch (error) {
    console.error("Get sales summary failed:", error);

    if (error.message.includes("Invalid")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to fetch sales summary" });
  }
};

const getSalesStatistics = async (req, res) => {
  try {
    const shop = await getOwnerShop(req, res);

    if (!shop) {
      return;
    }

    const windows = resolvePeriodWindows(req.query.period, req.query.startDate, req.query.endDate);

    const [stats, prevStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            shop: shop._id,
            createdAt: { $gte: windows.current.start, $lte: windows.current.end },
          },
        },
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  completedOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$orderStatus", "completed"] }, 1, 0],
                    },
                  },
                  confirmedOrders: {
                    $sum: {
                      $cond: [isConfirmedRevenueCond, 1, 0],
                    },
                  },
                  cancelledOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0],
                    },
                  },
                  unpaidOrders: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $ne: ["$orderStatus", "cancelled"] },
                            { $ne: ["$orderStatus", "completed"] },
                            { $ne: ["$payment.status", "paid"] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  totalSales: {
                    $sum: {
                      $cond: [isConfirmedRevenueCond, "$totalAmount", 0],
                    },
                  },
                  pickupOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$fulfillmentType", "pickup"] }, 1, 0],
                    },
                  },
                  deliveryOrders: {
                    $sum: {
                      $cond: [{ $eq: ["$fulfillmentType", "delivery"] }, 1, 0],
                    },
                  },
                },
              },
            ],
            itemSummary: [
              {
                $match: {
                  orderStatus: { $ne: "cancelled" },
                  $or: [
                    { orderStatus: "completed" },
                    { "payment.status": "paid" },
                  ],
                },
              },
              { $unwind: "$items" },
              {
                $group: {
                  _id: null,
                  totalItemsSold: { $sum: "$items.quantity" },
                },
              },
            ],
          },
        },
      ]),
      windows.previous
        ? Order.aggregate([
            {
              $match: {
                shop: shop._id,
                createdAt: { $gte: windows.previous.start, $lte: windows.previous.end },
              },
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                confirmedOrders: {
                  $sum: {
                    $cond: [isConfirmedRevenueCond, 1, 0],
                  },
                },
                totalSales: {
                  $sum: {
                    $cond: [isConfirmedRevenueCond, "$totalAmount", 0],
                  },
                },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const overview = stats?.[0]?.overview?.[0] || {
      totalOrders: 0,
      completedOrders: 0,
      confirmedOrders: 0,
      cancelledOrders: 0,
      unpaidOrders: 0,
      totalSales: 0,
      pickupOrders: 0,
      deliveryOrders: 0,
    };

    const prevOverview = prevStats?.[0] || {
      totalOrders: 0,
      confirmedOrders: 0,
      totalSales: 0,
    };

    const itemSummary = stats?.[0]?.itemSummary?.[0] || { totalItemsSold: 0 };
    const totalSales = Number(overview.totalSales || 0);
    const confirmedOrders = overview.confirmedOrders || 0;
    const completedOrders = overview.completedOrders || 0;
    const previousPeriodSales = Number(prevOverview.totalSales || 0);

    let salesGrowthPercent = 0;
    if (previousPeriodSales > 0) {
      salesGrowthPercent = Number((((totalSales - previousPeriodSales) / previousPeriodSales) * 100).toFixed(1));
    } else if (totalSales > 0) {
      salesGrowthPercent = 100;
    }

    return res.status(200).json({
      success: true,
      period: windows.period,
      statistics: {
        totalOrders: overview.totalOrders || 0,
        confirmedOrders,
        completedOrders,
        cancelledOrders: overview.cancelledOrders || 0,
        unpaidOrders: overview.unpaidOrders || 0,
        totalSales,
        previousPeriodSales,
        salesGrowthPercent,
        averageOrderValue: confirmedOrders > 0 ? Number((totalSales / confirmedOrders).toFixed(2)) : 0,
        totalItemsSold: itemSummary.totalItemsSold || 0,
        pickupOrders: overview.pickupOrders || 0,
        deliveryOrders: overview.deliveryOrders || 0,
        isDevelopmentData: true,
        historicalStatus: prevOverview.totalOrders > 0 ? "sufficient" : "insufficient",
      },
    });
  } catch (error) {
    console.error("Get sales statistics failed:", error);

    if (error.message.includes("Invalid")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to fetch sales statistics" });
  }
};

const getSalesTrends = async (req, res) => {
  try {
    const shop = await getOwnerShop(req, res);

    if (!shop) {
      return;
    }

    const period = (req.query.period || "daily").toLowerCase();

    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or all." });
    }

    const windows = resolvePeriodWindows(period, req.query.startDate, req.query.endDate);

    const groupExpression =
      period === "daily"
        ? { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        : period === "weekly"
          ? { $dateToString: { format: "%Y-%m-%d", date: { $dateTrunc: { date: "$createdAt", unit: "week", timezone: "UTC" } } } }
          : { $dateToString: { format: "%Y-%m", date: "$createdAt" } };

    const data = await Order.aggregate([
      {
        $match: {
          shop: shop._id,
          createdAt: {
            $gte: windows.current.start,
            $lte: windows.current.end,
          },
          orderStatus: { $ne: "cancelled" },
          $or: [
            { orderStatus: "completed" },
            { "payment.status": "paid" },
          ],
        },
      },
      {
        $group: {
          _id: groupExpression,
          sales: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sales: 1,
          orders: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      period,
      startDate: windows.current.start,
      endDate: windows.current.end,
      data,
    });
  } catch (error) {
    console.error("Get sales trends failed:", error);

    if (error.message.includes("Invalid")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to fetch sales trends" });
  }
};

const getTopSellingProducts = async (req, res) => {
  try {
    const shop = await getOwnerShop(req, res);

    if (!shop) {
      return;
    }

    const windows = resolvePeriodWindows(req.query.period, req.query.startDate, req.query.endDate);
    const rawLimit = Number(req.query.limit ?? 5);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 5;

    const products = await Order.aggregate([
      {
        $match: {
          shop: shop._id,
          createdAt: {
            $gte: windows.current.start,
            $lte: windows.current.end,
          },
          orderStatus: { $ne: "cancelled" },
          $or: [
            { orderStatus: "completed" },
            { "payment.status": "paid" },
          ],
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          unit: { $first: "$items.unit" },
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { quantitySold: -1, revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          product: "$_id",
          name: 1,
          unit: 1,
          quantitySold: 1,
          revenue: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      period: windows.period,
      products,
    });
  } catch (error) {
    console.error("Get top selling products failed:", error);

    if (error.message.includes("Invalid")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to fetch top selling products" });
  }
};

module.exports = {
  getSalesSummary,
  getSalesStatistics,
  getSalesTrends,
  getTopSellingProducts,
};
