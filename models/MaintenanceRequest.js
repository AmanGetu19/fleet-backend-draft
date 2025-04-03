const mongoose = require("mongoose");

const MaintenanceRequestSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["scheduled", "accidental"],
      required: true,
    },
    issueDescription: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    adminResponse: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const MaintenanceRequest = mongoose.model(
  "MaintenanceRequest",
  MaintenanceRequestSchema
);
module.exports = MaintenanceRequest;
