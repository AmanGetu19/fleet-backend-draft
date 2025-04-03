const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const FuelLog = require("../models/FuelLog");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Trip = require("../models/Trips");

// 📊 Fuel Usage Trend (Already Working)
router.get("/fuel-usage", auth, adminAuth, async (req, res) => {
  try {
    const fuelData = await FuelLog.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: { $month: "$refillDate" },
          totalFuel: { $sum: "$fuelAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(fuelData);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📊 Maintenance Trend
router.get("/maintenance-trend", auth, adminAuth, async (req, res) => {
  try {
    const maintenanceData = await MaintenanceRequest.aggregate([
      {
        $group: {
          _id: { $month: "$requestDate" },
          totalRequests: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(maintenanceData);
  } catch (err) {
    console.error(err); // Debugging output
    res.status(500).json({ message: "Server error" });
  }
});

// 📊 Vehicle Usage Trend
router.get("/vehicle-usage", auth, adminAuth, async (req, res) => {
  try {
    const vehicleUsage = await Trip.aggregate([
      {
        $group: {
          _id: { $month: "$tripDate" },
          totalTrips: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(vehicleUsage);
  } catch (err) {
    console.error(err); // Debugging output
    res.status(500).json({ message: "Server error" });
  }
});

//previous

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

module.exports = router;
