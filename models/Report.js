const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["driver", "vehicle"],
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === "driver";
      },
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: function () {
        return this.type === "vehicle";
      },
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    totalFuelUsed: {
      type: Number,
      default: 0,
    },
    totalMaintenanceRequests: {
      type: Number,
      default: 0,
    },
    avgKmPerLiter: {
      type: Number,
      default: 0,
    },
    kmPerLiterData: [
      {
        refillDate: Date,
        kmPerLiter: Number,
      },
    ],
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", ReportSchema);
module.exports = Report;
