const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");






router.post("/bank/:company_name", authToken, async (req, res) => {
  try {
    const { company_name } = req.params;

    // 1️⃣ Find company_id
    const [company] = await db.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [company_name]
    );

    if (!company.length) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company_id = company[0].id;

    const {
      account_holder_name,
      account_no,
      confirm_account_no,
      ifsc_code,
      bank_name,
      branch_name,
      upi_id,
      upi_number,
      opening_balance,
      notes,
      is_default
    } = req.body;

    // 2️⃣ Validation: account_no and confirm account must match
    if (account_no !== confirm_account_no) {
      return res.status(400).json({
        error: "Account number and confirm account number do not match"
      });
    }

    // 3️⃣ CHECK if account_no + ifsc_code already exists for this company
    const [existing] = await db.execute(
      `SELECT id FROM api_company_bank_details 
       WHERE company_id = ? AND account_no = ? AND ifsc_code = ?`,
      [company_id, account_no, ifsc_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "This bank account with same IFSC already exists. Cannot create duplicate."
      });
    }

    // 4️⃣ Insert new bank record
    const sql = `
      INSERT INTO api_company_bank_details
      (company_id, account_holder_name, account_no, confirm_account_no,
       ifsc_code, bank_name, branch_name, upi_id, upi_number,
       opening_balance, notes, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      company_id,
      account_holder_name,
      account_no,
      confirm_account_no,
      ifsc_code,
      bank_name,
      branch_name,
      upi_id,
      upi_number,
      opening_balance || 0,
      notes,
      is_default ? 1 : 0
    ]);

    return res.status(201).json({
      message: "Bank details added successfully"
    });

  } catch (err) {
    console.error("BANK INSERT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});



router.get("/bank/:company_name", authToken, async (req, res) => {
  try {
    const { company_name } = req.params;

    const [company] = await db.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [company_name]
    );

    if (!company.length) {
      return res.status(404).json({ error: "Company not found" });
    }

    const company_id = company[0].id;

    const [rows] = await db.execute(
      "SELECT * FROM api_company_bank_details WHERE company_id = ? ORDER BY is_default DESC",
      [company_id]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("BANK GET ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;