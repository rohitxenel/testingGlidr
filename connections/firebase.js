const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase initialized for notifications");
}

async function sendNotification(deviceToken, title, body, data = {}) {
  try {
    const message = {
      token: deviceToken,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    return
  }
}


module.exports = { sendNotification };