const cron = require("node-cron");
const Vehicle = require("../models/Vehicle");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Schedule: Runs once per day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  console.log("Checking for vehicles due for maintenance...");

  try {
    const today = new Date();

    // Find vehicles that haven't had maintenance in the last 4 months
    const overdueVehicles = await Vehicle.find({
      lastMaintenanceDate: {
        $lte: new Date(today.setMonth(today.getMinutes() - 2)),
      },
    });

    for (const vehicle of overdueVehicles) {
      if (vehicle.assignedDriver.driverId) {
        // Notify the assigned driver
        await Notification.create({
          recipient: vehicle.assignedDriver.driverId,
          message: `Your assigned vehicle (${vehicle.plateNumber}) is due for scheduled maintenance.`,
          type: "maintenance",
        });

        console.log(
          `Notification sent to driver for vehicle: ${vehicle.plateNumber}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking maintenance schedule:", error);
  }
});
