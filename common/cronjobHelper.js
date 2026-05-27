const moment = require("moment-timezone");
const { addOneTimeJob } = require("./scheduleRide");

async function scheduleRide(orderId, userId, date, time, minutesBefore = 2) {
  const runAt = moment.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata")
    .subtract(minutesBefore, "minutes")
    .toDate();

  console.log("📅 Scheduling ride for:", runAt);

  const result = await addOneTimeJob(`ride_${orderId}`, runAt, { orderId, userId });
  return result;
}

module.exports = { scheduleRide };
