const express = require("express");
const router = express.Router();
const Trip = require("../models/Trips");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Notification = require("../models/Notification");

// 🚗 Department Head Requests a Trip
router.post("/request", auth, async (req, res) => {
  if (req.user.role !== "department_head") {
    return res
      .status(403)
      .json({ message: "Only Department Heads can request trips." });
  }

  const { tripDate, destination, reason } = req.body;

  try {
    const trip = new Trip({
      requestedBy: req.user.id,
      tripDate,
      destination,
      reason,
    });

    await trip.save();

    // Notify Admin of a new trip request
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        recipient: admin._id,
        message: `New trip request from ${req.user.name}.`,
        type: "trip",
      });
    }

    res
      .status(201)
      .json({ message: "Trip request submitted successfully", trip });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Admin Approves/Rejects a Trip & Assigns a Vehicle & Driver
router.put("/approve/:id", auth, adminAuth, async (req, res) => {
  const { status, vehicleId, driverId } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (status === "approved") {
      if (!vehicleId || !driverId) {
        return res
          .status(400)
          .json({
            message: "Vehicle and Driver must be assigned when approving.",
          });
      }

      // Validate assigned driver is actually a driver
      const driver = await User.findById(driverId);
      if (!driver || driver.role !== "driver") {
        return res.status(400).json({ message: "Invalid driver assignment" });
      }

      trip.vehicle = vehicleId;
      trip.driver = driverId;

      // Notify the assigned driver
      await Notification.create({
        recipient: driverId,
        message: "You have been assigned to a new trip.",
        type: "trip",
      });
    }

    trip.status = status;
    await trip.save();

    // Notify the Department Head about approval/rejection
    await Notification.create({
      recipient: trip.requestedBy,
      message: `Your trip request has been ${status}.`,
      type: "trip",
    });

    res.json({ message: `Trip ${status} successfully`, trip });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📋 View All Trips (Admins See All, Department Heads See Their Own)
router.get("/all", auth, async (req, res) => {
  try {
    let trips;
    if (req.user.role === "admin") {
      trips = await Trip.find().populate(
        "requestedBy vehicle driver",
        "name email plateNumber"
      );
    } else {
      trips = await Trip.find({ requestedBy: req.user.id }).populate(
        "vehicle driver",
        "name email plateNumber"
      );
    }

    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
