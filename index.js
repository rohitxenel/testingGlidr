"use strict";

const dns = require("dns");

// Google DNS set
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
const express = require("express");
const app = require("./server").expressApp;
const server = require("./server").httServer;
const cors = require("cors");
const bodyParser = require("body-parser");
const connection = require("./connections/mongo");
const { redisdb } = require("./connections/reddis");
const v1Routes = require("./v1/routes");
const { corsOptions } = require("./common/cors");
const rateLimit = require("express-rate-limit");
const responses = require("./common/responses");
const path = require('path');
// require('./cron');
const { initRealtime } = require("./common/pubnub");
const { startRideWorker } = require("./common/scheduleWorker");



const PORT = process.env.PORT || 3030;


app.use(cors(corsOptions));
app.use(responses());
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const apiLimiter = rateLimit({
  windowMs: 1000,
  max: 5,
  message: "Too many attempts from this IP, please try again later.",
});

app.use("/api/v1", v1Routes);

app.use("/", express.static(__dirname + "/public"));

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Origin,X-Requested-With,content-type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});


// 👇 Place this after ALL routes and middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    statusCode,
    status: false,
    message,
    data: {}
  });
});


initRealtime(server, {
  // jwtVerify: async (token) => verify and return userId if you want JWT auth
});


// ✅ Worker logic
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is now running on http://localhost:${PORT}`);
  console.log("Glidr backend start")
  try {
    await connection.mongodb();
    await redisdb();

    // ✅ Worker logic
    await startRideWorker(async (jobData) => {
      console.log("🚖 Ride job triggered:", jobData);

      // Example: Notify driver or update ride status
      const { orderId, userId } = jobData;
      console.log(`📢 Sending ride request for order ${orderId} (user: ${userId})`);

      // You can now call your driver-matching or notification function here
      // e.g., await sendRideRequestToNearestDriver(orderId);
    });

    console.log("🚀 Ride worker running...");
  } catch (err) {
    console.error("Startup connection error:", err);
  }
});
