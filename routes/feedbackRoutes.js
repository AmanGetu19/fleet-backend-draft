const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Notification = require("../models/Notification");

// 📩 Public user submits feedback
router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const feedback = new Feedback({ name, email, message });
    await feedback.save();

    // Notify admin
    const notification = new Notification({
      user: null, // Admin notification
      message: `New feedback received from ${name}`,
    });
    await notification.save();

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
