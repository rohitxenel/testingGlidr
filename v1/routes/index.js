const router = require("express").Router();
const user = require("./user")
const driver = require("./driver")
const Admin = require("./Admin")
const message = require("./message")





router.use("/user" , user)
router.use("/driver" , driver)
router.use("/admin" , Admin)
router.use("/msg" , message)





module.exports = router;

