const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS);

const refreshExpiry =
  parseInt(process.env.REFRESH_TOKEN_EXPIRES || "604800", 10) * 1000;

const ACCESS_TOKEN_EXPIRY = convertSecondsToJwtFormat(
  process.env.ACCESS_TOKEN_EXPIRES
);
const REFRESH_TOKEN_EXPIRY = convertSecondsToJwtFormat(
  process.env.REFRESH_TOKEN_EXPIRES
);

module.exports = {
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  },

  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  },

  async storeRefreshToken(userId, token) {
    const hashed = await bcrypt.hash(token, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + refreshExpiry);
    await db.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)",
      [userId, hashed, expiresAt]
    );
  },

  verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  },
};

function convertSecondsToJwtFormat(sec) {
  if (sec % 86400 === 0) return `${sec / 86400}d`;
  if (sec % 3600 === 0) return `${sec / 3600}h`;
  if (sec % 60 === 0) return `${sec / 60}m`;
  return `${sec}s`;
}
