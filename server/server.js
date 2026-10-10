import cors from "cors";
import userRoutes from "./routes/users.js";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import messageRoutes from "./routes/messages.js";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

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

  socket.on("joinChannel", (channel) => {
    socket.join(channel);

    console.log(
      `Socket ${socket.id} joined channel: ${channel}`
    );
  });

  socket.on("sendMessage", (message) => {
    socket.to(message.channel).emit("newMessage", message);
  });

  
  socket.on("sendDirectMessage", (message) => {
    // Only relay messages that claim to come from the
    // authenticated user connected to this socket.
    if (message.sender !== socket.user.userId) {
      console.warn("Rejected direct message with mismatched sender.");
      return;
    }

    if (!message.recipient || !message._id) {
      console.warn("Rejected direct message with missing fields.");
      return;
    }

    io.to(`user:${message.recipient}`).emit(
      "newDirectMessage",
      message
    );
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(
    cors({
        origin: "http://localhost:5173",
    })
);

const PORT = 5001;

app.use(express.json());

app.use("/api/users", userRoutes);

app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "NEXUS backend is running",
  });
});

connectDB();

httpServer.listen(PORT, () => {
  console.log(`NEXUS server running on http://localhost:5001`);
});