const express = require("express");
const router = express.Router();
const MaintenanceRequest = require("../models/MaintenanceRequest");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User"); // Import User model
const Notification = require("../models/Notification"); // Also missing

// 🚗 Driver Requests Maintenance (Scheduled or Accidental)
router.post("/request", auth, async (req, res) => {
  if (req.user.role !== "driver") {
    return res
      .status(403)
      .json({ message: "Only drivers can request maintenance." });
  }

  const { vehicleId, requestType, issueDescription } = req.body;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const maintenanceRequest = new MaintenanceRequest({
      vehicle: vehicleId,
      driver: req.user.id,
      requestType,
      issueDescription,
      status: "pending",
    });

    await maintenanceRequest.save();

    // Notify Admin of a new maintenance request
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        recipient: admin._id,
        message: `New maintenance request from ${req.user.name}.`,
        type: "maintenance",
      });
    }
    res.status(201).json({
      message: "Maintenance request submitted successfully",
      maintenanceRequest,
    });
  } catch (err) {
    console.error("Maintenance request error:", err); // Log the error
    res.status(500).json({ message: "Server error", error: err.message }); // Send error message
  }
});

// ✅ Admin Approves or Rejects Maintenance Request
router.put("/approve/:id", auth, adminAuth, async (req, res) => {
  const { status, adminResponse } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
    if (!maintenanceRequest) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    maintenanceRequest.status = status;
    if (adminResponse) {
      maintenanceRequest.adminResponse = adminResponse;
    }
    await maintenanceRequest.save();

    // ✅ Send notification to the driver
    await Notification.create({
      recipient: maintenanceRequest.driver._id,
      message: `Your maintenance request for vehicle ${maintenanceRequest.vehicle} has been ${status} by admin.`,
      type: "maintenance",
    });

    if (status === "approved") {
      await Vehicle.findByIdAndUpdate(maintenanceRequest.vehicle, {
        status: "In Maintenance",
      });
    }

    res.json({
      message: `Maintenance request ${status} successfully`,
      maintenanceRequest,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🔧 Mark Maintenance as Completed (Admin Only)
router.put("/complete/:id", auth, adminAuth, async (req, res) => {
  try {
    const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
    if (!maintenanceRequest) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    maintenanceRequest.status = "completed";
    await maintenanceRequest.save();

    await Vehicle.findByIdAndUpdate(maintenanceRequest.vehicle, {
      lastMaintenanceDate: new Date(),
    });

    res.json({
      message: "Maintenance marked as completed",
      maintenanceRequest,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📋 View All Maintenance Requests (Drivers See Their Own, Admins See All)
router.get("/all", auth, async (req, res) => {
  try {
    let maintenanceRequests;
    if (req.user.role === "admin") {
      maintenanceRequests = await MaintenanceRequest.find().populate(
        "vehicle driver",
        "plateNumber name email"
      );
    } else {
      maintenanceRequests = await MaintenanceRequest.find({
        driver: req.user.id,
      }).populate("vehicle", "plateNumber");
    }

    res.json(maintenanceRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🚗 Driver Reports Vehicle is Fixed & Back in Service
router.put("/report-fixed/:id", auth, async (req, res) => {
  try {
    // Check if the user is a driver
    if (req.user.role !== "driver") {
      return res
        .status(403)
        .json({ message: "Only drivers can report fixed vehicles." });
    }

    // Find the maintenance request
    const maintenanceRequest = await MaintenanceRequest.findById(req.params.id);
    if (!maintenanceRequest) {
      return res
        .status(404)
        .json({ message: "Maintenance request not found." });
    }

    // Ensure the maintenance request was approved
    if (maintenanceRequest.status !== "approved") {
      return res
        .status(400)
        .json({ message: "This maintenance request is not approved yet." });
    }

    // Update vehicle status to Active
    const vehicle = await Vehicle.findById(maintenanceRequest.vehicle);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    vehicle.status = "Active";
    await vehicle.save();

    // Mark maintenance request as "Completed"
    maintenanceRequest.status = "completed";
    await maintenanceRequest.save();

    // Notify the Admin that the vehicle is back in service
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        recipient: admin._id,
        message: `Vehicle ${vehicle.plateNumber} has been reported fixed by ${req.user.name}.`,
        type: "maintenance",
      });
    }

    res.json({
      message: `Vehicle ${vehicle.plateNumber} is now back in service.`,
      vehicle,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/all", auth, async (req, res) => {
  try {
    let maintenanceRequests;
    if (req.user.role === "admin") {
      maintenanceRequests = await MaintenanceRequest.find().populate(
        "vehicle driver",
        "plateNumber name email"
      );
    } else if (req.user.role === "driver") {
      maintenanceRequests = await MaintenanceRequest.find({
        $or: [{ driver: req.user.id }, { vehicle: { $exists: true } }],
      }).populate("vehicle", "plateNumber lastMaintenanceDate");
    }

    res.json(maintenanceRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/test-scheduled-maintenance", async (req, res) => {
  try {
    const today = new Date();
    const overdueVehicles = await Vehicle.find({
      lastMaintenanceDate: {
        $lte: new Date(today.setMonth(today.getMonth() - 4)), // Change to 2 min for testing
      },
    });

    for (const vehicle of overdueVehicles) {
      if (vehicle.assignedDriver && vehicle.assignedDriver.driverId) {
        await Notification.create({
          recipient: vehicle.assignedDriver.driverId,
          message: `Your assigned vehicle (${vehicle.plateNumber}) is due for scheduled maintenance.`,
          type: "maintenance",
        });
        console.log(
          `Test Notification Sent to ${vehicle.assignedDriver.driverName}`
        );
      }
    }
    res.json({ message: "Test maintenance check completed" });
  } catch (error) {
    console.error("Error testing maintenance:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
