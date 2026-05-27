const { Message } = require("twilio/lib/twiml/MessagingResponse.js");
const { Driver } = require("../../models/mongo/index.js");

module.exports = {
  User : require("./user.js"),
  UserService : require("./userservices.js"),
  Driver : require("./driver.js"),
  driverRide : require("./driverRide.js"),
  Admin : require("./Admin.js"),
  Message : require("./message.js"),
  AdminUser : require("./AdminUserData.js"),
  AdminDriver : require("./AdminDriverData.js"),
  AdminRide : require("./AdminRideData.js"),

};
