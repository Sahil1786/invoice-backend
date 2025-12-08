const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");
const upload = require("../utils/multer");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const cloudinary = require("../utils/cloudinary");

router.post("/categories/:companyName",authToken, async (req, res) => {
  try {
    const { companyName } = req.params;
    const {
      category_name,
      description,
      image_url,
      show_online,
      parent_id
    } = req.body;

 
    const [company] = await db.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

 
    const [result] = await db.execute(
      `INSERT INTO api_product_categories 
      (company_name, category_name, description, image_url, show_online, parent_id)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [companyName, category_name, description, image_url, show_online, parent_id]
    );

    res.json({
      message: "Category created successfully",
      category_id: result.insertId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/categories/:companyName",authToken, async (req, res) => {
  try {
    const { companyName } = req.params;

  
    const [company] = await db.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

  
    const [categories] = await db.execute(
      "SELECT * FROM api_product_categories WHERE company_name = ?",
      [companyName]
    );

    res.json(categories);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




router.post("/product-service/:companyName",authToken, async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { companyName } = req.params;

    const {
      type,
      name,
      description,
      selling_price,
      purchase_price,
      price_includes_tax,
      primary_unit,
      additional_info,
      hsn_sac,
      barcode,
      category_id,
      image_url,
      opening_quantity,
      opening_purchase_price,
      opening_stock_value,

  
      discount_type,
      discount_value,
      low_stock_alert_at,
      show_online,
      not_for_sale
    } = req.body;

    await conn.beginTransaction();


    const [company] = await conn.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

  
const [result] = await conn.execute(
  `INSERT INTO api_product_services 
  (company_name, type, name, description, selling_price, purchase_price, price_includes_tax,
   primary_unit, additional_info, hsn_sac, barcode, category_id, image_url,
   opening_quantity, opening_purchase_price, opening_stock_value)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    companyName,
    type,
    name,
    description || null,
    selling_price,
    purchase_price,
    price_includes_tax,
    primary_unit,
    additional_info,
    hsn_sac,
    barcode,
    category_id,
    image_url,
    opening_quantity,
    opening_purchase_price,
    opening_stock_value
  ]
);

    const productServiceId = result.insertId;

   
    await conn.execute(
      `INSERT INTO api_product_service_custom_fields 
      (product_service_id, discount_type, discount_value, low_stock_alert_at, show_online, not_for_sale)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productServiceId,
        discount_type,
        discount_value,
        low_stock_alert_at,
        show_online,
        not_for_sale
      ]
    );

    await conn.commit();

    res.json({
      message: "Product/Service created successfully",
      id: productServiceId
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  }
});



router.get("/product-service/:companyName",authToken, async (req, res) => {
  try {
    const { companyName } = req.params;

 
    const [company] = await db.execute(
      "SELECT id FROM company_profile WHERE company_name = ?",
      [companyName]
    );

    if (company.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }


    const [data] = await db.execute(
      `SELECT 
          ps.*, 

          -- Category details
          cat.category_name,
          cat.description AS category_description,
          cat.image_url AS category_image,

          -- Custom settings
          cf.discount_type,
          cf.discount_value,
          cf.low_stock_alert_at,
          cf.show_online,
          cf.not_for_sale

      FROM api_product_services ps

      LEFT JOIN api_product_categories cat
        ON ps.category_id = cat.id

      LEFT JOIN api_product_service_custom_fields cf
        ON ps.id = cf.product_service_id

      WHERE ps.company_name = ?`,
      [companyName]
    );

    res.status(200).json({ data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});






module.exports=router;