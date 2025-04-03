const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Notification = require("../models/Notification");
const User = require("../models/User"); // Import the User model

// 📩 Public user submits feedback
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const admin = await User.findOne({ role: "admin" });
    const feedback = new Feedback({ name, email, message });
    await feedback.save();

    // Notify admin
    const notification = new Notification({
      user: null, // Admin notification
      message: `New feedback received from ${name}`,
      recipient: admin._id,
      type: "feedback",
      // Specify recipient (update this based on your Notification model)
      message: `New feedback received from ${name}`,
    });
    await notification.save();

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Error submitting feedback:", err); // 🔍 Logs error details
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 📬 Admin views feedback
router.get("/", auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 📨 Admin responds to feedback
router.put("/:id/respond", auth, adminAuth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback)
      return res.status(404).json({ message: "Feedback not found" });

    feedback.response = req.body.response;
    feedback.status = "responded";
    await feedback.save();

    res.json({ message: "Response sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
