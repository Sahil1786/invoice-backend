const express = require('express');
const userRouter=require("../controllers/user");
const createCompanyProfileRouter=require("../controllers/companayProfile");
const customerDataRouter=require("../controllers/customerData");
const productAndServices=require("../controllers/productAndService");
const invoiceRouter=require("../controllers/invoice");
const accountRouter=require("../controllers/account");



const router=express.Router();



router.use("/user",userRouter);
router.use("/user",createCompanyProfileRouter);
router.use("/user",customerDataRouter);
router.use("/user",productAndServices);
router.use("/user",invoiceRouter);
router.use("/user",accountRouter);






module.exports=router;


