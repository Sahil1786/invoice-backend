const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");
const upload = require("../utils/multer");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const cloudinary = require("../utils/cloudinary");



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
      rcm_enabled,
      tcs_enabled,
      tcs_data,
      tds_enabled,
      tds_data
    } = req.body;

    if (!corp_id) {
      return res.status(400).json({ error: "corp_id (company param) is required" });
    }

    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }

    const sql = `
      INSERT INTO api_customers
      (
        customer_name,
        corp_id,
        phone,
        email,
        gst,
        company,
        opening_balance,
        balance_type,
        current_balance,
        rcm_enabled,
        tcs,
        tcs_data,
        tds,
        tds_data
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      rcm_enabled ? 1 : 0,
      tcs_enabled ? "1" : "0",  
      tcs_data || null,
      tds_enabled ? "1" : "0",   
      tds_data || null
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

router.post("/shipping-address/:company_name",authToken, async (req, res) => {
  try {
    const companyName = req.params.company_name;

    const {
      country,
      title,
      address_line1,
      address_line2,
      pincode,
      city,
      state_name,
      notes
    } = req.body;

   
    const [customer] = await db.execute(
      "SELECT * FROM api_customers WHERE company = ?",
      [companyName]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: "Company not found in customers table" });
    }

  
    await db.execute(
      `
      INSERT INTO api_shipping_address
      (country, title, company_name, address_line1, address_line2, pincode, city, state_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        country,
        title,
        companyName,
        address_line1,
        address_line2,
        pincode,
        city,
        state_name,
        notes
      ]
    );


    const [newAddress] = await db.execute(
      "SELECT * FROM api_shipping_address WHERE company_name = ? ORDER BY id DESC LIMIT 1",
      [companyName]
    );

    return res.status(200).json({
      message: "Shipping address added successfully",
      
    });

  } catch (err) {
    console.error("shipping-address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/billing-address/:company_name", async (req, res) => {
  try {
    const companyName = req.params.company_name;

    const {
      country,
      address_line1,
      address_line2,
      pincode,
      city,
      state_name
    } = req.body;


    const [customer] = await db.execute(
      "SELECT * FROM api_customers WHERE company = ?",
      [companyName]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: "Company not found in customers table" });
    }


    await db.execute(
      `
      INSERT INTO api_billing_address
      (company_name, country, address_line1, address_line2, pincode, city, state_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        companyName,
        country,
        address_line1,
        address_line2,
        pincode,
        city,
        state_name
      ]
    );


    const [newBilling] = await db.execute(
      "SELECT * FROM api_billing_address WHERE company_name = ? ORDER BY id DESC LIMIT 1",
      [companyName]
    );

    return res.status(200).json({
      message: "Billing address added successfully",
     
    });

  } catch (err) {
    console.error("billing-address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


router.get("/billing-address/:company_name",authToken, async (req, res) => {
  try {
    const companyName = req.params.company_name;


    const [customer] = await db.execute(
      "SELECT * FROM api_customers WHERE company = ?",
      [companyName]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }


    const [billing] = await db.execute(
      "SELECT * FROM api_billing_address WHERE company_name = ? ORDER BY id DESC",
      [companyName]
    );

    return res.status(200).json({
      count: billing.length,
      data: billing
    });

  } catch (err) {
    console.error("billing-address GET error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/shipping-address/:company_name",authToken, async (req, res) => {
  try {
    const companyName = req.params.company_name;

  
    const [customer] = await db.execute(
      "SELECT * FROM api_customers WHERE company = ?",
      [companyName]
    );

    if (customer.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    
    const [addresses] = await db.execute(
      "SELECT * FROM api_shipping_address WHERE company_name = ? ORDER BY id DESC",
      [companyName]
    );

    return res.status(200).json({
      count: addresses.length,
      data: addresses
    });

  } catch (err) {
    console.error("shipping-address GET error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});





router.post(
  "/more-data/:company_name",
  upload.single("profile_image"),authToken,
  async (req, res) => {
    try {
      const companyName = req.params.company_name;

      const {
        discount_percent,
        price_list,
        pan_number,
        notes,
        tags,
        cc_emails
      } = req.body;

      let imageUrl = null;

    
      if (req.file) {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          "customer_profiles"
        );

        imageUrl = uploadResult.secure_url;
      }

      await db.execute(
        `
        INSERT INTO api_customer_preferences
        (company_name, discount_percent, price_list, pan_number, profile_image_url, notes, tags, cc_emails)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          companyName,
          discount_percent || null,
          price_list || null,
          pan_number || null,
          imageUrl,
          notes || null,
          tags || null,
          cc_emails || null
        ]
      );

      return res.status(200).json({ message: "Preferences saved successfully" });

    } catch (err) {
      console.error("customer-preferences error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);



router.get("/more-data/:corp_id",authToken, async (req, res) => {
  try {
    const corp_id = req.params.corp_id;

    // 1️⃣ Verify customer exists using corp_id
    const [customer] = await db.execute(
      "SELECT * FROM api_customers WHERE corp_id = ?",
      [corp_id]
    );

    if (customer.length === 0) {
      return res.status(404).json({ error: "Customer not found for given corp_id" });
    }

    // 2️⃣ Fetch preferences where company_name == corp_id (string compare)
    const [preferences] = await db.execute(
      `
      SELECT *
      FROM api_customer_preferences
      WHERE company_name = ?
      ORDER BY id DESC
      `,
      [String(corp_id)]   // convert to string to match VARCHAR field
    );

    return res.json({
      corp_id,
      customer_name: customer[0].customer_name,
      total_records: preferences.length,
      data: preferences
    });

  } catch (err) {
    console.error("customer-preferences GET error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;
