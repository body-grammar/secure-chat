import cors from "cors";
import userRoutes from "./routes/users.js";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import messageRoutes from "./routes/messages.js";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import channelRoutes from "./routes/channels.js";
import Channel from "./models/Channel.js";
import Message from "./models/Message.js";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
});

app.set("io", io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
})

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.join(`user:${socket.user.userId}`);

  socket.on("joinChannel", async (channelId, callback) => {
    try {
      if (typeof channelId !== "string" || !channelId.trim()) {
        return callback?.({ error: "Invalid channel ID" });
      }

      const channel = await Channel.findOne({
        _id: channelId,
        members: socket.user.userId,
      });

      if (!channel) {
        return callback?.({ error: "Channel not found or access denied" });
      }

      socket.join(`channel:${channel._id}`);

      callback?.({ success: true });
      console.log(`Socket ${socket.id} joined channel: ${channel.name}`);
    } catch (error) {
      callback?.({ error: "Failed to join channel" });
    }
  });

  socket.on("sendMessage", async (message) => {
    if (
      !message ||
      typeof message.channel !== "string" ||
      !message.channel.trim() ||
      !message._id ||
      !message.sender
    ) {
      console.warn("Rejected invalid channel message.");
      return;
    }

    const senderId =
      typeof message.sender === "object"
        ? message.sender._id
        : message.sender;

    if (String(senderId) !== String(socket.user.userId)) {
      console.warn("Rejected channel message with mismatched sender.");
      return;
    }

    const roomName = `channel:${message.channel}`;

    try {
      const channelRoom = socket.rooms.has(roomName);

      if (!channelRoom) {
        console.warn("Rejected message from socket outside channel room.");
        return;
      }

      const savedMessage = await Message.findOne({
        _id: message._id,
        sender: socket.user.userId,
        channel: message.channel,
      });

      if (!savedMessage) {
        console.warn("Rejected unverified channel message.");
        return;
      }

      socket.to(roomName).emit("newMessage", savedMessage);
    } catch (error) {
      console.error("Channel message broadcast failed:", error);
    }
  });
  
  socket.on("sendDirectMessage", async (message) => {
    if (
      !message ||
      typeof message.sender !== "string" ||
      !message.recipient ||
      !message._id
    ) {
      console.warn("Rejected direct message with missing fields.");
      return;
    }

    if (String(message.sender) !== String(socket.user.userId)) {
      console.warn("Rejected direct message with mismatched sender.");
      return;
    }

    try {
      const savedMessage = await Message.findOne({
        _id: message._id,
        sender: socket.user.userId,
        recipient: message.recipient,
        channel: { $exists: false },
      });

      if (!savedMessage) {
        console.warn("Rejected unverified direct message.");
        return;
      }

      io.to(`user:${String(savedMessage.recipient)}`).emit(
        "newDirectMessage",
        message
      );
    } catch (error) {
      console.error("Direct message relay failed:", error);
    }
  });

  socket.on("messageStatusUpdate", async ({ messageId, status }) => {
    if (!messageId || !["delivered", "read"].includes(status)) {
      return;
    }

    try {
      const message = await Message.findById(messageId);

      if (
        !message ||
        !message.recipient ||
        message.recipient.toString() !== socket.user.userId
      ) {
        return;
      }

      const rank = { sent: 0, delivered: 1, read: 2 };

      if (rank[status] > rank[message.status]) {
        message.status = status;
        await message.save();
      }

      io.to(`user:${message.sender.toString()}`).emit(
        "messageStatusUpdated",
        {
          messageId: message._id.toString(),
          status: message.status,
        }
      );
    } catch (error) {
      console.error("Failed to update message status:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

const PORT = process.env.PORT || 5001;

app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/channels", channelRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "NEXUS backend is running",
  });
});

connectDB();

httpServer.listen(PORT, () => {
  console.log(`NEXUS server running on http://localhost:5001`);
});