const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");


router.post("/company", authToken, async (req, res) => {
  try {
    const userMobile = req.user.mobile;  

    if (!userMobile) {
      return res.status(400).json({ error: "Mobile not found in token" });
    }

    const {
      company_name,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      logo_url
    } = req.body;

    const sql = `
      INSERT INTO company_profile
      (company_name, login_id, address_line1, address_line2, city, state, pincode, logo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      company_name,
      userMobile,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      logo_url
    ]);

    res.json({ message: "Company created successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/company", authToken, async (req, res) => {
  try {
    const userMobile = req.user.mobile;

    const sql = `
      SELECT *
      FROM company_profile
      WHERE login_id = ?
      ORDER BY id DESC
    `;

    const [rows] = await db.execute(sql, [userMobile]);

    res.json({
      total: rows.length,
      companies: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
