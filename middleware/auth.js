const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header("Authorization");

  // Check if token exists
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = decoded.user; // Attach user data to request object
    next(); // Proceed to the next middleware
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
};
