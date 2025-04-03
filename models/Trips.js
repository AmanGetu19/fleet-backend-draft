const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null, // Assigned later by Admin
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Assigned later by Admin
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    tripDate: {
      type: Date,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", TripSchema);
module.exports = Trip;
