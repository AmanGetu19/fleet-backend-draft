const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

// Admin can update user roles
router.put("/assign-role/:id", auth, adminAuth, async (req, res) => {
  const { role } = req.body;

  if (!["admin", "driver", "department_head", "public_user"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // console.log("🔍 Current user role:", user.role);
    user.role = role;

    await user.save();
    // console.log("✅ User role updated to:", user.role);

    res.json({ message: "User role updated successfully", user });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
