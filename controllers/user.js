const express = require("express");
const router = express.Router();
const AuthService = require("../services/authService");


router.post("/signup/send-otp", async (req, res) => {
  try {
    const result = await AuthService.sendSignupOtp(req.body.mobile);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.post("/signup", async (req, res) => {
  try {
    const { name, mobile, email, otp } = req.body;

   
    await AuthService.verifySignupOtp(mobile, otp);

 
    const result = await AuthService.createUser(name, mobile, email);

    res.json(result);

  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.post("/login/send-otp", async (req, res) => {
  try {
    const result = await AuthService.sendLoginOtp(req.body.mobile);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const result = await AuthService.verifyLogin(mobile, otp);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
