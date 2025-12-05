const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");



// main company

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


// other detais 

router.get("/other-details/:company_name", async (req, res) => {
  try {
    const companyName = req.params.company_name;

    const [company] = await db.execute(
      "SELECT * FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }


    const [details] = await db.execute(
      `
      SELECT *
      FROM other_details
      WHERE company_name = ?
      ORDER BY id DESC
      `,
      [companyName]
    );

    return res.status(200).json({
      company: companyName,
      total_records: details.length,
      data: details
    });

  } catch (err) {
    console.error("other-details GET error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/other-details/:company_name", async (req, res) => {
  try {
    const companyName = req.params.company_name;

    const { invoice_date, due_date, reference } = req.body;


    const [company] = await db.execute(
      "SELECT * FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }


    await db.execute(
      `
      INSERT INTO other_details
      (company_name, invoice_date, due_date, reference)
      VALUES (?, ?, ?, ?)
      `,
      [
        companyName,
        invoice_date || null,
        due_date || null,
        reference || null
      ]
    );

   
    const [saved] = await db.execute(
      `
      SELECT *
      FROM other_details
      WHERE company_name = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [companyName]
    );

    return res.status(200).json({
      message: "Other details created successfully",
      data: saved[0]
    });

  } catch (err) {
    console.error("other-details POST error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
