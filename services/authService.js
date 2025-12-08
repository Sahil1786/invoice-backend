const db = require("../db/db");
const OTPGenerator = require("../utils/OTPGenerator");
const SmsSender = require("../utils/sendSms");
const jwt = require("jsonwebtoken");
const config = require("../config.json");


class AuthService {

  static async sendSignupOtp(mobile) {
    if (!mobile) throw new Error("Mobile is required");

    const [exists] = await db.execute(
      "SELECT id FROM api_user WHERE mobile = ?",
      [mobile]
    );

    if (exists.length > 0) {
      throw new Error("Mobile already registered");
    }

    const otp = OTPGenerator.generate();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.execute(
      "INSERT INTO otp_store (mobile, otp, expires_at) VALUES (?, ?, ?)",
      [mobile, otp, expiresAt]
    );

    await SmsSender.sendOtp(mobile, otp);

    return { message: "Signup OTP sent successfully" };
  }


  static async verifySignupOtp(mobile, otp) {
    const [rows] = await db.execute(
      "SELECT * FROM otp_store WHERE mobile=? ORDER BY id DESC LIMIT 1",
      [mobile]
    );

    if (!rows.length) throw new Error("OTP not sent");

    const record = rows[0];

    if (record.otp.toString() !== otp.toString())
      throw new Error("Invalid OTP");

    if (record.expires_at < Date.now())
      throw new Error("OTP expired");

    return { message: "Signup OTP verified" };
  }


  static async createUser(name, mobile, email) {
    if (!name || !mobile || !email) {
      throw new Error("All fields required");
    }

    const [exists] = await db.execute(
      "SELECT id FROM api_user WHERE mobile = ?",
      [mobile]
    );

    if (exists.length > 0) {
      throw new Error("User already exists");
    }

    const [insert] = await db.execute(
      "INSERT INTO api_user (name, mobile, email, created_at) VALUES (?, ?, ?, NOW())",
      [name, mobile, email]
    );

    return {
      message: "User created successfully",
      user_id: insert.insertId
    };
  }


  static async sendLoginOtp(mobile) {
    if (!mobile) throw new Error("Mobile is required");

    const [user] = await db.execute(
      "SELECT id FROM api_user WHERE mobile = ?",
      [mobile]
    );

    if (user.length === 0) {
      throw new Error("Mobile is not registered");
    }

    const otp = OTPGenerator.generate();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.execute(
      "INSERT INTO otp_store (mobile, otp, expires_at) VALUES (?, ?, ?)",
      [mobile, otp, expiresAt]
    );

    await SmsSender.sendOtp(mobile, otp);

    return { message: "Login OTP sent successfully" };
  }

static async verifyLogin(mobile, otp) {
  const [rows] = await db.execute(
    "SELECT * FROM otp_store WHERE mobile=? ORDER BY id DESC LIMIT 1",
    [mobile]
  );

  if (!rows.length) throw new Error("OTP not sent");

  const record = rows[0];

  if (record.otp.toString() !== otp.toString())
    throw new Error("Invalid OTP");

  if (record.expires_at < Date.now())
    throw new Error("OTP expired");

  const [userRows] = await db.execute(
    "SELECT * FROM api_user WHERE mobile = ?",
    [mobile]
  );

  const user = userRows[0];

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email
    },
    config.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    message: "Login successful",
    token,
    user
  };
}
}

module.exports = AuthService;
