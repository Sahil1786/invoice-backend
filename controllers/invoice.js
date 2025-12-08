const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");
const upload = require("../utils/multer");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const cloudinary = require("../utils/cloudinary");


router.post("/invoice/:companyName/:customerId", authToken, async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { companyName, customerId } = req.params;
    const { items = [], additional_charges = [], total_tax = 0, grand_total = 0 } = req.body;

    await conn.beginTransaction();


    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }


    const [customerCheck] = await conn.execute(
      `SELECT id FROM api_customers WHERE id = ? AND company = ?`,
      [customerId, companyName]
    );

    if (!customerCheck.length) {
      return res.status(404).json({ error: "Customer not found for this company" });
    }


    if (!items.length) {
      return res.status(400).json({ error: "Invoice must contain at least 1 item" });
    }


    const [details] = await conn.execute(
      `SELECT invoice_date, due_date, reference
       FROM other_details
       WHERE company_name = ?
       ORDER BY id DESC LIMIT 1`,
      [companyName]
    );

    if (!details.length) {
      return res.status(404).json({ error: "Invoice settings not found" });
    }

    const { invoice_date, due_date, reference } = details[0];

    let subtotal = 0;
    let total_discount = 0;

    for (const item of items) {
      const amount = Number(item.quantity) * Number(item.unit_price);

      let discount_amount = 0;

      if (item.discount_type === "percentage") {
        discount_amount = (amount * Number(item.discount_value)) / 100;
      } else if (item.discount_type === "amount") {
        discount_amount = Number(item.discount_value);
      }

      subtotal += amount - discount_amount;
      total_discount += discount_amount;
    }


    const additional_charges_total = additional_charges.reduce(
      (sum, ch) => sum + Number(ch.amount_with_tax || 0),
      0
    );


    const [invoice] = await conn.execute(
      `INSERT INTO api_invoice
      (company_name, customer_id, invoice_number, invoice_date, due_date, reference,
       subtotal, total_discount, total_tax, additional_charges, grand_total)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyName,
        customerId,
        invoice_date,
        due_date,
        reference,
        subtotal,
        total_discount,
        total_tax,
        additional_charges_total,
        grand_total
      ]
    );

    const invoice_id = invoice.insertId;


    for (const item of items) {
      const amount = Number(item.quantity) * Number(item.unit_price);

      const discount_amount =
        item.discount_type === "percentage"
          ? (amount * Number(item.discount_value)) / 100
          : Number(item.discount_value);

      const line_total = amount - discount_amount;

      await conn.execute(
        `INSERT INTO api_invoice_items 
        (invoice_id, product_service_id, product_name, category_id, category_name,
         hsn_sac, quantity, unit, unit_price, discount_type, discount_value, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_id,
          item.product_service_id,
          item.product_name,
          item.category_id,
          item.category_name,
          item.hsn_sac,
          item.quantity,
          item.unit,
          item.unit_price,
          item.discount_type,
          item.discount_value,
          line_total
        ]
      );
    }


    for (const ch of additional_charges) {
      await conn.execute(
        `INSERT INTO api_invoice_additional_charges
        (invoice_id, charge_name, amount, tax_percent, amount_with_tax)
        VALUES (?, ?, ?, ?, ?)`,

        [
          invoice_id,
          ch.charge_name,
          ch.amount,
          ch.tax_percent,
          ch.amount_with_tax
        ]
      );
    }


    await conn.commit();

    res.json({
      message: "Invoice created successfully",
      invoice_id,
      customer_id: customerId
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;