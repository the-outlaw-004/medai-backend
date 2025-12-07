const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const {
  createUser,
  findByEmail,
  findByUserId,
} = require("../services/userService");
const {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const { deleteByUserId } = require("../services/refreshTokenService");
const requireAuth = require("../middleware/auth");
const router = express.Router();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || 12, 10);
const ACCESS_TOKEN_EXPIRES = parseInt(
  process.env.ACCESS_TOKEN_EXPIRES || "900",
  10
);
const REFRESH_TOKEN_EXPIRES =
  parseInt(process.env.REFRESH_TOKEN_EXPIRES || "604800", 10) * 1000;

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many login attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and Password required" });
    const found = await findByEmail(email);
    if (found) {
      return res.status(409).json({ error: "Email already exists" });
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, hashed);
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and Password required" });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid Credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid Credentials" });

    const payload = { userId: user.id, email: user.email };
    // const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    //   expiresIn: parseInt(ACCESS_TOKEN_EXPIRES),
    // });
    const accessToken = generateAccessToken(payload);

    const refreshToken = generateRefreshToken(payload);

    await storeRefreshToken(user.id, refreshToken);

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_EXPIRES,
    });

    res.json({ accessToken, expiresIn: ACCESS_TOKEN_EXPIRES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;

    if (!token) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
    });

    return res.json({
      accessToken: newAccessToken,
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.body.id;
    const user = await findByUserId(userId);

    return res.json(user.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;

    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const userId = payload.userId;
        if (userId) {
          // remove all refresh tokens for user (simple revocation strategy)
          await deleteByUserId(userId);
        }
      } catch (error) {}
    }

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
