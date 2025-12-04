const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");



router.post("/customerData/:corp_id", authToken, async (req, res) => {
  try {
  
    const corp_id = req.params.corp_id;

    const {
      customer_name,
      phone,
      email,
      gst,
      companyName,   
      opening_balance,
      balance_type,
      rcm_enabled
    } = req.body;

    if (!corp_id) {
      return res.status(400).json({ error: "corp_id (company param) is required" });
    }

    if (!companyName) {
      return res.status(400).json({ error: "companyName (customer company) is required" });
    }

 
    const sql = `
      INSERT INTO api_customers
      (customer_name, corp_id, phone, email, gst, company, opening_balance, balance_type, current_balance, rcm_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const current_balance = opening_balance;

    await db.execute(sql, [
      customer_name,
      corp_id,       
      phone,
      email,
      gst,
      companyName,    
      opening_balance,
      balance_type,
      current_balance,
      rcm_enabled ? 1 : 0
    ]);

    res.json({ message: "Customer created successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



router.get("/customerData/:company_name", authToken, async (req, res) => {
  try {
    const { company_name } = req.params;

    
    const [companyRows] = await db.execute(
      "SELECT company_name FROM company_profile WHERE company_name = ?",
      [company_name]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ error: "Company not found" });
    }

    
    const [rows] = await db.execute(
      "SELECT * FROM api_customers WHERE corp_id = ? ORDER BY id DESC",
      [company_name]
    );

   

    res.json({
      company: company_name,
      total_customers: rows.length,
      customers: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
