// realtime/event.js
"use strict";
const { Server } = require("socket.io");

let io;
const ROOM = (id) => `user:${String(id)}`;

function initRealtime(
  server,
  { origins = "*", allowPolling = false } = {}
) {
  if (io) return io;

  io = new Server(server, {
    transports: allowPolling ? ["websocket", "polling"] : ["websocket"],
    cors: { origin: origins, methods: ["GET", "POST"], credentials: true },
    pingInterval: 20_000,
    pingTimeout: 25_000,
    maxHttpBufferSize: 1e6,
  });


  // No auth: trust userId if provided in handshake; otherwise wait for "join"
  io.use((socket, next) => {
    const { userId } = socket.handshake.auth || socket.handshake.query || {};
    if (userId) {
      socket.userId = String(userId);
    }
    next();
  });

  io.on("connection", (socket) => {
      console.log(" Client connected:", socket.id, "reason:");

    socket.on("disconnect", (reason) => {
      console.log("❌ Client disconnected:", socket.id, "reason:", reason);
    });

    socket.on("error", (err) => {
      console.error("⚠️ Socket error:", socket.id, err);
    });

    const joinRoom = (uid) => {
      const id = String(uid);
      if (!id) return;
      if (socket.data.joined) {
        return;
      }
      socket.userId = id;
      socket.join(ROOM(id));
      socket.data.joined = true;
    };

    // If userId came via handshake, join immediately
    if (socket.userId) {
      joinRoom(socket.userId);
    }

    // Or allow client to join after connect
    socket.on("join", (uid, ack) => {
      if (!uid) {
        return ack?.({ ok: false, error: "userId-required" });
      }
      joinRoom(uid);
      ack?.({ ok: true, room: ROOM(uid) });
    });

    // Optional echo, like your PubNub round-trip
    socket.on("send_event", (payload) => {
      socket.emit("receive_event", {
        text: "✅ Backend received your event",
        receivedPayload: payload,
        timestamp: new Date().toISOString(),
      });
    });
  });

  return io;
}

async function publishMessage(userId, msg) {
  if (!io) throw new Error("Socket.IO not initialized");
  io.to(ROOM(userId)).emit("receive_event", {
    text: msg,
    timestamp: new Date().toISOString(),
  });
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initRealtime, publishMessage, getIO };
