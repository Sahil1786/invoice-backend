const express = require('express');
const userRouter=require("../controllers/user");
const createCompanyProfileRouter=require("../controllers/companayProfile");
const customerDataRouter=require("../controllers/customerData");
const productAndServices=require("../controllers/productAndService");
const { log } = require('console');


const router=express.Router();



router.use("/user",userRouter);
router.use("/user",createCompanyProfileRouter);
router.use("/user",customerDataRouter);
router.use("/user",productAndServices);






module.exports=router;