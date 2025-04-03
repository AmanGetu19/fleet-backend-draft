const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

// 🚗 Register a Vehicle (Only Admin)
router.post("/register", auth, adminAuth, async (req, res) => {
  const { plateNumber, model, type, assignedDriverId } = req.body;

  try {
    let assignedDriver = null;

    // If a driver is assigned, check if they are already assigned to another vehicle
    if (assignedDriverId) {
      const existingVehicle = await Vehicle.findOne({
        "assignedDriver.driverId": assignedDriverId,
      });
      if (existingVehicle) {
        return res
          .status(400)
          .json({ message: "Driver is already assigned to another vehicle." });
      }

      // Fetch driver details
      const driver = await User.findById(assignedDriverId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      assignedDriver = {
        driverId: driver._id,
        driverName: driver.name,
      };
    }

    // Create the vehicle
    const vehicle = new Vehicle({
      plateNumber,
      model,
      type,
      assignedDriver,
    });

    await vehicle.save();
    res
      .status(201)
      .json({ message: "Vehicle registered successfully", vehicle });
  } catch (err) {
    console.error("Error registering vehicle:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 🚘 Get All Vehicles (Anyone Can View)
router.get("/all", async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate(
      "assignedDriver.driverId",
      "name email"
    );
    const totalVehicles = await Vehicle.countDocuments();

    res.json({ totalVehicles, vehicles });
  } catch (err) {
    console.error("Error fetching vehicles:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔍 Get a Single Vehicle by ID (Anyone Can View)
router.get("/:id", async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(
      "assignedDriver.driverId",
      "name email"
    );
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✏️ Update a Vehicle (Only Admin)
router.put("/update/:id", auth, adminAuth, async (req, res) => {
  const { plateNumber, model, type, assignedDriverId } = req.body;

  try {
    let assignedDriver = null;

    if (assignedDriverId) {
      const existingVehicle = await Vehicle.findOne({
        "assignedDriver.driverId": assignedDriverId,
        _id: { $ne: req.params.id }, // Ensure it's not the same vehicle
      });
      if (existingVehicle) {
        return res
          .status(400)
          .json({ message: "Driver is already assigned to another vehicle." });
      }

      const driver = await User.findById(assignedDriverId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }

      assignedDriver = {
        driverId: driver._id,
        driverName: driver.name,
      };
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { plateNumber, model, type, assignedDriver },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ message: "Vehicle updated successfully", updatedVehicle });
  } catch (err) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑️ Delete a Vehicle (Only Admin)
router.delete("/delete/:id", auth, adminAuth, async (req, res) => {
  try {
    const deletedVehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deletedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
