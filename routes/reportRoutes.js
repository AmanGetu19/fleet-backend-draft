const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Trip = require("../models/Trips");
const FuelLog = require("../models/FuelLog");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle"); // ✅ Import Vehicle model
const Report = require("../models/Report"); // ✅ Import Report model

// 📊 Driver Performance Report with kmPerLiter Data
router.get("/driver/:driverId", auth, adminAuth, async (req, res) => {
  try {
    const driver = await User.findById(req.params.driverId);
    if (!driver || driver.role !== "driver") {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Count total trips by driver
    const totalTrips = await Trip.countDocuments({
      driver: req.params.driverId,
    });

    // Sum total fuel consumption by driver
    const totalFuelUsed = await FuelLog.aggregate([
      { $match: { "driver.driverId": driver._id, status: "approved" } },
      { $group: { _id: null, totalFuel: { $sum: "$fuelAmount" } } },
    ]);

    // Get kmPerLiter data for graph
    const kmPerLiterData = await FuelLog.find(
      { "driver.driverId": driver._id, status: "approved" },
      { refillDate: 1, kmPerLiter: 1 }
    ).sort({ refillDate: 1 }); // Sorted by date for graph visualization

    // Calculate average kmPerLiter
    const validKmPerLiterEntries = kmPerLiterData.filter(
      (log) => log.kmPerLiter !== null
    );
    const avgKmPerLiter =
      validKmPerLiterEntries.length > 0
        ? validKmPerLiterEntries.reduce((sum, log) => sum + log.kmPerLiter, 0) /
          validKmPerLiterEntries.length
        : 0;

    // Count maintenance requests by driver
    const totalMaintenanceRequests = await MaintenanceRequest.countDocuments({
      driver: req.params.driverId,
    });

    res.json({
      driver: driver.name,
      totalTrips,
      totalFuelUsed: totalFuelUsed[0] ? totalFuelUsed[0].totalFuel : 0,
      totalMaintenanceRequests,
      avgKmPerLiter,
      kmPerLiterData, // Data for the graph
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📊 Vehicle Performance Report
router.get("/vehicle/:vehicleId", auth, adminAuth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Calculate total KM driven (sum of differences between kmReadings)
    const totalKmDriven = await FuelLog.aggregate([
      { $match: { vehicle: vehicle._id, status: "approved" } },
      { $sort: { refillDate: 1 } },
      {
        $group: {
          _id: "$vehicle",
          totalKm: { $sum: { $subtract: ["$kmReading", "$prevKmReading"] } },
        },
      },
    ]);

    // Get total fuel used
    const totalFuelUsed = await FuelLog.aggregate([
      { $match: { vehicle: vehicle._id, status: "approved" } },
      { $group: { _id: null, totalFuel: { $sum: "$fuelAmount" } } },
    ]);

    const totalFuel = totalFuelUsed.length > 0 ? totalFuelUsed[0].totalFuel : 0;
    const totalKm = totalKmDriven.length > 0 ? totalKmDriven[0].totalKm : 0;

    // Calculate average KM per liter
    let avgKmPerLiter = totalFuel > 0 ? totalKm / totalFuel : 0;

    // Count maintenance requests for vehicle
    const totalMaintenance = await MaintenanceRequest.countDocuments({
      vehicle: req.params.vehicleId,
    });

    res.json({
      vehicle: vehicle.plateNumber,
      totalKmDriven: totalKm,
      totalFuelUsed: totalFuel,
      avgKmPerLiter,
      totalMaintenance,
    });
  } catch (err) {
    console.error(err); // Log the exact error for debugging
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
