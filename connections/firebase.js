const admin = require("firebase-admin");

function loadFirebaseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing env var: FIREBASE_SERVICE_ACCOUNT");
  }

  // Railway sometimes stores pasted values with surrounding quotes.
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, "");

  // 1) Preferred: base64-encoded JSON
  try {
    const decoded = Buffer.from(cleaned, "base64").toString("utf-8").trim();
    return JSON.parse(decoded);
  } catch (_) {
    // 2) Fallback: raw JSON (not base64)
    return JSON.parse(cleaned);
  }
}

if (!admin.apps.length) {
  const serviceAccount = loadFirebaseServiceAccount();

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
    return;
  }
}


module.exports = { sendNotification };