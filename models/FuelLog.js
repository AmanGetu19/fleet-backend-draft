const mongoose = require("mongoose");

const FuelLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      driverName: {
        type: String,
        required: true,
      },
    },
    kmReading: {
      type: Number,
      required: true,
    },
    fuelAmount: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    refillDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    kmPerLiter: {
      type: Number,
      default: null, // Will be calculated after approval
    },
  },
  { timestamps: true }
);

const FuelLog = mongoose.model("FuelLog", FuelLogSchema);
module.exports = FuelLog;
