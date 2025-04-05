const express = require("express");
const router = express.Router();
const FuelLog = require("../models/FuelLog");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Vehicle = require("../models/Vehicle");
const Notification = require("../models/Notification");
const User = require("../models/User");

// 📝 Driver Requests Fuel (Only Assigned Driver Can Request)
router.post("/request", auth, async (req, res) => {
  if (req.user.role !== "driver") {
    return res.status(403).json({ message: "Only drivers can request fuel." });
  }

  const { vehicleId, kmReading, fuelAmount, totalCost } = req.body;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // ✅ Convert both `assignedDriver` and `req.user.id` to strings for comparison
    if (
      !vehicle.assignedDriver.driverId ||
      vehicle.assignedDriver.driverId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: "You are not the assigned driver of this vehicle.",
      });
    }

    const driver = await User.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const fuelRequest = new FuelLog({
      vehicle: vehicleId,
      driver: {
        driverId: req.user.id,
        driverName: driver.name,
      },
      kmReading,
      fuelAmount,
      totalCost,
      status: "pending",
    });

    await fuelRequest.save();

    // Notify Admin of a new fuel request
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        recipient: admin._id,
        message: `New fuel request from ${req.user.name}.`,
        type: "fuel",
      });
    }

    res
      .status(201)
      .json({ message: "Fuel request submitted successfully", fuelRequest });
  } catch (err) {
    console.error("Error submitting fuel request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/approve/:id", auth, adminAuth, async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    // ✅ Fetch FuelLog correctly
    const fuelRequest = await FuelLog.findById(req.params.id);
    if (!fuelRequest) {
      return res.status(404).json({ message: "Fuel request not found" });
    }

    if (status === "approved") {
      // ✅ Get last approved fuel log for this vehicle
      const lastFuelLog = await FuelLog.findOne({
        vehicle: fuelRequest.vehicle,
        status: "approved",
        _id: { $ne: fuelRequest._id }, // Exclude the current request
      })
        .sort({ refillDate: -1 })
        .exec();

      let kmPerLiter = null;

      if (lastFuelLog && fuelRequest.kmReading > lastFuelLog.kmReading) {
        const kmDriven = fuelRequest.kmReading - lastFuelLog.kmReading;
        if (kmDriven > 0 && fuelRequest.fuelAmount > 0) {
          kmPerLiter = kmDriven / fuelRequest.fuelAmount;
        }
      }

      fuelRequest.kmPerLiter = kmPerLiter; // Store the calculation
    }

    // ✅ Update fuel request status
    fuelRequest.status = status;
    await fuelRequest.save();

    // ✅ Notify the driver (Fix: Use `driverId`)
    await Notification.create({
      recipient: fuelRequest.driver.driverId, // Corrected
      message: `Your fuel request has been ${status}.`,
      type: "fuel",
    });

    res.json({
      message: `Fuel request ${status} successfully`,
      fuelRequest,
    });
  } catch (err) {
    console.error("Error approving fuel request:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 📊 View Fuel Consumption for a Vehicle (Admin Only)
router.get("/consumption/:vehicleId", auth, adminAuth, async (req, res) => {
  try {
    const fuelLogs = await FuelLog.find({
      vehicle: req.params.vehicleId,
      status: "approved",
    })
      .sort({ refillDate: -1 })
      .select("kmReading fuelAmount kmPerLiter refillDate")
      .exec();

    if (fuelLogs.length === 0) {
      return res
        .status(404)
        .json({ message: "No fuel logs found for this vehicle." });
    }

    res.json({ message: "Fuel consumption data retrieved", fuelLogs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/consumption/:vehicleId", auth, adminAuth, async (req, res) => {
  try {
    const fuelLogs = await FuelLog.find({
      vehicle: req.params.vehicleId,
      status: "approved",
    })
      .sort({ refillDate: -1 })
      .select("kmReading fuelAmount kmPerLiter refillDate driver.driverName")
      .exec();

    if (fuelLogs.length === 0) {
      return res
        .status(404)
        .json({ message: "No fuel logs found for this vehicle." });
    }

    res.json({ message: "Fuel consumption data retrieved", fuelLogs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Admin Approves or Rejects Fuel Request
router.put("/approve/:id", auth, adminAuth, async (req, res) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const fuelRequest = await FuelLog.findById(req.params.id);
    if (!fuelRequest) {
      return res.status(404).json({ message: "Fuel request not found" });
    }

    fuelRequest.status = status;
    await fuelRequest.save();

    // Notify the driver about approval/rejection
    await Notification.create({
      recipient: fuelRequest.driver,
      message: `Your fuel request has been ${status}.`,
      type: "fuel",
    });

    res.json({ message: `Fuel request ${status} successfully`, fuelRequest });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
