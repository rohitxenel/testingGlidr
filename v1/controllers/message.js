const Model = require("../../models/mongo");
const Queries = require("../../queries/mongo/DBQueries");
const FireQuery = require("../../queries/firestore/operations");
const { broadcast } = require("../../connections/firebase");
const { setPassword, authenticatePassword } = require("../../common/password")
const { sendOtp, verifyCode } = require('../../services/sendPhoneOtp')
const { sendEmail } = require('../../services/email')
const Auth = require("../../common/authenticate");
const functions = require("../../common/functions");
const Redisquery = require("../../queries/redis/query");
const { redis } = require("googleapis/build/src/apis/redis");
const { order } = require('./bookride')
const PubNub = require("../../common/pubnub");
const { sendNotification } = require('../../connections/firebase')

module.exports.RideChat = async (req, res, next) => {
  try {
    const { senderId, receiverId, rideId, message } = req?.body;
    if (!senderId || !receiverId || !rideId || !message) return res.error(400, "All field required")
    const messageData = {
      receiverId,
      senderId,
      message,
      status: "message"
    }
    const addmessage = await Redisquery.storeRideChatMessage(rideId, messageData)
    await PubNub.publishMessage(receiverId, messageData);

    let receiverData =
      (await Model.Driver.findOne({ _id: receiverId }, { fcmToken: 1 })) ||
      (await Model.User.findOne({ _id: receiverId }, { fcmToken: 1 }));
    console.log("Receiver Data:", receiverData);
    if (!receiverData || !receiverData.fcmToken) {
      console.log("Receiver FCM token not found for ID:", receiverId);
    } else {
      console.log("Sending notification to FCM token:", receiverData.fcmToken);
      await sendNotification(
        receiverData?.fcmToken,
        "💬 New Message",
        message
      );
    }
    return res.success("message Sent Successfully", messageData)
  } catch (error) {
    next(error);
  }
};

module.exports.GetCHat = async (req, res, next) => {
  try {
    const { rideId } = req?.query;
    if (!rideId) return res.error(400, "Ride Id  required")
    const addmessage = await Redisquery.getRideChatMessages(rideId)
    return res.success("message get Successfully", addmessage)
  } catch (error) {
    next(error);
  }
};