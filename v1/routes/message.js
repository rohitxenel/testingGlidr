const express = require("express");
const controller = require("../controllers")
const router = express.Router();
const { verify } = require("../../common/authenticate")

const uploadFields = [
  { name: "issueImage", maxCount: 1 },
  { name: "brandLogo", maxCount: 1 },
  { name: "trademark", maxCount: 1 },
  { name: "ItemImage", maxCount: 1 },
];
const { configureUpload } = require("../../common/uploadfile");
// ----------------------------Authentication-----------------------------------//

router.post('/chat',  controller.Message.RideChat);
router.get('/get-chat',  controller.Message.GetCHat);


module.exports = router;