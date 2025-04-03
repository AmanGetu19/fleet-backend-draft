const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    plateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    model: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    assignedDriver: {
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      driverName: {
        type: String,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["Active", "In Maintenance"],
      default: "Active",
    },
    lastMaintenanceDate: {
      type: Date,
      default: null,
    }, // New field to track last maintenance
  },
  { timestamps: true }
);

const Vehicle = mongoose.model("Vehicle", VehicleSchema);
module.exports = Vehicle;
