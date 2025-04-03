const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trips");
const FuelLog = require("../models/FuelLog");
const MaintenanceRequest = require("../models/MaintenanceRequest");

// 📊 User Distribution API (Already Exists)
router.get("/user-distribution", auth, adminAuth, async (req, res) => {
  try {
    const totalDrivers = await User.countDocuments({ role: "driver" });
    const totalDepartmentHeads = await User.countDocuments({
      role: "department_head",
    });
    const totalPublicUsers = await User.countDocuments({ role: "public_user" });

    res.json({
      drivers: totalDrivers,
      departmentHeads: totalDepartmentHeads,
      publicUsers: totalPublicUsers,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 📊 🚗 Vehicle Usage Trend API
router.get("/vehicle-usage", auth, adminAuth, async (req, res) => {
  try {
    const vehicleUsage = await Trip.aggregate([
      { $group: { _id: "$vehicle", tripCount: { $sum: 1 } } },
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicleInfo",
        },
      },
      { $unwind: "$vehicleInfo" },
      {
        $project: {
          _id: 0,
          plateNumber: "$vehicleInfo.plateNumber",
          tripCount: 1,
        },
      },
    ]);

    res.json(vehicleUsage);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 📊 ⛽ Fuel Usage Trend API
router.get("/fuel-usage", auth, adminAuth, async (req, res) => {
  try {
    const fuelUsage = await FuelLog.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: {
            month: { $month: "$refillDate" },
            year: { $year: "$refillDate" },
          },
          totalFuel: { $sum: "$fuelAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          totalFuel: 1,
        },
      },
    ]);

    res.json(fuelUsage);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 📊 🔧 Maintenance Trend API
router.get("/maintenance-trend", auth, adminAuth, async (req, res) => {
  try {
    const maintenanceTrend = await MaintenanceRequest.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$requestDate" },
            year: { $year: "$requestDate" },
          },
          totalRequests: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          totalRequests: 1,
        },
      },
    ]);

    res.json(maintenanceTrend);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
