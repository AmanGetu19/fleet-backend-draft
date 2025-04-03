const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const tripRoutes = require("./routes/tripsRoutes");
const userRoutes = require("./routes/userRoutes");
const fuelRoutes = require("./routes/fuelRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
require("./utils/maintenanceScheduler"); // Import the maintenance scheduler
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

// Load environment variables
dotenv.config();

// Create an Express app
const app = express();
app.use(cors());

// Middleware to parse JSON
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/users", userRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/feedback", feedbackRoutes);

// Connect to MongoDB
mongoose;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Define a simple route
app.get("/", (req, res) => {
  res.send("Welcome to the Fleet Management API!");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Email User:", process.env.EMAIL_USER);
  console.log("Email Pass:", process.env.EMAIL_PASS ? "Loaded" : "Not Loaded");
});
