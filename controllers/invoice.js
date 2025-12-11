const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");
const upload = require("../utils/multer");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const cloudinary = require("../utils/cloudinary");

function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); 
  const random = Math.floor(100000 + Math.random() * 900000); 
  return `INV-${date}-${random}`;
}


router.post("/invoice/:companyName/:customerId", authToken, async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { companyName, customerId } = req.params;
    const {
      items = [],
      additional_charges = [],
      total_tax = 0,
      other_details = {}
    } = req.body;

    await conn.beginTransaction();

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const [customerExists] = await conn.execute(
      `SELECT id FROM api_customers WHERE id = ? AND company = ?`,
      [customerId, companyName]
    );

    if (!customerExists.length) {
      return res.status(404).json({ error: "Customer not found for this company" });
    }

    if (!items.length) {
      return res.status(400).json({ error: "Invoice must contain at least 1 item" });
    }

    // ---------------------------
    // 1️⃣ Insert into other_details
    // ---------------------------
    let other_details_id = null;

    if (other_details.invoice_date && other_details.due_date) {
      const [od] = await conn.execute(
        `INSERT INTO other_details
        (company_name, invoice_date, due_date, reference)
        VALUES (?, ?, ?, ?)`,
        [
          companyName,
          other_details.invoice_date,
          other_details.due_date,
          other_details.reference || null
        ]
      );

      other_details_id = od.insertId;
    } else {
      return res.status(400).json({
        error: "other_details.invoice_date and other_details.due_date are required"
      });
    }

    // ---------------------------
    // 2️⃣ Calculate totals
    // ---------------------------
    let subtotal = 0;
    let total_discount = 0;

    for (const item of items) {
      const amount = Number(item.quantity) * Number(item.unit_price);

      const discount =
        item.discount_type === "percentage"
          ? (amount * Number(item.discount_value)) / 100
          : Number(item.discount_value);

      subtotal += amount - discount;
      total_discount += discount;
    }

    const additional_total = additional_charges.reduce(
      (sum, ch) => sum + Number(ch.amount_with_tax || 0),
      0
    );

    const grand_total = subtotal + additional_total + Number(total_tax);

const invoice_number = generateInvoiceNumber();

const [invoice] = await conn.execute(
  `INSERT INTO api_invoice
  (company_name, customer_id, invoice_number, invoice_date, due_date, reference,
   subtotal, total_discount, total_tax, additional_charges, grand_total)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    companyName,
    customerId,
    invoice_number,                  // <-- use generated number
    other_details.invoice_date,
    other_details.due_date,
    other_details.reference || null,
    subtotal,
    total_discount,
    total_tax,
    additional_total,
    grand_total
  ]
);


    const invoice_id = invoice.insertId;

    // ---------------------------
    // 4️⃣ Insert items (with other_details_id)
    // ---------------------------
    for (const item of items) {
      const amount = Number(item.quantity) * Number(item.unit_price);

      const discount =
        item.discount_type === "percentage"
          ? (amount * Number(item.discount_value)) / 100
          : Number(item.discount_value);

      const final_total = amount - discount;

      await conn.execute(
        `INSERT INTO api_invoice_items
        (invoice_id, product_service_id, product_name, category_id, category_name,
         hsn_sac, quantity, unit, unit_price, discount_type, discount_value, total,
         other_details_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          final_total,
          other_details_id     // <<--- STORED HERE
        ]
      );
    }

    // ---------------------------
    // 5️⃣ Insert additional charges
    // ---------------------------
 for (const ch of additional_charges) {

  const taxAmount = (Number(ch.amount) * Number(ch.tax_percent)) / 100;
  const amount_with_tax = Number(ch.amount) + taxAmount;

  await conn.execute(
    `INSERT INTO api_invoice_additional_charges
    (invoice_id, charge_name, amount, tax_percent, amount_with_tax)
    VALUES (?, ?, ?, ?, ?)`,
    [
      invoice_id,
      ch.charge_name,
      ch.amount,
      ch.tax_percent,
      amount_with_tax
    ]
  );
}

    await conn.commit();

    res.json({
      message: "Invoice created successfully",
      invoice_id,
      other_details_id
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  }
});


router.get("/invoice/:invoiceId", authToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // 1️⃣ Fetch invoice + customer data
    const [invoice] = await db.execute(
      `SELECT inv.*, cust.customer_name, cust.phone, cust.email, cust.gst
       FROM api_invoice inv
       LEFT JOIN api_customers cust ON inv.customer_id = cust.id
       WHERE inv.id = ?`,
      [invoiceId]
    );

    if (!invoice.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const invoiceData = invoice[0];

    // 2️⃣ Fetch invoice items
    const [items] = await db.execute(
      `SELECT ii.*, ps.description, ps.image_url,
              cat.category_name AS full_category_name
       FROM api_invoice_items ii
       LEFT JOIN api_product_services ps ON ii.product_service_id = ps.id
       LEFT JOIN api_product_categories cat ON ii.category_id = cat.id
       WHERE ii.invoice_id = ?`,
      [invoiceId]
    );

    // 3️⃣ Fetch additional charges
    const [charges] = await db.execute(
      `SELECT * FROM api_invoice_additional_charges WHERE invoice_id = ?`,
      [invoiceId]
    );

    // 4️⃣ Fetch other_details only once
    let otherDetails = null;

    if (items.length > 0 && items[0].other_details_id) {
      const [od] = await db.execute(
        `SELECT * FROM other_details WHERE id = ?`,
        [items[0].other_details_id]
      );

      if (od.length) {
        otherDetails = od[0];
      }
    }

    // ----------------------------------------------------
    // 5️⃣ EXCLUDE ALL ID FIELDS (BUT DO NOT DELETE FROM DB OBJECTS)
    // ----------------------------------------------------

    // Invoice (remove id + customer_id)
    const {
      id: invoice_id,
      customer_id,
      ...cleanInvoice
    } = invoiceData;

    // Other details
    let cleanOtherDetails = null;
    if (otherDetails) {
      const { id: od_id, ...rest } = otherDetails;
      cleanOtherDetails = rest;
    }

    // Items (remove all ID references)
    const cleanItems = items.map(item => {
      const {
        id: item_id,
        invoice_id,
        product_service_id,
        category_id,
        other_details_id,
        ...rest
      } = item;

      return rest;
    });

    // Charges (remove id + invoice_id)
    const cleanCharges = charges.map(ch => {
      const { id: ch_id, invoice_id, ...rest } = ch;
      return rest;
    });

    // ----------------------------------------------------
    // 6️⃣ Send Clean Response
    // ----------------------------------------------------
    res.json({
      invoice: cleanInvoice,
      other_details: cleanOtherDetails,
      items: cleanItems,
      additional_charges: cleanCharges
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;