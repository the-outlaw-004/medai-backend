const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail } = require("../services/userService");
const router = express.Router();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || 12, 10);
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || 900; // 15 min
const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "this_is_secret";

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and Password required" });
    const found = await findByEmail(email);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(email, hashed);
    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and Password required" });

    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid Credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid Credentials" });

    const payload = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: parseInt(ACCESS_TOKEN_EXPIRES),
    });
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
