const express = require("express");
const router = express.Router();
const db = require("../db/db");             
const { authToken } = require("../middleware/auth");

const cloudinary = require("../utils/cloudinary");




const upload = require("../utils/multer");


// router.post("/company", authToken, upload.single("logo"), async (req, res) => {
//   try {
//     const userMobile = req.user.mobile;

//     const {
//       company_name,
//       organization_name,
//       country,
//       company_phone,
//       company_email,
//       gstin,
//       address_line1,
//       address_line2,
//       city,
//       state,
//       pincode
//     } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ error: "Logo file is required" });
//     }


//     const fileBase64 = req.file.buffer.toString("base64");
//     const dataUri = `data:${req.file.mimetype};base64,${fileBase64}`;

//     const uploadRes = await cloudinary.uploader.upload(dataUri, {
//       folder: "company_logos",
//       resource_type: "auto",
//     });

//     const logo_url = uploadRes.secure_url; // final URL


//     const sql = `
//       INSERT INTO company_profile
//       (company_name, organization_name, country, login_id, company_phone, company_email, gstin,
//        address_line1, address_line2, city, state, pincode, logo_url)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     await db.execute(sql, [
//       company_name,
//       organization_name,
//       country,
//       userMobile,
//       company_phone,
//       company_email,
//       gstin,
//       address_line1,
//       address_line2,
//       city,
//       state,
//       pincode,
//       logo_url
//     ]);

//     return res.status(201).json({
//       message: "Company created successfully",
//       logo_url
//     });

//   } catch (err) {
//     console.error("COMPANY ERROR:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


router.post("/company", authToken, upload.single("logo"), async (req, res) => {
  try {
    const userMobile = req.user.mobile;

    const {
      company_name,
      organization_name,
      country,
      company_phone,
      company_email,
      gstin,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      is_branch // <-- NEW
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    // Upload Logo to Cloudinary
    const fileBase64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${fileBase64}`;

    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: "company_logos",
      resource_type: "auto",
    });

    const logo_url = uploadRes.secure_url;

    // SQL Insert (INCLUDING is_branch)
    const sql = `
      INSERT INTO company_profile
      (company_name, organization_name, country, login_id, company_phone, company_email, gstin,
       address_line1, address_line2, city, state, pincode, logo_url, is_branch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      company_name,
      organization_name,
      country,
      userMobile,
      company_phone,
      company_email,
      gstin,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      logo_url,
      is_branch || 0   
    ]);

    return res.status(201).json({
      message: "Company created successfully",
      logo_url
    });

  } catch (err) {
    console.error("COMPANY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/company", authToken, async (req, res) => {
  try {
    const userMobile = req.user?.mobile;

    if (!userMobile) {
      return res.status(401).json({ error: "Unauthorized: login_id missing" });
    }

    const sql = `
      SELECT id, company_name, organization_name, country, login_id,
             company_phone, company_email, gstin,
             address_line1, address_line2, city, state, pincode, logo_url,
             is_branch, created_at
      FROM company_profile
      WHERE login_id = ?
      ORDER BY id DESC
    `;

    const [rows] = await db.execute(sql, [userMobile]);

    return res.status(200).json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("GET COMPANY ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});




module.exports = router;
