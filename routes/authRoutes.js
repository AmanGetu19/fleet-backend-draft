const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const Notification = require("../models/Notification");

const router = express.Router();

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📝 User Registration
router.post(
  "/register",
  [
    check("name", "Full Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 8 characters").isLength({
      min: 8,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user (default role: public_user)
      user = new User({
        name,
        email,
        password: hashedPassword,
        role: "public_user",
      });

      await user.save();

      // Notify Admin that a new user registered
      const admin = await User.findOne({ role: "admin" });
      if (admin) {
        await Notification.create({
          recipient: admin._id,
          message: `New user registered: ${name} (${email}). Assign a role if necessary.`,
          type: "user",
        });
      }

      // Generate JWT token
      const payload = { user: { id: user.id, role: user.role } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res.json({ token, id: user.id });
    } catch (err) {
      res.status(500).send("Server error");
    }
  }
);

// 🏠 User Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });

    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, 10);
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    // Send email
    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;
    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click <a href='${resetURL}'>here</a> to reset your password.</p>`,
    });

    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Reset Password Route
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  try {
    const user = await User.findOne({ resetToken: { $exists: true } });
    if (!user || !(await bcrypt.compare(token, user.resetToken))) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      to: "your-email@gmail.com",
      subject: "Test Email",
      text: "This is a test email from Nodemailer.",
    });
    res.json({ message: "Test email sent successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
  }
});

module.exports = router;
